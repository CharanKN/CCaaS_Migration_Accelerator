"""Demo-backed connector.

Returns data from the local demo dataset so Connect/Discover work end-to-end
before any real platform API is wired in. This is the swap point for live
connectors (see genesys.py / amazon_connect.py stubs).
"""
from __future__ import annotations

from ..data_store import data_store
from .base import BaseConnector, ConnectionResult


class DemoConnector(BaseConnector):
    def __init__(self, platform: str = "demo") -> None:
        self.platform = platform

    async def connect(self, credentials: dict) -> ConnectionResult:
        # No real auth in demo mode; report success with echoed non-secret meta.
        meta = {k: v for k, v in (credentials or {}).items()
                if k.lower() in ("region", "org", "org_id", "base_url", "instance")}
        return ConnectionResult(
            platform=self.platform,
            connected=True,
            detail="Connected in demo mode (no live platform call).",
            metadata=meta,
        )

    async def discover(self, scenario_id: str | None = None) -> dict:
        sid = scenario_id or "avaya-genesys"
        raw = data_store.get_raw_scenario(sid)
        return {
            "scenario_id": sid,
            "discovered": raw.get("discovered", []),
            "inventory": raw.get("inventory", []),
            "gap": raw.get("gap", {}),
        }
