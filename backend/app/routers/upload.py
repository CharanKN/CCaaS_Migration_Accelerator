"""Upload endpoint — parse an uploaded source-platform export file.

Unlike /connect + /discover (which talk to a live platform API or fall back
to demo data), this reads bytes the browser sent directly. Only Avaya Aura
has a real parser today (see services/parsers/avaya.py); other platforms
report back "not yet supported" the same way an unrecognized live platform
falls back to the demo connector, so the UI can show an honest per-file
status instead of pretending every format parses.
"""
from __future__ import annotations

import json

from fastapi import APIRouter, Depends, File, Form, UploadFile

from ..models import UploadResult
from ..models_db.user import User
from ..services.parsers import parse_avaya_export
from ..services.parsers.avaya import AvayaParseError
from .auth import get_current_user

router = APIRouter(prefix="/upload", tags=["upload"])

_AVAYA_PLATFORMS = {"avaya-aura", "avaya-cms", "avaya"}


@router.post("", response_model=UploadResult)
async def upload_source_file(
    file: UploadFile = File(...),
    platform: str = Form(...),
    _user: User = Depends(get_current_user),
) -> UploadResult:
    raw = await file.read()
    size = len(raw)
    slug = platform.strip().lower()

    if slug not in _AVAYA_PLATFORMS:
        return UploadResult(
            filename=file.filename or "upload",
            size=size,
            platform=platform,
            parsed=False,
            message=f"No parser available yet for '{platform}' — flag for SME review.",
        )

    try:
        payload = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return UploadResult(
            filename=file.filename or "upload",
            size=size,
            platform=platform,
            parsed=False,
            message="Unsupported format — expected the normalized JSON export bundle. Flag for SME review.",
        )

    try:
        result = parse_avaya_export(payload)
    except AvayaParseError as exc:
        return UploadResult(
            filename=file.filename or "upload",
            size=size,
            platform=platform,
            parsed=False,
            message=exc.message,
        )

    return UploadResult(
        filename=file.filename or "upload",
        size=size,
        platform=platform,
        parsed=True,
        message=f"Parsed {len(result['inventory'])} objects.",
        discovered=result["discovered"],
        inventory=result["inventory"],
        gap=result["gap"],
    )
