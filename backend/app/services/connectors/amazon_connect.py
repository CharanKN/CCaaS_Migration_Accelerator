"""Amazon Connect connector — STUB.

TODO (real integration):
  - Authenticate with AWS credentials / assumed role (boto3).
  - Discover instances, contact flows, queues, routing profiles, prompts,
    Lambda integrations, hours of operation.
  - Export contact flows as JSON for conversion.
Until implemented, this falls back to demo data so the pipeline stays runnable.
"""
from __future__ import annotations

from .base import BaseConnector, ConnectionResult, register
from .demo import DemoConnector


@register
class AmazonConnectConnector(BaseConnector):
    platform = "amazon-connect"

    def __init__(self) -> None:
        self._demo = DemoConnector(self.platform)

    async def connect(self, credentials: dict) -> ConnectionResult:
        # TODO: validate AWS credentials / instance ARN.
        return await self._demo.connect(credentials)

    async def discover(self, scenario_id: str | None = None) -> dict:
        # TODO: call the Amazon Connect API instead of demo data.
        return await self._demo.discover(scenario_id)
