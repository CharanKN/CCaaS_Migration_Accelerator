"""One-off script: create the initial SUPER_ADMIN accounts.

Run once from backend/:
    .venv/Scripts/python scripts/seed_admins.py

Prints the generated credentials to stdout. Safe to re-run — existing emails
are skipped rather than duplicated or overwritten.
"""
from __future__ import annotations

import secrets
import string
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.security import hash_password  # noqa: E402
from app.database import SessionLocal, init_db  # noqa: E402
from app.models_db.user import Role, User  # noqa: E402

ADMIN_EMAILS = [
    "admin1@ccaas-migration.local",
    "admin2@ccaas-migration.local",
]


def _generate_password(length: int = 20) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def main() -> None:
    init_db()
    db = SessionLocal()
    created = []
    try:
        for email in ADMIN_EMAILS:
            existing = db.query(User).filter(User.email == email).first()
            if existing is not None:
                print(f"SKIP  {email} already exists (role={existing.role})")
                continue
            password = _generate_password()
            user = User(email=email, hashed_password=hash_password(password), role=Role.SUPER_ADMIN.value)
            db.add(user)
            db.commit()
            db.refresh(user)
            created.append((user.email, password, user.role))
        print("\n--- Created accounts (save these now, they are not stored anywhere else) ---")
        for email, password, role in created:
            print(f"email: {email}\npassword: {password}\nrole: {role}\n")
    finally:
        db.close()


if __name__ == "__main__":
    main()
