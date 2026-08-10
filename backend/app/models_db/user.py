from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Role(str, enum.Enum):
    """A user's access tier. Every role except DEMO gets the full item list;
    DEMO is restricted to the curated showcase subset (see frontend routes.ts)."""

    SUPER_ADMIN = "super_admin"
    TENANT_ADMIN = "tenant_admin"
    MIGRATION_ENGINEER = "migration_engineer"
    QA_ANALYST = "qa_analyst"
    VIEWER = "viewer"
    DEMO = "demo"


# Every role except DEMO gets full access — kept as a single set rather than
# per-role permissions since that's the only distinction the product needs today.
FULL_ACCESS_ROLES = frozenset(r.value for r in Role if r is not Role.DEMO)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False, default=Role.DEMO.value)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
