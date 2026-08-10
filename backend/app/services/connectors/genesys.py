"""Genesys Cloud CX connector — real OAuth 2.0 Client Credentials + Platform
API integration.

Falls back to demo data only when no client id/secret is available anywhere
(neither per-request credentials nor server settings), so the pipeline stays
runnable without live credentials. When credentials ARE configured, this makes
real calls and raises ``UpstreamError`` on genuine failures rather than
silently degrading.
"""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

import httpx

from ...config import get_settings
from ...core.errors import UpstreamError
from .base import BaseConnector, ConnectionResult, register
from .demo import DemoConnector

# Platform API resources pulled during discovery, normalized into one flat
# inventory. Paginated at pageSize=100 per call — good enough for a single
# discovery pass; a production version would page through `pageCount`.
_DISCOVERY_ENDPOINTS = {
    "flows": "/api/v2/flows",
    "queues": "/api/v2/routing/queues",
    "skills": "/api/v2/routing/skills",
    "wrapupCodes": "/api/v2/routing/wrapupcodes",
    "dataTables": "/api/v2/flows/datatables",
    "schedules": "/api/v2/architect/schedules",
    "trunks": "/api/v2/telephony/providers/edges/trunks",
}

# Cheap stand-in for Genesys Cloud's ~300 req/min org-wide rate limit: caps
# how many of the discovery calls above run concurrently.
_RATE_LIMIT = asyncio.Semaphore(5)


@register
class GenesysCloudConnector(BaseConnector):
    platform = "genesys-cloud"

    def __init__(self, http_client: httpx.AsyncClient | None = None) -> None:
        self._demo = DemoConnector(self.platform)
        self._http_client = http_client  # injectable so tests can pass a MockTransport client

    @asynccontextmanager
    async def _client(self):
        if self._http_client is not None:
            yield self._http_client
        else:
            async with httpx.AsyncClient(timeout=30.0) as client:
                yield client

    def _resolve(self, credentials: dict) -> tuple[str | None, str | None, str]:
        settings = get_settings()
        client_id = credentials.get("client_id") or settings.genesys_client_id
        client_secret = credentials.get("client_secret") or settings.genesys_client_secret
        region = credentials.get("region") or settings.genesys_region
        return client_id, client_secret, region

    async def _get_token(self, client: httpx.AsyncClient, client_id: str, client_secret: str, region: str) -> str:
        resp = await client.post(
            f"https://login.{region}/oauth/token",
            data={"grant_type": "client_credentials"},
            auth=(client_id, client_secret),
        )
        if resp.status_code != 200:
            raise UpstreamError("Genesys Cloud authentication failed")
        return resp.json()["access_token"]

    async def connect(self, credentials: dict) -> ConnectionResult:
        client_id, client_secret, region = self._resolve(credentials)
        if not client_id or not client_secret:
            return await self._demo.connect(credentials)

        async with self._client() as client:
            await self._get_token(client, client_id, client_secret, region)

        return ConnectionResult(
            platform=self.platform,
            connected=True,
            detail=f"Connected to Genesys Cloud ({region}).",
            metadata={"region": region},
        )

    async def _fetch_one(self, client: httpx.AsyncClient, token: str, region: str, path: str) -> list[dict]:
        async with _RATE_LIMIT:
            resp = await client.get(
                f"https://api.{region}{path}",
                headers={"Authorization": f"Bearer {token}"},
                params={"pageSize": 100},
            )
        if resp.status_code != 200:
            raise UpstreamError(f"Genesys Cloud request failed: {path}")
        body = resp.json()
        return body.get("entities", body if isinstance(body, list) else [])

    async def discover(self, scenario_id: str | None = None) -> dict:
        client_id, client_secret, region = self._resolve({})
        if not client_id or not client_secret:
            return await self._demo.discover(scenario_id)

        async with self._client() as client:
            token = await self._get_token(client, client_id, client_secret, region)
            results = await asyncio.gather(
                *(self._fetch_one(client, token, region, path) for path in _DISCOVERY_ENDPOINTS.values())
            )
        by_kind = dict(zip(_DISCOVERY_ENDPOINTS.keys(), results))

        inventory = [
            {"id": item.get("id", ""), "name": item.get("name", ""), "type": kind, "status": "discovered"}
            for kind, items in by_kind.items()
            for item in items
        ]
        discovered = [
            {"label": kind, "count": len(items), "status": "discovered"} for kind, items in by_kind.items()
        ]
        total = len(inventory)
        return {
            "scenario_id": scenario_id or "genesys-cloud-live",
            "discovered": discovered,
            "inventory": inventory,
            "gap": {"auto": total, "review": 0, "unsupported": 0, "complexity": None},
        }
