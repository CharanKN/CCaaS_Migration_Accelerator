"""API routers, aggregated under a single /api router."""
from __future__ import annotations

from fastapi import APIRouter

from . import auth, connect, convert, dataset, deploy, discover, health, scenarios

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(dataset.router)
api_router.include_router(scenarios.router)
api_router.include_router(connect.router)
api_router.include_router(discover.router)
api_router.include_router(convert.router)
api_router.include_router(deploy.router)
