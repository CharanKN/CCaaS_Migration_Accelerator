"""Genesys Cloud CX connector — STUB.

TODO (real integration):
  - OAuth 2.0 Client Credentials grant against region endpoint
    (mypurecloud.com / .de / .jp / .au ...).
  - Discover via Platform API: /api/v2/flows, queues, skills, wrap-up codes,
    data actions, schedules, edge/BYOC trunks.
  - Respect rate limits (~300 req/min).
Until implemented, this falls back to demo data so the pipeline stays runnable.
"""
from __future__ import annotations

from .base import BaseConnector, ConnectionResult, register
from .demo import DemoConnector


@register
class GenesysCloudConnector(BaseConnector):
    platform = "genesys-cloud"

    def __init__(self) -> None:
        self._demo = DemoConnector(self.platform)

    async def connect(self, credentials: dict) -> ConnectionResult:
        # TODO: exchange client_id/client_secret for an access token.
        return await self._demo.connect(credentials)

    async def discover(self, scenario_id: str | None = None) -> dict:
        # TODO: call Genesys Platform API instead of demo data.
        return await self._demo.discover(scenario_id)
