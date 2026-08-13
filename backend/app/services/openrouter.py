"""OpenRouter (LLM) proxy service.

The API key stays server-side. The browser calls our /api/convert endpoint;
this module makes the authenticated call to OpenRouter and returns only the
generated artifact.
"""
from __future__ import annotations

import re

import httpx

from ..config import get_settings
from ..core.errors import FeatureDisabledError, UpstreamError
from ..core.logging import get_logger

log = get_logger("openrouter")

_FILE_MARKER = "===FILE:"

_SYSTEM_PROMPT = (
    "You are a CCaaS migration assistant. Given a source contact-center "
    "configuration, produce the requested target-native artifact (e.g. "
    "Terraform for Genesys Cloud CX-as-Code, or an Amazon Connect flow JSON). "
    "Split the artifact into one or more files exactly as a reviewer would "
    "expect to see them in a repository (e.g. main.tf, variables.tf, "
    "outputs.tf for Terraform; flow.json for an Amazon Connect flow). "
    "Introduce each file with its own line containing exactly "
    f'{_FILE_MARKER} <filename> ===, then the raw file contents, then the '
    "next file marker. Each <filename> must be a bare filename with no "
    "directory component — the caller places every file into its own "
    "target folder, so a name like 'terraform/main.tf' or './main.tf' would "
    "create an unwanted nested folder; use 'main.tf' instead. Do not wrap "
    "file contents in markdown code fences. Return only the file markers "
    "and their contents, no commentary before, between, or after them."
)

_FILE_MARKER_RE = re.compile(
    rf"^{re.escape(_FILE_MARKER)}\s*(.+?)\s*===\s*$", re.MULTILINE
)
_CODE_FENCE_RE = re.compile(r"^```[^\n]*\n|\n```\s*$")


def _strip_code_fence(content: str) -> str:
    """Defensively strip a stray markdown code fence around one file's body.

    Models occasionally wrap content in ``` fences despite being told not
    to; stripping them here keeps the parser robust without relying on the
    model to follow that instruction perfectly.
    """
    return _CODE_FENCE_RE.sub("", content.strip())


def _split_files(raw: str) -> dict[str, str]:
    """Split a raw LLM response into ``{filename: content}`` by file marker.

    Falls back to a single ``main.tf`` when the model ignored the marker
    format, so older prompts/responses still round-trip.
    """
    matches = list(_FILE_MARKER_RE.finditer(raw))
    if not matches:
        return {"main.tf": _strip_code_fence(raw)}

    files: dict[str, str] = {}
    for i, match in enumerate(matches):
        filename = match.group(1).strip()
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(raw)
        content = _strip_code_fence(raw[start:end])
        if filename and content:
            files[filename] = content
    return files or {"main.tf": _strip_code_fence(raw)}


async def generate_files(
    *,
    source_summary: str,
    target: str,
    instructions: str | None = None,
) -> dict[str, str]:
    """Call OpenRouter to generate a migration artifact as named files.

    Raises FeatureDisabledError if no key/model is configured, UpstreamError on
    provider failure.
    """
    settings = get_settings()
    if not settings.llm_enabled:
        raise FeatureDisabledError(
            "LLM conversion is not configured. Set OPENROUTER_API_KEY and "
            "OPENROUTER_MODEL in the server .env."
        )

    user_prompt = (
        f"Target platform: {target}\n\n"
        f"Source configuration:\n{source_summary}\n"
    )
    if instructions:
        user_prompt += f"\nAdditional instructions:\n{instructions}\n"

    payload = {
        "model": settings.openrouter_model,
        "max_tokens": settings.openrouter_max_tokens,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    }
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        # OpenRouter attribution headers (optional but recommended).
        "X-Title": "CCaaS Migration Suite",
    }
    url = f"{settings.openrouter_base_url.rstrip('/')}/chat/completions"

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
    except httpx.HTTPError as exc:
        log.error("OpenRouter request failed: %s", exc)
        raise UpstreamError("Could not reach the LLM provider") from exc

    if resp.status_code >= 400:
        # Log detail server-side; do not leak provider body to the client.
        log.error("OpenRouter returned %s: %s", resp.status_code, resp.text[:500])
        raise UpstreamError("The LLM provider returned an error")

    data = resp.json()
    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        log.error("Unexpected OpenRouter response shape: %s", str(data)[:500])
        raise UpstreamError("Malformed response from the LLM provider") from exc

    if not content:
        log.error("OpenRouter returned empty content: %s", str(data)[:500])
        raise UpstreamError("The LLM provider returned an empty response")

    return _split_files(content)
