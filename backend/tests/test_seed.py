"""Seed + constraint tests run against a throwaway SQLite DB (no server needed)."""
import os
import sys

import pytest  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.exc import IntegrityError  # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.models import Base, ProductVariant  # noqa: E402
from app.services.seed import seed_all  # noqa: E402


@pytest.fixture
def db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    yield session
    session.close()


def test_seed_is_idempotent(db):
    first = seed_all(db)
    second = seed_all(db)
    assert first["products"] > 0 and first["variants"] > 0
    assert second == {"categories": 0, "products": 0, "variants": 0}


def test_money_never_float(db):
    seed_all(db)
    for (price,) in db.query(ProductVariant.price_minor).all():
        assert isinstance(price, int) and price >= 0


def test_negative_stock_rejected(db):
    seed_all(db)
    var = db.query(ProductVariant).first()
    var.stock_quantity = -1
    with pytest.raises(IntegrityError):
        db.commit()
