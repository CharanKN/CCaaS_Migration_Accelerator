"""Connect endpoint — establish a session to a source/target platform.

Credentials are used server-side only. They are never logged or echoed back.
"""
from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..models_db.user import User
from ..services.connectors import get_connector
from .auth import require_full_access

router = APIRouter(prefix="/connect", tags=["connect"])


class ConnectRequest(BaseModel):
    platform: str = Field(..., description="Platform slug, e.g. 'genesys-cloud'")
    # Free-form credential bag; contents depend on the platform. Server-side only.
    credentials: dict = Field(default_factory=dict)


@router.post("")
async def connect(req: ConnectRequest, _user: User = Depends(require_full_access)) -> dict:
    connector = get_connector(req.platform)
    result = await connector.connect(req.credentials)
    return asdict(result)
