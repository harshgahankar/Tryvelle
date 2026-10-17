"""Catalog API tests against a seeded throwaway SQLite DB."""
import os
import sys

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.models import Base, Product  # noqa: E402
from app.services.seed import seed_all  # noqa: E402


@pytest.fixture
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)
    with TestingSession() as s:
        seed_all(s)

    def override():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_categories(client):
    r = client.get("/api/v1/categories")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 2 and len(body["items"]) == 2


def test_list_pagination_and_shape(client):
    r = client.get("/api/v1/products", params={"page_size": 2})
    body = r.json()
    assert (body["page"], body["page_size"], body["total"]) == (1, 2, 18)
    item = body["items"][0]
    assert {"slug", "title", "min_price_minor", "colors", "photos", "try_on_available"} <= set(item)
    assert isinstance(item["min_price_minor"], int)


def test_filters_and_sort(client):
    assert client.get("/api/v1/products", params={"q": "linen"}).json()["total"] == 1
    assert client.get("/api/v1/products", params={"category": "shirts"}).json()["total"] == 8
    assert client.get("/api/v1/products", params={"max_price_minor": 150000}).json()["total"] == 6
    assert client.get("/api/v1/products", params={"size": "M"}).json()["total"] == 18
    asc = client.get("/api/v1/products", params={"sort": "price_asc"}).json()["items"]
    assert asc[0]["slug"] == "light-blue-casual-shirt"


def test_page_size_capped_with_envelope(client):
    r = client.get("/api/v1/products", params={"page_size": 200})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_detail_and_404_envelope(client):
    r = client.get("/api/v1/products/white-oxford-shirt")
    assert r.status_code == 200
    body = r.json()
    assert body["try_on_available"] is True
    assert len(body["size_chart"]["rows"]) == 5
    assert body["colors"][0]["variants"][0]["price_minor"] == 149900
    assert body["photos"][0]["url"].startswith("http")  # absolute: frontend is another origin
    r = client.get("/api/v1/products/no-such-tee")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NOT_FOUND"


def test_draft_hidden_and_assets_published_only(client):
    pid = client.get("/api/v1/products/white-oxford-shirt").json()["id"]
    assets = client.get(f"/api/v1/products/{pid}/try-on-assets").json()["items"]
    assert len(assets) == 1 and assets[0]["color_name"] == "White"
    other = client.get("/api/v1/products").json()["items"]
    plain = next(i for i in other if i["slug"] == "beige-linen-shirt")
    assert client.get(f"/api/v1/products/{plain['id']}/try-on-assets").json()["items"] == []
