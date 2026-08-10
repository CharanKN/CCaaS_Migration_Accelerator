"""Test isolation: point the app at a throwaway SQLite file instead of the
real dev database, so repeated test runs don't accumulate registered users
across sessions (which broke duplicate-email assertions on reruns).

Must set the env var before any test module imports app.database/app.main,
since Settings/the SQLAlchemy engine are constructed at import time. pytest
imports conftest.py before collecting sibling test modules, so this runs
early enough.
"""
from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest

_tmp_db_path = Path(tempfile.gettempdir()) / f"ccaas-test-{os.getpid()}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp_db_path}"
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")


@pytest.fixture(scope="session", autouse=True)
def _cleanup_test_db():
    yield
    from app.database import engine

    engine.dispose()  # release SQLite's file handle before deleting (Windows locks open files)
    _tmp_db_path.unlink(missing_ok=True)
