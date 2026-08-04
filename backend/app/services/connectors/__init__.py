"""CCaaS platform connectors.

Each connector knows how to authenticate to a source/target platform and
discover its objects. Real API integration is intentionally deferred — these
start as demo-backed stubs behind a stable interface so routers and the
frontend can be wired now and swapped to live calls later.
"""
from .base import BaseConnector, ConnectionResult, get_connector  # noqa: F401

# Import concrete connectors so their @register decorators run.
from . import amazon_connect, genesys  # noqa: F401,E402
