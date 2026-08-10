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

# Demo dataset backing DataStore (see services/data_store.py). The frontend's
# own bundled copy under frontend/public/data/ is a separate offline fallback.
DEMO_DATA_FILE = REPO_ROOT / "data" / "demo-data.json"


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

    # --- Database ---
    database_url: str = f"sqlite:///{REPO_ROOT / 'backend' / 'ccaas.db'}"

    # --- JWT auth ---
    jwt_secret_key: str = "dev-only-insecure-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # --- Genesys Cloud connector ---
    genesys_client_id: str | None = None
    genesys_client_secret: str | None = None
    genesys_region: str = "mypurecloud.com"

    # --- Amazon Connect connector --- (falls back to boto3's default credential
    # chain — instance role, shared config, env vars — when unset here)
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_region: str = "us-east-1"

    # --- Derived feature flags (never expose the underlying secrets) ---
    @property
    def llm_enabled(self) -> bool:
        return bool(self.openrouter_api_key and self.openrouter_model)

    @property
    def github_deploy_enabled(self) -> bool:
        return bool(self.github_token)

    @property
    def genesys_configured(self) -> bool:
        return bool(self.genesys_client_id and self.genesys_client_secret)

    @property
    def aws_connect_configured(self) -> bool:
        # boto3's default credential chain can supply creds even when these
        # settings are unset, so this only reflects explicit server config.
        return bool(self.aws_access_key_id and self.aws_secret_access_key)

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
