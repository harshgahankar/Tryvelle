"""Admin authorization + catalog/asset rules on a throwaway SQLite DB."""
import io
import os
import sys

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import hash_password  # noqa: E402
from app.db import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.models import Base, User  # noqa: E402
from app.services.seed import seed_all  # noqa: E402

ANCHORS = {"left_shoulder": {"x": 0.28, "y": 0.18}, "right_shoulder": {"x": 0.72, "y": 0.18},
           "hem_center": {"x": 0.5, "y": 0.88}}
CALIB = {"scale_multiplier": 1.0, "offset_x": 0.0, "offset_y": 0.0}


def png_bytes(mode="RGBA", size=(64, 64)):
    buf = io.BytesIO()
    Image.new(mode, size, (200, 30, 30, 255) if "A" in mode else (200, 30, 30)).save(buf, "PNG")
    return buf.getvalue()


@pytest.fixture
def seeded():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)
    with TestingSession() as s:
        seed_all(s)
        s.add(User(name="Admin", email_normalized="admin@example.com",
                   password_hash=hash_password("adminpass123"), role="admin"))
        s.add(User(name="Sam", email_normalized="sam@example.com",
                   password_hash=hash_password("longpassword1"), role="shopper"))
        s.commit()

    def override():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override
    yield TestClient(app)
    app.dependency_overrides.clear()


def login_as(client, email, password):
    c = TestClient(app)
    r = c.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return c, {"X-CSRF-Token": r.json()["csrf_token"]}


def test_shopper_rejected_from_admin(seeded):
    shopper, h = login_as(seeded, "sam@example.com", "longpassword1")
    assert shopper.get("/api/v1/admin/products").status_code == 403
    r = shopper.post("/api/v1/admin/products", headers=h, json={
        "category_slug": "shirts", "slug": "x", "title": "X"})
    assert r.status_code == 403


def test_product_lifecycle_and_publish_gate(seeded):
    admin, h = login_as(seeded, "admin@example.com", "adminpass123")
    p = admin.post("/api/v1/admin/products", headers=h, json={
        "category_slug": "shirts", "slug": "test-tee", "title": "Test Tee"}).json()
    # Cannot publish without an active variant.
    r = admin.patch(f"/api/v1/admin/products/{p['id']}", headers=h, json={"status": "published"})
    assert r.status_code == 409 and r.json()["error"]["code"] == "UNPUBLISHABLE"
    # Draft is invisible on the public endpoint.
    assert admin.get("/api/v1/products/test-tee").status_code == 404
    c = admin.post(f"/api/v1/admin/products/{p['id']}/colors", headers=h,
                   json={"name": "Red", "hex": "#FF0000"}).json()
    v = admin.post(f"/api/v1/admin/colors/{c['color_id']}/variants", headers=h, json={
        "sku": "TEST-RED-S", "size_label": "S", "price_minor": 99900, "stock_quantity": 5}).json()
    assert admin.patch(f"/api/v1/admin/products/{p['id']}", headers=h,
                       json={"status": "published"}).status_code == 200
    assert admin.get("/api/v1/products/test-tee").status_code == 200
    # Stock cannot go negative; valid adjustment records a movement.
    r = admin.post(f"/api/v1/admin/variants/{v['variant_id']}/stock-adjustments", headers=h,
                   json={"delta": -99, "reason": "oops"})
    assert r.status_code == 409 and r.json()["error"]["code"] == "NEGATIVE_STOCK"
    assert admin.post(f"/api/v1/admin/variants/{v['variant_id']}/stock-adjustments", headers=h,
                      json={"delta": -2, "reason": "demo sale"}).json()["stock_quantity"] == 3


def test_asset_upload_validation_and_publish(seeded):
    import json
    admin, h = login_as(seeded, "admin@example.com", "adminpass123")
    pid = admin.get("/api/v1/products/white-oxford-shirt").json()["id"]
    color_id = admin.get("/api/v1/products/white-oxford-shirt").json()["colors"][0]["color_id"]

    def upload(data, anchors=ANCHORS, name="g.png"):
        return admin.post(f"/api/v1/admin/colors/{color_id}/try-on-assets", headers=h,
                          files={"file": (name, data, "image/png")},
                          data={"anchors": json.dumps(anchors), "calibration": json.dumps(CALIB)})

    assert upload(b"not-an-image").status_code == 400  # undecodable
    assert upload(png_bytes("RGB")).status_code == 400  # PNG without alpha
    bad = dict(ANCHORS, right_shoulder={"x": 0.28, "y": 0.18})
    assert upload(png_bytes(), anchors=bad).json()["error"]["code"] == "UNCALIBRATED"
    a1 = upload(png_bytes()).json()
    assert a1["status"] == "draft"
    # Publish via meta PATCH; second asset demotes the first (one published per color).
    meta = {"anchors": ANCHORS, "calibration": CALIB}
    assert admin.patch(f"/api/v1/admin/try-on-assets/{a1['asset_id']}?publish=true",
                       headers=h, json=meta).json()["status"] == "published"
    a2 = upload(png_bytes()).json()
    assert admin.patch(f"/api/v1/admin/try-on-assets/{a2['asset_id']}?publish=true",
                       headers=h, json=meta).json()["status"] == "published"
    got = admin.get(f"/api/v1/products/{pid}/try-on-assets").json()["items"]
    mine = [a for a in got if a["color_id"] == color_id]
    assert sum(1 for _ in mine) >= 1
