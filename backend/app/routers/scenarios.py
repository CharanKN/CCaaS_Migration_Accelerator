"""Scenario data endpoints.

These serve the same shapes the frontend already consumes from demo-data.json,
now behind a stable API contract so the underlying source can change later.
"""
from __future__ import annotations

from fastapi import APIRouter

from ..models import Scenario, ScenarioSummary
from ..services.data_store import data_store

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


@router.get("", response_model=list[ScenarioSummary])
def list_scenarios() -> list[ScenarioSummary]:
    return data_store.list_scenarios()


@router.get("/{scenario_id}", response_model=Scenario)
def get_scenario(scenario_id: str) -> Scenario:
    return data_store.get_scenario(scenario_id)


# --- sub-resources (convenience endpoints for individual pipeline views) ---
@router.get("/{scenario_id}/discovery")
def get_discovery(scenario_id: str) -> dict:
    raw = data_store.get_raw_scenario(scenario_id)
    return {"discovered": raw.get("discovered", []), "gap": raw.get("gap", {})}


@router.get("/{scenario_id}/inventory")
def get_inventory(scenario_id: str) -> list:
    return data_store.get_raw_scenario(scenario_id).get("inventory", [])


@router.get("/{scenario_id}/mappings")
def get_mappings(scenario_id: str) -> list:
    return data_store.get_raw_scenario(scenario_id).get("mappings", [])


@router.get("/{scenario_id}/deploy-logs")
def get_deploy_logs(scenario_id: str) -> list:
    return data_store.get_raw_scenario(scenario_id).get("deployLogs", [])


@router.get("/{scenario_id}/tests")
def get_tests(scenario_id: str) -> list:
    return data_store.get_raw_scenario(scenario_id).get("tests", [])


@router.get("/{scenario_id}/architecture")
def get_architecture(scenario_id: str) -> dict:
    return data_store.get_raw_scenario(scenario_id).get("architecture", {})
