"""Connector interface + registry.

The interface mirrors the migration pipeline's early stages (Connect, Discover).
Concrete connectors implement real platform APIs; until then they return
demo-backed data via the data store so the UI keeps working.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ConnectionResult:
    platform: str
    connected: bool
    detail: str = ""
    # Echoes non-secret connection metadata (region, org id, etc.).
    metadata: dict = field(default_factory=dict)


class BaseConnector:
    """Base class for a source/target CCaaS connector."""

    #: platform slug, e.g. "genesys-cloud", "amazon-connect"
    platform: str = "generic"

    async def connect(self, credentials: dict) -> ConnectionResult:
        """Validate credentials and establish a session.

        NOTE: credentials arrive from an authenticated frontend session and are
        used server-side only; they are never logged or returned to the client.
        """
        raise NotImplementedError

    async def discover(self, scenario_id: str | None = None) -> dict:
        """Discover objects available on the platform.

        Returns a dict shaped like the scenario 'discovered'/'inventory' blocks.
        """
        raise NotImplementedError


# --- registry ---
_REGISTRY: dict[str, type[BaseConnector]] = {}


def register(cls: type[BaseConnector]) -> type[BaseConnector]:
    _REGISTRY[cls.platform] = cls
    return cls


def get_connector(platform: str) -> BaseConnector:
    """Return a connector instance for a platform slug, defaulting to the
    demo-backed generic connector when no specific one is registered."""
    cls = _REGISTRY.get(platform)
    if cls is None:
        from .demo import DemoConnector

        return DemoConnector(platform)
    return cls()
