"""API contract tests.

These lock the shapes the frontend depends on. If a change here breaks, the
frontend's data hydration breaks too.
"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
REPO_ROOT = Path(__file__).resolve().parents[2]


def _auth_headers(tag: str) -> dict:
    email = f"{tag}@example.com"
    client.post("/api/auth/register", json={"email": email, "password": "correct-horse"})
    token = client.post("/api/auth/login", data={"username": email, "password": "correct-horse"}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _full_access_headers(tag: str) -> dict:
    """Like _auth_headers, but promotes the account out of the default DEMO
    role — for tests that exercise routes gated to non-demo roles."""
    from app.database import SessionLocal
    from app.models_db.user import Role, User

    headers = _auth_headers(tag)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == f"{tag}@example.com").first()
        user.role = Role.MIGRATION_ENGINEER.value
        db.commit()
    finally:
        db.close()
    return headers


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_capabilities_shape():
    r = client.get("/api/capabilities")
    assert r.status_code == 200
    assert {"llm", "githubDeploy", "model"} <= set(r.json())


def test_scenarios_list():
    r = client.get("/api/scenarios")
    assert r.status_code == 200
    ids = {s["id"] for s in r.json()}
    assert {"avaya-genesys", "cisco-connect", "engage-genesys", "mitel-twilio"} <= ids


def test_scenario_detail():
    r = client.get("/api/scenarios/avaya-genesys")
    assert r.status_code == 200
    body = r.json()
    # Fields the frontend reads off `scen`.
    for key in ("name", "source", "target", "gap", "discovered", "inventory", "mappings", "tests"):
        assert key in body, f"missing {key}"


def test_scenario_404():
    r = client.get("/api/scenarios/does-not-exist")
    assert r.status_code == 404
    assert r.json()["status"] == 404


def test_dataset_deep_equals_demo_file():
    """The aggregate endpoint must match the on-disk dataset exactly, so the
    frontend swap (file -> API) is behaviourally identical."""
    api = client.get("/api/dataset").json()
    disk = json.loads((REPO_ROOT / "data" / "demo-data.json").read_text(encoding="utf-8"))
    assert api == disk


def test_sub_resources():
    inv = client.get("/api/scenarios/avaya-genesys/inventory").json()
    assert any(i["id"] == "VDN-44801" for i in inv)
    maps = client.get("/api/scenarios/avaya-genesys/mappings").json()
    assert any(m["sName"] == "Main_IVR_v3" for m in maps)


def test_connect_demo_mode():
    r = client.post(
        "/api/connect",
        json={
            "platform": "genesys-cloud",
            "credentials": {"region": "mypurecloud.com", "secret": "should-not-echo"},
        },
        headers=_full_access_headers("connect1"),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["connected"] is True
    # Secrets must never be echoed back to the client.
    assert "secret" not in body["metadata"]


def test_discover_demo_mode():
    r = client.post(
        "/api/discover",
        params={"platform": "genesys-cloud", "scenario_id": "avaya-genesys"},
        headers=_auth_headers("discover1"),
    )
    assert r.status_code == 200
    assert r.json()["discovered"]


def test_convert_guarded_without_key():
    r = client.post(
        "/api/convert",
        json={"scenario_id": "avaya-genesys"},
        headers=_auth_headers("convert1"),
    )
    assert r.status_code == 503


def test_deploy_guarded_without_token():
    r = client.post(
        "/api/deploy/github",
        json={"files": {"main.tf": "x"}},
        headers=_full_access_headers("deploy1"),
    )
    assert r.status_code == 503


def test_connect_and_discover_require_auth():
    assert client.post("/api/connect", json={"platform": "genesys-cloud"}).status_code == 401
    assert client.post("/api/discover", params={"platform": "genesys-cloud"}).status_code == 401
    assert client.post("/api/convert", json={"scenario_id": "avaya-genesys"}).status_code == 401
    assert client.post("/api/deploy/github", json={"files": {"main.tf": "x"}}).status_code == 401


def test_frontend_served_at_root():
    r = client.get("/")
    assert r.status_code == 200
    assert "<!doctype html>" in r.text[:200].lower()
