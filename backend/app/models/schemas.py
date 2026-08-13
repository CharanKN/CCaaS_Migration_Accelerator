"""Typed schemas mirroring the current data/demo-data.json shape.

These intentionally match the fields the existing frontend already reads, so
the API is a drop-in data source. ``extra="allow"`` keeps any additional
fields (e.g. richer architecture blocks) rather than silently dropping them.
"""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class _Base(BaseModel):
    model_config = ConfigDict(extra="allow")


class Pipeline(_Base):
    done: list[str] = Field(default_factory=list)
    active: str | None = None


class GapSummary(_Base):
    auto: int = 0
    review: int = 0
    unsupported: int = 0
    complexity: str | None = None


class DiscoveredItem(_Base):
    label: str
    count: int = 0
    status: str | None = None


class InventoryItem(_Base):
    name: str
    id: str
    type: str | None = None
    complexity: str | None = None
    cpct: int | None = None
    deps: str | None = None
    status: str | None = None


class MappingItem(_Base):
    sName: str
    sType: str | None = None
    tName: str | None = None
    tType: str | None = None
    score: int | None = None
    status: str | None = None


class DeployLog(_Base):
    t: str
    ok: bool = True
    msg: str


class TestCase(_Base):
    name: str
    id: str
    input: str | None = None
    expected: str | None = None
    latency: str | None = None
    result: str | None = None


class Scenario(_Base):
    """Full scenario as stored in demo-data.json."""

    name: str
    client: str | None = None
    source: str | None = None
    target: str | None = None
    stage: str | None = None
    progress: int | None = None
    pipeline: Pipeline | None = None
    gap: GapSummary | None = None
    discovered: list[DiscoveredItem] = Field(default_factory=list)
    inventory: list[InventoryItem] = Field(default_factory=list)
    mappings: list[MappingItem] = Field(default_factory=list)
    deployLogs: list[DeployLog] = Field(default_factory=list)
    tests: list[TestCase] = Field(default_factory=list)
    architecture: dict | None = None


class ScenarioSummary(_Base):
    """Lightweight scenario descriptor for list views."""

    id: str
    name: str
    client: str | None = None
    source: str | None = None
    target: str | None = None
    stage: str | None = None
    progress: int | None = None


# --- File upload / parse ---
class UploadResult(_Base):
    """Result of parsing one uploaded source-export file."""

    filename: str
    size: int
    platform: str
    parsed: bool
    message: str | None = None
    discovered: list[DiscoveredItem] = Field(default_factory=list)
    inventory: list[InventoryItem] = Field(default_factory=list)
    gap: GapSummary | None = None


# --- LLM convert ---
class ConvertRequest(BaseModel):
    scenario_id: str = Field(..., description="Scenario to convert, e.g. 'avaya-genesys'")
    target: str | None = Field(default=None, description="Override target platform")
    instructions: str | None = Field(default=None, description="Optional extra guidance for the model")


class ConvertResponse(BaseModel):
    scenario_id: str
    target: str | None = None
    model: str
    artifact: str = Field(..., description="Generated artifact (e.g. Terraform / flow JSON)")


# --- GitHub deploy ---
class DeployRequest(BaseModel):
    repository: str | None = Field(default=None, description="owner/name; falls back to server default")
    branch: str | None = None
    directory: str | None = None
    commit_message: str = Field(default="Deploy generated Terraform via CCaaS Migration Suite")
    files: dict[str, str] = Field(..., description="Map of repo-relative path -> file contents")


class DeployResponse(BaseModel):
    repository: str
    branch: str
    commit_url: str | None = None
    committed_paths: list[str] = Field(default_factory=list)
