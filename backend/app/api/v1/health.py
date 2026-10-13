from fastapi import APIRouter
from sqlalchemy import text

from app.db import SessionLocal

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok", "demo_mode": True}


@router.get("/ready")
def ready():
    # Deployment readiness: database connectivity. Detail restricted to ok/not-ok.
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        return {"ready": True}
    except Exception:
        return {"ready": False}
