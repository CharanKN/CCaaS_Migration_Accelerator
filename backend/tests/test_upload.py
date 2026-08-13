"""Tests for the /api/upload endpoint and the Avaya export parser."""
from __future__ import annotations

import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.services.parsers.avaya import AvayaParseError, parse_avaya_export

client = TestClient(app)
REPO_ROOT = Path(__file__).resolve().parents[2]
SAMPLE_FILE = REPO_ROOT / "data" / "samples" / "avaya_ivr_export.json"


def _auth_headers(tag: str) -> dict:
    email = f"{tag}@example.com"
    client.post("/api/auth/register", json={"email": email, "password": "correct-horse"})
    token = client.post("/api/auth/login", data={"username": email, "password": "correct-horse"}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_parse_avaya_export_derives_discovered_and_inventory():
    payload = json.loads(SAMPLE_FILE.read_text(encoding="utf-8"))
    result = parse_avaya_export(payload)

    counts = {d["label"]: d["count"] for d in result["discovered"]}
    assert counts["IVR Call Flows (Vectors)"] == len(payload["vectors"])
    assert counts["DNIS / VDNs"] == len(payload["vdns"])
    assert counts["Holiday Tables"] == len(payload["holidayTables"])

    ids = {row["id"] for row in result["inventory"]}
    assert "VDN-44801" in ids
    assert "ADJ-001" in ids  # CRM_DataDip ASAI route

    adjunct_row = next(row for row in result["inventory"] if row["id"] == "ADJ-001")
    assert adjunct_row["status"] == "Unsupported"

    assert result["gap"]["auto"] + result["gap"]["review"] + result["gap"]["unsupported"] == len(result["inventory"])


def test_parse_avaya_export_rejects_unrecognized_shape():
    try:
        parse_avaya_export({"foo": "bar"})
        assert False, "expected AvayaParseError"
    except AvayaParseError:
        pass


def test_upload_endpoint_parses_sample_file_for_demo_role():
    headers = _auth_headers("upload-demo")
    with SAMPLE_FILE.open("rb") as f:
        r = client.post(
            "/api/upload",
            headers=headers,
            data={"platform": "avaya-aura"},
            files={"file": ("avaya_ivr_export.json", f, "application/json")},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["parsed"] is True
    assert body["inventory"]
    assert body["discovered"]
    assert body["gap"]["auto"] >= 0


def test_upload_endpoint_flags_unsupported_platform():
    headers = _auth_headers("upload-unsupported")
    r = client.post(
        "/api/upload",
        headers=headers,
        data={"platform": "cisco-ucce"},
        files={"file": ("routing_rules.csv", b"a,b,c\n1,2,3", "text/csv")},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["parsed"] is False
    assert "no parser" in body["message"].lower()


def test_upload_endpoint_requires_auth():
    r = client.post(
        "/api/upload",
        data={"platform": "avaya-aura"},
        files={"file": ("x.json", b"{}", "application/json")},
    )
    assert r.status_code == 401
