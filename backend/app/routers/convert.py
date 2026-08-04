"""Convert endpoint — LLM-generated migration artifact.

The browser sends a scenario id; the server builds a source summary and calls
OpenRouter with the server-held API key, returning only the generated artifact.
"""
from __future__ import annotations

import json

from fastapi import APIRouter

from ..config import get_settings
from ..models import ConvertRequest, ConvertResponse
from ..services.data_store import data_store
from ..services.openrouter import generate_artifact

router = APIRouter(prefix="/convert", tags=["convert"])


@router.post("", response_model=ConvertResponse)
async def convert(req: ConvertRequest) -> ConvertResponse:
    settings = get_settings()
    scenario = data_store.get_scenario(req.scenario_id)  # 404 if unknown
    target = req.target or scenario.target or "Genesys Cloud"

    # Build a compact, non-secret summary of the source config for the model.
    source_summary = json.dumps(
        {
            "source": scenario.source,
            "target": target,
            "inventory": [i.model_dump() for i in scenario.inventory],
            "mappings": [m.model_dump() for m in scenario.mappings],
        },
        indent=2,
    )

    artifact = await generate_artifact(
        source_summary=source_summary,
        target=target,
        instructions=req.instructions,
    )
    return ConvertResponse(
        scenario_id=req.scenario_id,
        target=target,
        model=settings.openrouter_model or "",
        artifact=artifact,
    )
