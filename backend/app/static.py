"""Serve the existing static frontend from the backend process.

The frontend files are kept in place at the repo root:
  - ``CCaaS Migration Suite.dc.html``  (served at ``/``)
  - ``support.js``                      (served at ``/support.js``)
  - ``data/``                           (served at ``/data`` — includes demo-data.json)

Serving app + API from one origin means the frontend's existing
``fetch('./data/demo-data.json')`` keeps working with no change, and no CORS
is required in the common case.
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import DATA_DIR, FRONTEND_HTML, FRONTEND_SUPPORT_JS
from .core.logging import get_logger

log = get_logger("static")


def mount_frontend(app: FastAPI) -> None:
    if DATA_DIR.is_dir():
        # Keeps ./data/demo-data.json reachable exactly as the frontend expects.
        app.mount("/data", StaticFiles(directory=str(DATA_DIR)), name="data")
    else:
        log.warning("Data directory not found: %s", DATA_DIR)

    @app.get("/support.js", include_in_schema=False)
    def support_js() -> FileResponse:
        return FileResponse(FRONTEND_SUPPORT_JS, media_type="application/javascript")

    @app.get("/", include_in_schema=False)
    def index() -> FileResponse:
        return FileResponse(FRONTEND_HTML, media_type="text/html")

    if not FRONTEND_HTML.exists():
        log.warning("Frontend HTML not found: %s", FRONTEND_HTML)
