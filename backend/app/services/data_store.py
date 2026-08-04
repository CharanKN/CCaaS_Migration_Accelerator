"""Data access layer.

For now this reads the existing ``data/demo-data.json`` so the backend returns
exactly the shapes the frontend already expects. This is the single seam we
swap later to pull from real CCaaS connectors / a database WITHOUT changing the
API contract or the frontend.
"""
from __future__ import annotations

import json
from threading import Lock

from ..config import DEMO_DATA_FILE
from ..core.errors import NotFoundError
from ..core.logging import get_logger
from ..models import Scenario, ScenarioSummary

log = get_logger("data_store")


class DataStore:
    """Loads and serves scenario data. Caches the parsed file in memory."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._scenarios: dict[str, dict] | None = None

    def _load(self) -> dict[str, dict]:
        if self._scenarios is None:
            with self._lock:
                if self._scenarios is None:
                    if not DEMO_DATA_FILE.exists():
                        log.warning("Demo data file missing: %s", DEMO_DATA_FILE)
                        self._scenarios = {}
                    else:
                        raw = json.loads(DEMO_DATA_FILE.read_text(encoding="utf-8"))
                        self._scenarios = raw.get("scenarios", {})
                        log.info("Loaded %d scenarios from demo data", len(self._scenarios))
        return self._scenarios

    def reload(self) -> None:
        """Drop the cache (useful in development)."""
        with self._lock:
            self._scenarios = None

    # --- queries ---
    def list_scenarios(self) -> list[ScenarioSummary]:
        data = self._load()
        return [
            ScenarioSummary(
                id=sid,
                name=s.get("name", sid),
                client=s.get("client"),
                source=s.get("source"),
                target=s.get("target"),
                stage=s.get("stage"),
                progress=s.get("progress"),
            )
            for sid, s in data.items()
        ]

    def get_scenario(self, scenario_id: str) -> Scenario:
        data = self._load()
        raw = data.get(scenario_id)
        if raw is None:
            raise NotFoundError(f"Scenario '{scenario_id}' not found")
        return Scenario.model_validate(raw)

    def get_raw_scenario(self, scenario_id: str) -> dict:
        data = self._load()
        raw = data.get(scenario_id)
        if raw is None:
            raise NotFoundError(f"Scenario '{scenario_id}' not found")
        return raw

    def get_dataset(self) -> dict:
        """Return the full dataset as ``{"scenarios": {id: scenario}}``.

        This is the exact shape the current single-page frontend hydrates in one
        request. Individual /scenarios endpoints remain for granular access.
        """
        return {"scenarios": self._load()}


# Module-level singleton.
data_store = DataStore()
