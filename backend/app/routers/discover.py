"""Discover endpoint — enumerate objects on a connected platform."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from ..models_db.user import User
from ..services.connectors import get_connector
from .auth import get_current_user

router = APIRouter(prefix="/discover", tags=["discover"])


@router.post("")
async def discover(
    platform: str = Query(..., description="Platform slug, e.g. 'genesys-cloud'"),
    scenario_id: str | None = Query(default=None, description="Optional demo scenario to back the result"),
    _user: User = Depends(get_current_user),
) -> dict:
    connector = get_connector(platform)
    return await connector.discover(scenario_id)
