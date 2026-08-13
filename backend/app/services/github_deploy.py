"""GitHub deployment service.

Commits generated Terraform (or other artifacts) to a target repo using the
server-side GITHUB_TOKEN. The token never reaches the browser.

Implementation uses the **Git Data API** (blobs -> tree -> commit -> ref) so
that *all* files land in a SINGLE atomic commit, and the target branch is
created from the repo's default branch if it does not yet exist. This matches
the behaviour documented in .env.example.
"""
from __future__ import annotations

import httpx

from ..config import get_settings
from ..core.errors import AppError, FeatureDisabledError, UpstreamError
from ..core.logging import get_logger

log = get_logger("github_deploy")

_BLOB_MODE = "100644"  # normal file


class _GitHub:
    """Small typed wrapper around the GitHub REST calls we need."""

    def __init__(self, client: httpx.AsyncClient, base: str, repo: str, headers: dict):
        self._c = client
        self._base = base
        self._repo = repo
        self._h = headers

    async def _request(self, method: str, path: str, **kw) -> httpx.Response:
        url = f"{self._base}/repos/{self._repo}{path}"
        try:
            resp = await self._c.request(method, url, headers=self._h, **kw)
        except httpx.HTTPError as exc:
            log.error("GitHub request %s %s failed: %s", method, path, exc)
            raise UpstreamError("Could not reach GitHub") from exc
        return resp

    def _fail(self, resp: httpx.Response, action: str) -> UpstreamError:
        log.error("GitHub %s failed: %s %s", action, resp.status_code, resp.text[:400])
        return UpstreamError(f"GitHub rejected {action}")

    async def default_branch(self) -> str:
        resp = await self._request("GET", "")
        if resp.status_code >= 400:
            raise self._fail(resp, "repository lookup")
        return resp.json().get("default_branch", "main")

    async def branch_head_sha(self, branch: str) -> str | None:
        """Commit SHA at the tip of ``branch``, or None if the branch is absent."""
        resp = await self._request("GET", f"/git/ref/heads/{branch}")
        if resp.status_code == 404:
            return None
        if resp.status_code >= 400:
            raise self._fail(resp, f"ref lookup for '{branch}'")
        return resp.json()["object"]["sha"]

    async def commit_tree_sha(self, commit_sha: str) -> str:
        resp = await self._request("GET", f"/git/commits/{commit_sha}")
        if resp.status_code >= 400:
            raise self._fail(resp, "base commit lookup")
        return resp.json()["tree"]["sha"]

    async def create_blob(self, content: str) -> str:
        resp = await self._request(
            "POST", "/git/blobs", json={"content": content, "encoding": "utf-8"}
        )
        if resp.status_code >= 400:
            raise self._fail(resp, "blob creation")
        return resp.json()["sha"]

    async def create_tree(self, base_tree: str, entries: list[dict]) -> str:
        resp = await self._request(
            "POST", "/git/trees", json={"base_tree": base_tree, "tree": entries}
        )
        if resp.status_code >= 400:
            raise self._fail(resp, "tree creation")
        return resp.json()["sha"]

    async def create_commit(self, message: str, tree: str, parent: str) -> dict:
        resp = await self._request(
            "POST", "/git/commits",
            json={"message": message, "tree": tree, "parents": [parent]},
        )
        if resp.status_code >= 400:
            raise self._fail(resp, "commit creation")
        return resp.json()

    async def create_ref(self, branch: str, sha: str) -> None:
        resp = await self._request(
            "POST", "/git/refs", json={"ref": f"refs/heads/{branch}", "sha": sha}
        )
        if resp.status_code >= 400:
            raise self._fail(resp, f"branch creation for '{branch}'")

    async def update_ref(self, branch: str, sha: str) -> None:
        resp = await self._request(
            "PATCH", f"/git/refs/heads/{branch}", json={"sha": sha, "force": False}
        )
        if resp.status_code >= 400:
            raise self._fail(resp, f"branch update for '{branch}'")


def _full_path(directory: str, rel_path: str) -> str:
    rel = rel_path.lstrip("/")
    if not directory:
        return rel

    clean_dir = directory.strip("/")
    # A generated filename that already starts with the target directory
    # (e.g. an LLM naming its own file "terraform/main.tf" while the server
    # is configured to place files under "terraform/") would otherwise
    # double up into "terraform/terraform/main.tf". Strip that one redundant
    # leading segment rather than prepending on top of it.
    prefix = f"{clean_dir}/"
    if rel.lower().startswith(prefix.lower()):
        rel = rel[len(prefix):]

    return f"{clean_dir}/{rel}"


async def commit_files(
    *,
    files: dict[str, str],
    repository: str | None,
    branch: str | None,
    directory: str | None,
    commit_message: str,
) -> dict:
    """Atomically commit a set of files to the target repo.

    Raises FeatureDisabledError if no token, AppError on bad input, UpstreamError
    on provider failure.
    """
    settings = get_settings()
    if not settings.github_deploy_enabled:
        raise FeatureDisabledError(
            "GitHub deploy is not configured. Set GITHUB_TOKEN in the server .env."
        )

    repo = repository or settings.github_repository
    if not repo:
        raise AppError("No target repository provided or configured", status_code=400)
    branch = branch or settings.github_branch
    directory = directory if directory is not None else settings.github_target_directory
    directory = directory or ""
    if not files:
        raise AppError("No files provided to deploy", status_code=400)

    base = settings.github_api_url.rstrip("/")
    headers = {
        "Authorization": f"Bearer {settings.github_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        gh = _GitHub(client, base, repo, headers)

        # 1. Determine the base commit: the target branch tip, or the default
        #    branch tip when the target branch does not exist yet.
        branch_exists = True
        base_sha = await gh.branch_head_sha(branch)
        if base_sha is None:
            branch_exists = False
            default = await gh.default_branch()
            base_sha = await gh.branch_head_sha(default)
            if base_sha is None:
                raise AppError(
                    "Target repository has no commits to branch from", status_code=400
                )

        base_tree = await gh.commit_tree_sha(base_sha)

        # 2. Blobs -> tree entries.
        entries: list[dict] = []
        committed_paths: list[str] = []
        for rel_path, content in files.items():
            path = _full_path(directory, rel_path)
            blob_sha = await gh.create_blob(content)
            entries.append({"path": path, "mode": _BLOB_MODE, "type": "blob", "sha": blob_sha})
            committed_paths.append(path)

        new_tree = await gh.create_tree(base_tree, entries)

        # 3. Single commit containing every file.
        commit = await gh.create_commit(commit_message, new_tree, base_sha)
        new_sha = commit["sha"]

        # 4. Point the branch at the new commit (create it if it was missing).
        if branch_exists:
            await gh.update_ref(branch, new_sha)
        else:
            await gh.create_ref(branch, new_sha)

    log.info("Deployed %d file(s) to %s@%s in one commit", len(committed_paths), repo, branch)
    return {
        "repository": repo,
        "branch": branch,
        "commit_url": commit.get("html_url"),
        "committed_paths": committed_paths,
    }
