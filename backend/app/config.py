"""Application configuration.

Settings are read from environment variables and the repo-root ``.env`` file
(the same file described by ``.env.example``). Secrets live here on the server
and are NEVER sent to the browser.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/config.py -> parents[2] is the repository root.
REPO_ROOT = Path(__file__).resolve().parents[2]

# Frontend assets that already exist in the repo (kept, not moved).
FRONTEND_HTML = REPO_ROOT / "CCaaS Migration Suite.dc.html"
FRONTEND_SUPPORT_JS = REPO_ROOT / "support.js"
DATA_DIR = REPO_ROOT / "data"
DEMO_DATA_FILE = DATA_DIR / "demo-data.json"


class Settings(BaseSettings):
    """Typed application settings loaded from the environment / .env."""

    model_config = SettingsConfigDict(
        env_file=str(REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- Server ---
    host: str = Field(default="127.0.0.1")
    port: int = Field(default=8000)
    log_level: str = Field(default="info")
    # Comma-separated list of allowed browser origins for CORS.
    cors_origins: str = Field(default="*")

    # --- OpenRouter (LLM) --- mirrors .env.example
    openrouter_api_key: str | None = None
    openrouter_model: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_max_tokens: int = 8192

    # --- GitHub deployment --- mirrors .env.example
    github_token: str | None = None
    github_repository: str | None = None
    github_branch: str = "main"
    github_target_directory: str = "terraform"
    github_api_url: str = "https://api.github.com"

    # --- Derived feature flags (never expose the underlying secrets) ---
    @property
    def llm_enabled(self) -> bool:
        return bool(self.openrouter_api_key and self.openrouter_model)

    @property
    def github_deploy_enabled(self) -> bool:
        return bool(self.github_token)

    @property
    def cors_origin_list(self) -> list[str]:
        raw = (self.cors_origins or "").strip()
        if raw in ("", "*"):
            return ["*"]
        return [o.strip() for o in raw.split(",") if o.strip()]

    @property
    def cors_allow_credentials(self) -> bool:
        """Only allow credentialed cross-origin requests when the operator has
        pinned an explicit origin allow-list. Combining credentials with a
        wildcard would make the API reflect ANY origin, so we fail safe.
        """
        return self.cors_origin_list != ["*"]


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
