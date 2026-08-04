"""Health and capability endpoints."""
from __future__ import annotations

from fastapi import APIRouter

from .. import __version__
from ..config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    """Liveness probe."""
    return {"status": "ok", "version": __version__}


@router.get("/capabilities")
def capabilities() -> dict:
    """Report which optional, secret-backed features are configured.

    The browser uses this to enable/disable buttons WITHOUT ever seeing the
    underlying secrets.
    """
    s = get_settings()
    return {
        "llm": s.llm_enabled,
        "githubDeploy": s.github_deploy_enabled,
        "model": s.openrouter_model if s.llm_enabled else None,
    }
