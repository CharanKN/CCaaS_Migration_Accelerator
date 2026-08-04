"""Tests for the GitHub deploy service.

We mock GitHub with httpx.MockTransport and assert the Git Data API flow:
blobs -> tree -> a SINGLE commit -> ref (created when the branch is new,
updated when it already exists).
"""
from __future__ import annotations

import asyncio

import httpx
import pytest

from app.core.errors import UpstreamError
from app.services import github_deploy


def _run(coro):
    return asyncio.run(coro)


# Capture the real class before any monkeypatching so the factory below never
# recurses into its own patched replacement.
_RealAsyncClient = httpx.AsyncClient


def _client_factory(handler):
    """Return a drop-in for httpx.AsyncClient that routes through a mock."""
    def factory(**_kw):
        return _RealAsyncClient(transport=httpx.MockTransport(handler))
    return factory


@pytest.fixture
def enable_token(monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "test-token")
    monkeypatch.setenv("GITHUB_REPOSITORY", "acme/infra")
    from app.config import get_settings
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_atomic_commit_creates_missing_branch(enable_token, monkeypatch):
    calls: list[tuple[str, str]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        m, p = request.method, request.url.path
        calls.append((m, p))
        if m == "GET" and p == "/repos/acme/infra/git/ref/heads/feature-x":
            return httpx.Response(404, json={"message": "Not Found"})
        if m == "GET" and p == "/repos/acme/infra":
            return httpx.Response(200, json={"default_branch": "main"})
        if m == "GET" and p == "/repos/acme/infra/git/ref/heads/main":
            return httpx.Response(200, json={"object": {"sha": "base123"}})
        if m == "GET" and p == "/repos/acme/infra/git/commits/base123":
            return httpx.Response(200, json={"tree": {"sha": "tree123"}})
        if m == "POST" and p == "/repos/acme/infra/git/blobs":
            return httpx.Response(201, json={"sha": "blobX"})
        if m == "POST" and p == "/repos/acme/infra/git/trees":
            return httpx.Response(201, json={"sha": "newtree"})
        if m == "POST" and p == "/repos/acme/infra/git/commits":
            return httpx.Response(201, json={
                "sha": "newcommit",
                "html_url": "https://github.com/acme/infra/commit/newcommit",
            })
        if m == "POST" and p == "/repos/acme/infra/git/refs":
            return httpx.Response(201, json={})
        return httpx.Response(500, json={"unexpected": p})

    monkeypatch.setattr(github_deploy.httpx, "AsyncClient", _client_factory(handler))

    result = _run(github_deploy.commit_files(
        files={"main.tf": "resource {}", "variables.tf": "variable {}"},
        repository=None,          # falls back to configured acme/infra
        branch="feature-x",
        directory="terraform",
        commit_message="Deploy TF",
    ))

    assert result["repository"] == "acme/infra"
    assert result["branch"] == "feature-x"
    assert result["commit_url"].endswith("newcommit")
    assert result["committed_paths"] == ["terraform/main.tf", "terraform/variables.tf"]

    # Exactly one commit; branch CREATED (POST refs), not updated (no PATCH).
    assert sum(1 for m, p in calls if m == "POST" and p.endswith("/git/commits")) == 1
    assert ("POST", "/repos/acme/infra/git/refs") in calls
    assert not any(m == "PATCH" for m, _ in calls)
    # One blob per file.
    assert sum(1 for m, p in calls if m == "POST" and p.endswith("/git/blobs")) == 2


def test_atomic_commit_updates_existing_branch(enable_token, monkeypatch):
    calls: list[tuple[str, str]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        m, p = request.method, request.url.path
        calls.append((m, p))
        if m == "GET" and p == "/repos/acme/infra/git/ref/heads/main":
            return httpx.Response(200, json={"object": {"sha": "base123"}})
        if m == "GET" and p == "/repos/acme/infra/git/commits/base123":
            return httpx.Response(200, json={"tree": {"sha": "tree123"}})
        if m == "POST" and p.endswith("/git/blobs"):
            return httpx.Response(201, json={"sha": "b"})
        if m == "POST" and p.endswith("/git/trees"):
            return httpx.Response(201, json={"sha": "t"})
        if m == "POST" and p.endswith("/git/commits"):
            return httpx.Response(201, json={"sha": "c", "html_url": "https://x/commit/c"})
        if m == "PATCH" and p == "/repos/acme/infra/git/refs/heads/main":
            return httpx.Response(200, json={})
        return httpx.Response(500, json={"unexpected": p, "method": m})

    monkeypatch.setattr(github_deploy.httpx, "AsyncClient", _client_factory(handler))

    result = _run(github_deploy.commit_files(
        files={"main.tf": "x"},
        repository="acme/infra",
        branch="main",
        directory="",
        commit_message="update",
    ))

    assert result["committed_paths"] == ["main.tf"]
    # Existing branch => PATCH ref, never POST refs (no branch creation).
    assert ("PATCH", "/repos/acme/infra/git/refs/heads/main") in calls
    assert not any(p.endswith("/git/refs") and m == "POST" for m, p in calls)
    # Existing branch => no default-branch lookup.
    assert ("GET", "/repos/acme/infra") not in calls


def test_upstream_error_surfaces_cleanly(enable_token, monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        m, p = request.method, request.url.path
        if m == "GET" and p == "/repos/acme/infra/git/ref/heads/main":
            return httpx.Response(200, json={"object": {"sha": "base123"}})
        if m == "GET" and p == "/repos/acme/infra/git/commits/base123":
            return httpx.Response(200, json={"tree": {"sha": "tree123"}})
        if m == "POST" and p.endswith("/git/blobs"):
            return httpx.Response(422, json={"message": "boom"})  # provider failure
        return httpx.Response(500, json={"unexpected": p})

    monkeypatch.setattr(github_deploy.httpx, "AsyncClient", _client_factory(handler))

    with pytest.raises(UpstreamError):
        _run(github_deploy.commit_files(
            files={"main.tf": "x"},
            repository="acme/infra",
            branch="main",
            directory="",
            commit_message="m",
        ))
