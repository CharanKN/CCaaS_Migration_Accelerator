"""FastAPI application entrypoint.

Single process serves BOTH the existing static frontend and the /api backend,
so the app runs from one origin (no CORS needed in the common case) and no
secret ever reaches the browser.

Run:
    cd backend
    uvicorn app.main:app --reload
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .config import get_settings
from .core.errors import register_error_handlers
from .core.logging import configure_logging, get_logger
from .database import init_db
from .routers import api_router
from .static import mount_frontend

settings = get_settings()
configure_logging(settings.log_level)
log = get_logger("main")


# Idempotent (CREATE TABLE IF NOT EXISTS semantics) — run at import time so
# tables exist even under test clients that don't drive ASGI lifespan events.
init_db()


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("CCaaS Migration Suite backend v%s starting", __version__)
    log.info("LLM enabled: %s | GitHub deploy enabled: %s",
             settings.llm_enabled, settings.github_deploy_enabled)
    yield
    log.info("Backend shutting down")


app = FastAPI(
    title="CCaaS Migration Suite API",
    version=__version__,
    lifespan=lifespan,
)

# NOTE: credentials are only enabled when an explicit origin allow-list is set.
# With the default wildcard we keep credentials OFF so the API never reflects an
# arbitrary origin back with Access-Control-Allow-Credentials: true.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_error_handlers(app)

# API first, then the static frontend at the root.
app.include_router(api_router)
mount_frontend(app)
