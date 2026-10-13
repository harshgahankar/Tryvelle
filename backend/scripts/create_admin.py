"""Usage from backend/:  SETUP_ADMIN_EMAIL=a@b.c SETUP_ADMIN_PASSWORD=... python scripts/create_admin.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal  # noqa: E402
from app.services.seed import create_admin  # noqa: E402

if __name__ == "__main__":
    with SessionLocal() as db:
        print(create_admin(db, os.environ.get("SETUP_ADMIN_EMAIL", ""), os.environ.get("SETUP_ADMIN_PASSWORD", "")))
