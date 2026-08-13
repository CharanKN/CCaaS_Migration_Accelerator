"""Source-file parsers — turn an uploaded platform export into the same
discovered/inventory shape the demo dataset and live connectors already use.
"""
from __future__ import annotations

from .avaya import parse_avaya_export

__all__ = ["parse_avaya_export"]
