"""OpenRouter (LLM) proxy service.

The API key stays server-side. The browser calls our /api/convert endpoint;
this module makes the authenticated call to OpenRouter and returns only the
generated artifact.
"""
from __future__ import annotations

import httpx

from ..config import get_settings
from ..core.errors import FeatureDisabledError, UpstreamError
from ..core.logging import get_logger

log = get_logger("openrouter")

_SYSTEM_PROMPT = (
    "You are a CCaaS migration assistant. Given a source contact-center "
    "configuration, produce the requested target-native artifact (e.g. "
    "Terraform for Genesys Cloud CX-as-Code, or an Amazon Connect flow JSON). "
    "Return only the artifact, no commentary."
)


async def generate_artifact(
    *,
    source_summary: str,
    target: str,
    instructions: str | None = None,
) -> str:
    """Call OpenRouter to generate a migration artifact.

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
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        log.error("Unexpected OpenRouter response shape: %s", str(data)[:500])
        raise UpstreamError("Malformed response from the LLM provider") from exc
