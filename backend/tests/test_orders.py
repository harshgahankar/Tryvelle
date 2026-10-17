"""Cart validation + idempotent demo orders + oversell/cancel rules."""
import os
import sys
import threading
import uuid

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import hash_password  # noqa: E402
from app.db import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.models import Address, Base, ProductVariant, User  # noqa: E402
from app.services.seed import seed_all  # noqa: E402


@pytest.fixture
def setup():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)
    with TestingSession() as s:
        seed_all(s)
        s.add(User(name="Sam", email_normalized="sam@example.com",
                   password_hash=hash_password("longpassword1"), role="shopper"))
        s.add(User(name="Admin", email_normalized="admin@example.com",
                   password_hash=hash_password("adminpass123"), role="admin"))
        sam = s.query(User).filter_by(email_normalized="sam@example.com").one()
        s.add(Address(user_id=sam.id, recipient="Sam", line1="1 Road", city="Pune", postal_code="411001"))
        s.commit()
        addr_id = str(s.query(Address).filter_by(user_id=sam.id).one().id)
        variant = s.query(ProductVariant).filter(ProductVariant.sku.like("%white-oxford-shirt-white-m")).one()

    def override():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override
    client = TestClient(app)
    yield client, TestingSession, addr_id, str(variant.id), variant.price_minor
    app.dependency_overrides.clear()


def login_as(client, email):
    c = TestClient(app)
    r = c.post("/api/v1/auth/login", json={"email": email, "password": "longpassword1"
               if "sam" in email else "adminpass123"})
    assert r.status_code == 200, r.text
    return c, {"X-CSRF-Token": r.json()["csrf_token"]}


def test_cart_ignores_client_prices(setup):
    client, _, _, vid, price = setup
    # Only variant_id + quantity are accepted; there is no price field to spoof.
    r = client.post("/api/v1/cart/validate", json={"items": [{"variant_id": vid, "quantity": 2}]})
    body = r.json()
    assert body["subtotal_minor"] == price * 2 and body["shipping_minor"] == 0
    assert body["items"][0]["unit_price_minor"] == price
    bad = client.post("/api/v1/cart/validate",
                      json={"items": [{"variant_id": vid, "quantity": 11}]})  # M holds 10
    assert bad.json()["items"][0]["error"] == "OUT_OF_STOCK"


def test_order_idempotency_and_conflicts(setup):
    client, _, addr_id, vid, price = setup
    shopper, h = login_as(client, "sam@example.com")
    payload = {"items": [{"variant_id": vid, "quantity": 1}], "address_id": addr_id,
               "expected_total_minor": price}
    key = str(uuid.uuid4())
    r1 = shopper.post("/api/v1/orders", headers={**h, "Idempotency-Key": key}, json=payload)
    assert r1.status_code == 201
    assert r1.json()["order_number"].startswith("DEMO-")
    assert r1.json()["payment_collected"] is False
    # Same key + same payload -> original order, no extra stock movement.
    r2 = shopper.post("/api/v1/orders", headers={**h, "Idempotency-Key": key}, json=payload)
    assert r2.json()["id"] == r1.json()["id"]
    # Same key + different payload -> conflict.
    other = dict(payload, expected_total_minor=price)
    other["items"] = [{"variant_id": vid, "quantity": 2}]
    r3 = shopper.post("/api/v1/orders", headers={**h, "Idempotency-Key": key}, json=other)
    assert r3.status_code == 409 and r3.json()["error"]["code"] == "IDEMPOTENCY_CONFLICT"
    # Stale expected total -> PRICE_CHANGED with server totals.
    r4 = shopper.post("/api/v1/orders", headers={**h, "Idempotency-Key": str(uuid.uuid4())}, json={
        "items": [{"variant_id": vid, "quantity": 1}], "address_id": addr_id,
        "expected_total_minor": 1})
    assert r4.status_code == 409
    assert r4.json()["error"]["code"] == "PRICE_CHANGED"
    assert r4.json()["error"]["validated"]["total_minor"] == price


def test_cancel_restores_stock_once(setup):
    client, TestingSession, addr_id, vid, price = setup
    shopper, h = login_as(client, "sam@example.com")
    oid = shopper.post("/api/v1/orders", headers={**h, "Idempotency-Key": str(uuid.uuid4())}, json={
        "items": [{"variant_id": vid, "quantity": 1}], "address_id": addr_id,
        "expected_total_minor": price}).json()["id"]
    with TestingSession() as s:
        before = s.query(ProductVariant).filter_by(id=uuid.UUID(vid)).one().stock_quantity
    assert shopper.post(f"/api/v1/me/orders/{oid}/cancel", headers=h).json()["status"] == "demo_cancelled"
    with TestingSession() as s:
        assert s.query(ProductVariant).filter_by(id=uuid.UUID(vid)).one().stock_quantity == before + 1
    again = shopper.post(f"/api/v1/me/orders/{oid}/cancel", headers=h)
    assert again.status_code == 409  # exactly-once restore
    with TestingSession() as s:
        assert s.query(ProductVariant).filter_by(id=uuid.UUID(vid)).one().stock_quantity == before + 1


def test_concurrent_orders_cannot_oversell(tmp_path):
    import tempfile
    dbfile = str(tmp_path / "race.db")
    engine = create_engine(f"sqlite:///{dbfile}", connect_args={"check_same_thread": False, "timeout": 30})
    Base.metadata.create_all(engine)
    S = sessionmaker(bind=engine)
    with S() as s:
        seed_all(s)
        s.add(User(name="U", email_normalized="u@example.com",
                   password_hash=hash_password("longpassword1"), role="shopper"))
        s.commit()
        u = s.query(User).filter_by(email_normalized="u@example.com").one()
        s.add(Address(user_id=u.id, recipient="U", line1="1 Rd", city="Pune", postal_code="411001"))
        s.commit()
        addr = str(s.query(Address).filter_by(user_id=u.id).one().id)
        v = s.query(ProductVariant).filter(ProductVariant.sku.like("%white-oxford-shirt-white-s")).one()
        vid, price, uid = str(v.id), v.price_minor, u.id
        v.stock_quantity = 1
        s.commit()
    from app.services.orders import OrderError, place_order
    results = []

    def attempt(i):
        db = S()
        try:
            place_order(db, uid, [{"variant_id": vid, "quantity": 1}], addr, price, f"race-key-{i}")
            results.append("placed")
        except OrderError as e:
            results.append(e.code)
        finally:
            db.close()

    threads = [threading.Thread(target=attempt, args=(i,)) for i in range(4)]
    [t.start() for t in threads]
    [t.join() for t in threads]
    assert results.count("placed") == 1
    assert results.count("OUT_OF_STOCK") == 3
    with S() as s:
        assert s.query(ProductVariant).filter_by(id=uuid.UUID(vid)).one().stock_quantity == 0


def test_owner_history_and_admin_flow(setup):
    client, _, addr_id, vid, price = setup
    shopper, h = login_as(client, "sam@example.com")
    oid = shopper.post("/api/v1/orders", headers={**h, "Idempotency-Key": str(uuid.uuid4())}, json={
        "items": [{"variant_id": vid, "quantity": 1}], "address_id": addr_id,
        "expected_total_minor": price}).json()["id"]
    assert shopper.get("/api/v1/me/orders").json()["total"] == 1
    assert shopper.get(f"/api/v1/me/orders/{oid}").json()["order_number"].startswith("DEMO-")
    admin, ha = login_as(client, "admin@example.com")
    assert admin.get("/api/v1/admin/orders", headers=ha).json()["total"] == 1
    assert admin.patch(f"/api/v1/admin/orders/{oid}/status", headers=ha,
                       json={"status": "demo_confirmed"}).json()["status"] == "demo_confirmed"
    bad = admin.patch(f"/api/v1/admin/orders/{oid}/status", headers=ha, json={"status": "demo_placed"})
    assert bad.status_code == 409
    assert admin.patch(f"/api/v1/admin/orders/{oid}/status", headers=ha,
                       json={"status": "demo_completed"}).json()["status"] == "demo_completed"
    # Completed orders cannot be cancelled.
    assert shopper.post(f"/api/v1/me/orders/{oid}/cancel", headers=h).status_code == 409
    # Shoppers cannot touch admin orders.
    assert shopper.get("/api/v1/admin/orders").status_code == 403
