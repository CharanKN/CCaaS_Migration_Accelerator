"""Auth flow tests: register, login, and protected-route gating."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _unique_email(tag: str) -> str:
    return f"{tag}@example.com"


def test_register_returns_token():
    r = client.post("/api/auth/register", json={"email": _unique_email("reg1"), "password": "correct-horse"})
    assert r.status_code == 200
    body = r.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_register_duplicate_email_conflicts():
    email = _unique_email("dupe")
    r1 = client.post("/api/auth/register", json={"email": email, "password": "correct-horse"})
    assert r1.status_code == 200
    r2 = client.post("/api/auth/register", json={"email": email, "password": "another-pass"})
    assert r2.status_code == 409


def test_login_success_and_wrong_password():
    email = _unique_email("login1")
    client.post("/api/auth/register", json={"email": email, "password": "correct-horse"})

    ok = client.post("/api/auth/login", data={"username": email, "password": "correct-horse"})
    assert ok.status_code == 200
    assert ok.json()["access_token"]

    bad = client.post("/api/auth/login", data={"username": email, "password": "wrong"})
    assert bad.status_code == 401


def test_protected_route_requires_token():
    r = client.post("/api/discover", params={"platform": "genesys-cloud", "scenario_id": "avaya-genesys"})
    assert r.status_code == 401


def test_protected_route_rejects_garbage_token():
    r = client.post(
        "/api/discover",
        params={"platform": "genesys-cloud", "scenario_id": "avaya-genesys"},
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert r.status_code == 401


def test_protected_route_accepts_valid_token():
    email = _unique_email("protected1")
    client.post("/api/auth/register", json={"email": email, "password": "correct-horse"})
    token = client.post("/api/auth/login", data={"username": email, "password": "correct-horse"}).json()["access_token"]

    r = client.post(
        "/api/discover",
        params={"platform": "genesys-cloud", "scenario_id": "avaya-genesys"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json()["discovered"]


def test_read_only_routes_stay_open():
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/dataset").status_code == 200
    assert client.get("/api/scenarios").status_code == 200


def test_self_registration_defaults_to_demo_role():
    email = _unique_email("roledefault")
    token = client.post("/api/auth/register", json={"email": email, "password": "correct-horse"}).json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json() == {"email": email, "role": "demo"}


def test_demo_role_rejected_from_full_access_routes():
    email = _unique_email("demogate")
    token = client.post("/api/auth/register", json={"email": email, "password": "correct-horse"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    connect_resp = client.post(
        "/api/connect", json={"platform": "genesys-cloud", "credentials": {}}, headers=headers
    )
    assert connect_resp.status_code == 403

    deploy_resp = client.post(
        "/api/deploy/github",
        json={"files": [], "repository": "org/repo", "branch": "main", "directory": "terraform", "commit_message": "x"},
        headers=headers,
    )
    assert deploy_resp.status_code == 403


def test_full_access_role_allowed_on_gated_routes():
    from app.database import SessionLocal
    from app.models_db.user import Role, User

    email = _unique_email("fullaccess")
    token = client.post("/api/auth/register", json={"email": email, "password": "correct-horse"}).json()["access_token"]

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        user.role = Role.MIGRATION_ENGINEER.value
        db.commit()
    finally:
        db.close()

    resp = client.post(
        "/api/connect", json={"platform": "genesys-cloud", "credentials": {}}, headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code != 403
