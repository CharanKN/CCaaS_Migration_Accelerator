"""Serve the built frontend SPA from the backend process.

``frontend/`` is a separate Vite + React + TypeScript app. ``npm run build``
there emits ``frontend/dist/``, which this module serves so the built app and
the ``/api`` backend still share one origin — same as the static-HTML setup
this replaces (see git history for the old ``.dc.html``/``support.js`` path).
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import REPO_ROOT
from .core.logging import get_logger

log = get_logger("static")

FRONTEND_DIST = REPO_ROOT / "frontend" / "dist"
INDEX_HTML = FRONTEND_DIST / "index.html"


def mount_frontend(app: FastAPI) -> None:
    if not FRONTEND_DIST.is_dir():
        log.warning(
            "Frontend build not found at %s — run `cd frontend && npm install && npm run build` first.",
            FRONTEND_DIST,
        )
        return

    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.is_dir():
        # Vite's hashed JS/CSS bundle output — safe to mount directly since
        # these filenames are content-hashed and never collide with app routes.
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="frontend-assets")

    # Anything else: serve the matching file out of dist/ (e.g. the bundled
    # public/data/demo-data.json fallback, favicon) if it exists, otherwise
    # fall back to index.html so React Router's client-side routes
    # (e.g. /overview) survive a hard refresh or direct link.
    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str) -> FileResponse:
        candidate = (FRONTEND_DIST / full_path).resolve()
        if candidate.is_file() and FRONTEND_DIST.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(INDEX_HTML)

    if not INDEX_HTML.exists():
        log.warning("Frontend build missing index.html: %s", INDEX_HTML)
