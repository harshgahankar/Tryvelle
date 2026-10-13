"""Usage from backend/:  python scripts/seed.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal  # noqa: E402
from app.services.seed import seed_all  # noqa: E402

if __name__ == "__main__":
    with SessionLocal() as db:
        print(seed_all(db))
