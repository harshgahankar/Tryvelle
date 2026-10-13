from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.models.models import Base  # noqa: F401  (metadata registration)

_settings = get_settings()
connect_args = {"check_same_thread": False} if _settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(_settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
