"""SQLite database engine/session setup (sync SQLAlchemy — this app is small
and everything else here is plain, synchronous code; async DB access would add
complexity with no real benefit at this scale).
"""
from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings

settings = get_settings()

_connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def _add_missing_columns() -> None:
    """Add columns introduced after a table already existed. No Alembic at
    this scale — create_all() only creates missing tables, so columns added
    to an existing model need this one explicit ALTER TABLE step instead."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return
    existing = {c["name"] for c in inspector.get_columns("users")}
    if "role" not in existing:
        with engine.begin() as conn:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN role VARCHAR NOT NULL DEFAULT 'demo'")


def init_db() -> None:
    """Create tables that don't exist yet. No Alembic — one table, no
    migration history needed at this scale."""
    from . import models_db  # noqa: F401  (ensure models are registered on Base)

    Base.metadata.create_all(bind=engine)
    _add_missing_columns()


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
