"""Aggregate dataset endpoint.

Convenience endpoint that returns every scenario in one payload, shaped exactly
like the legacy ``data/demo-data.json`` (``{"scenarios": {...}}``). The SPA
hydrates all scenarios at once, so a single request avoids an N+1 fan-out over
``/scenarios/{id}``. The granular /scenarios endpoints remain the REST surface.
"""
from __future__ import annotations

from fastapi import APIRouter

from ..services.data_store import data_store

router = APIRouter(tags=["dataset"])


@router.get("/dataset")
def get_dataset() -> dict:
    return data_store.get_dataset()
