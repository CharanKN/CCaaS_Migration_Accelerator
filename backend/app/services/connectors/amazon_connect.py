"""Amazon Connect connector — real boto3-backed integration.

Falls back to demo data only when no AWS credentials are available at all
(boto3 raises ``NoCredentialsError`` from its default credential chain), so
the pipeline stays runnable without live credentials. When credentials ARE
available but a call genuinely fails (bad instance, permissions, etc.) this
raises ``UpstreamError`` rather than silently degrading.
"""
from __future__ import annotations

import asyncio

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

from ...config import get_settings
from ...core.errors import UpstreamError
from .base import BaseConnector, ConnectionResult, register
from .demo import DemoConnector

# Resource -> (boto3 method name, response list key), normalized into one
# flat inventory alongside the flows/queues/etc. Genesys returns.
_DISCOVERY_CALLS = {
    "contactFlows": ("list_contact_flows", "ContactFlowSummaryList"),
    "queues": ("list_queues", "QueueSummaryList"),
    "routingProfiles": ("list_routing_profiles", "RoutingProfileSummaryList"),
    "prompts": ("list_prompts", "PromptSummaryList"),
    "lambdaFunctions": ("list_lambda_functions", "LambdaFunctionSummaryList"),
    "hoursOfOperations": ("list_hours_of_operations", "HoursOfOperationSummaryList"),
}


@register
class AmazonConnectConnector(BaseConnector):
    platform = "amazon-connect"

    def __init__(self, boto_client=None) -> None:
        self._demo = DemoConnector(self.platform)
        self._boto_client = boto_client  # injectable so tests can pass a stub/mock

    def _client(self, credentials: dict):
        if self._boto_client is not None:
            return self._boto_client
        settings = get_settings()
        access_key = credentials.get("aws_access_key_id") or settings.aws_access_key_id
        secret_key = credentials.get("aws_secret_access_key") or settings.aws_secret_access_key
        region = credentials.get("region") or settings.aws_region
        kwargs: dict = {"region_name": region}
        if access_key and secret_key:
            kwargs["aws_access_key_id"] = access_key
            kwargs["aws_secret_access_key"] = secret_key
        return boto3.client("connect", **kwargs)

    async def connect(self, credentials: dict) -> ConnectionResult:
        client = self._client(credentials)
        try:
            instances = await asyncio.to_thread(client.list_instances)
        except NoCredentialsError:
            return await self._demo.connect(credentials)
        except ClientError as exc:
            raise UpstreamError(f"Amazon Connect authentication failed: {exc}") from exc

        region = credentials.get("region") or get_settings().aws_region
        return ConnectionResult(
            platform=self.platform,
            connected=True,
            detail=f"Connected to Amazon Connect ({region}).",
            metadata={"region": region, "instanceCount": len(instances.get("InstanceSummaryList", []))},
        )

    async def discover(self, scenario_id: str | None = None) -> dict:
        client = self._client({})
        try:
            instances = (await asyncio.to_thread(client.list_instances)).get("InstanceSummaryList", [])
        except NoCredentialsError:
            return await self._demo.discover(scenario_id)
        except ClientError as exc:
            raise UpstreamError(f"Amazon Connect discovery failed: {exc}") from exc

        if not instances:
            return await self._demo.discover(scenario_id)
        instance_id = instances[0]["Id"]

        try:
            responses = await asyncio.gather(
                *(
                    asyncio.to_thread(getattr(client, method), InstanceId=instance_id)
                    for method, _ in _DISCOVERY_CALLS.values()
                )
            )
        except ClientError as exc:
            raise UpstreamError(f"Amazon Connect discovery failed: {exc}") from exc

        by_kind = {
            kind: resp.get(list_key, [])
            for (kind, (_, list_key)), resp in zip(_DISCOVERY_CALLS.items(), responses)
        }

        inventory = [
            {
                "id": item.get("Id") or item.get("LambdaFunctionArn", ""),
                "name": item.get("Name") or item.get("LambdaFunctionArn", ""),
                "type": kind,
                "status": "discovered",
            }
            for kind, items in by_kind.items()
            for item in items
        ]
        discovered = [
            {"label": kind, "count": len(items), "status": "discovered"} for kind, items in by_kind.items()
        ]
        total = len(inventory)
        return {
            "scenario_id": scenario_id or "amazon-connect-live",
            "discovered": discovered,
            "inventory": inventory,
            "gap": {"auto": total, "review": 0, "unsupported": 0, "complexity": None},
        }
