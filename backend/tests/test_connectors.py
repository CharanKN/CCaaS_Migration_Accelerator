"""Tests for the real Genesys Cloud / Amazon Connect connector logic.

No live credentials exist for either platform, so these verify request
shaping, response normalization, and fallback/error behavior against mocked
transports — mirroring the httpx.MockTransport pattern already used for the
GitHub deploy service (see test_github_deploy.py).
"""
from __future__ import annotations

import asyncio
from unittest.mock import MagicMock

import httpx
import pytest
from botocore.exceptions import ClientError, NoCredentialsError

from app.config import get_settings
from app.core.errors import UpstreamError
from app.services.connectors.amazon_connect import AmazonConnectConnector
from app.services.connectors.genesys import GenesysCloudConnector


def _run(coro):
    return asyncio.run(coro)


# --- Genesys Cloud ---------------------------------------------------------


def _genesys_handler(request: httpx.Request) -> httpx.Response:
    if request.url.host == "login.mypurecloud.com" and request.url.path == "/oauth/token":
        return httpx.Response(200, json={"access_token": "tok123"})
    if request.url.host == "api.mypurecloud.com":
        return httpx.Response(200, json={"entities": [{"id": "obj-1", "name": "Object One"}]})
    return httpx.Response(404, json={"error": "not found"})


def test_genesys_falls_back_to_demo_without_credentials():
    get_settings.cache_clear()
    connector = GenesysCloudConnector()
    result = _run(connector.connect({}))
    assert result.connected is True
    assert "demo mode" in result.detail.lower()

    discovered = _run(connector.discover("avaya-genesys"))
    assert discovered["scenario_id"] == "avaya-genesys"
    assert discovered["inventory"]


def test_genesys_real_connect_uses_oauth_client_credentials():
    client = httpx.AsyncClient(transport=httpx.MockTransport(_genesys_handler))
    connector = GenesysCloudConnector(http_client=client)
    result = _run(
        connector.connect({"client_id": "id", "client_secret": "secret", "region": "mypurecloud.com"})
    )
    assert result.connected is True
    assert result.metadata["region"] == "mypurecloud.com"


def test_genesys_real_discover_normalizes_into_inventory(monkeypatch):
    monkeypatch.setenv("GENESYS_CLIENT_ID", "id")
    monkeypatch.setenv("GENESYS_CLIENT_SECRET", "secret")
    get_settings.cache_clear()
    try:
        client = httpx.AsyncClient(transport=httpx.MockTransport(_genesys_handler))
        connector = GenesysCloudConnector(http_client=client)
        result = _run(connector.discover("avaya-genesys"))
    finally:
        get_settings.cache_clear()

    assert result["scenario_id"] == "avaya-genesys"
    assert len(result["inventory"]) == 7  # one object per discovery endpoint
    assert all(item["status"] == "discovered" for item in result["inventory"])
    assert result["gap"]["auto"] == 7


def test_genesys_auth_failure_raises_upstream_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"error": "invalid_client"})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    connector = GenesysCloudConnector(http_client=client)
    with pytest.raises(UpstreamError):
        _run(connector.connect({"client_id": "id", "client_secret": "wrong", "region": "mypurecloud.com"}))


# --- Amazon Connect ----------------------------------------------------------


def test_amazon_connect_falls_back_to_demo_without_credentials():
    mock_client = MagicMock()
    mock_client.list_instances.side_effect = NoCredentialsError()
    connector = AmazonConnectConnector(boto_client=mock_client)

    result = _run(connector.connect({}))
    assert result.connected is True
    assert "demo mode" in result.detail.lower()

    discovered = _run(connector.discover("avaya-genesys"))
    assert discovered["scenario_id"] == "avaya-genesys"
    assert discovered["inventory"]


def test_amazon_connect_real_connect_and_discover():
    mock_client = MagicMock()
    mock_client.list_instances.return_value = {"InstanceSummaryList": [{"Id": "inst-1"}]}
    mock_client.list_contact_flows.return_value = {
        "ContactFlowSummaryList": [{"Id": "cf-1", "Name": "Main Flow"}]
    }
    mock_client.list_queues.return_value = {"QueueSummaryList": []}
    mock_client.list_routing_profiles.return_value = {"RoutingProfileSummaryList": []}
    mock_client.list_prompts.return_value = {"PromptSummaryList": []}
    mock_client.list_lambda_functions.return_value = {"LambdaFunctionSummaryList": []}
    mock_client.list_hours_of_operations.return_value = {"HoursOfOperationSummaryList": []}
    connector = AmazonConnectConnector(boto_client=mock_client)

    connect_result = _run(connector.connect({}))
    assert connect_result.connected is True
    assert connect_result.metadata["instanceCount"] == 1

    discover_result = _run(connector.discover(None))
    assert discover_result["inventory"] == [
        {"id": "cf-1", "name": "Main Flow", "type": "contactFlows", "status": "discovered"}
    ]
    assert discover_result["gap"]["auto"] == 1


def test_amazon_connect_auth_failure_raises_upstream_error():
    mock_client = MagicMock()
    mock_client.list_instances.side_effect = ClientError(
        {"Error": {"Code": "AccessDeniedException", "Message": "nope"}}, "ListInstances"
    )
    connector = AmazonConnectConnector(boto_client=mock_client)
    with pytest.raises(UpstreamError):
        _run(connector.connect({}))
