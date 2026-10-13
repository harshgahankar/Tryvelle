"""Razorpay test-mode flow with a fake gateway (no network, no keys)."""
import hashlib
import hmac
import json
import os
import sys
import uuid

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app.api.v1.payments as payments_mod  # noqa: E402
from app.api.v1.payments import get_gateway as real_gateway  # noqa: E402 (unpatched ref)
from app.core.config import get_settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.models import Address, Base, ProductVariant, User  # noqa: E402
from app.services.seed import seed_all  # noqa: E402


class FakeOrders:
    def __init__(self, store):
        self.store = store

    def create(self, payload):
        rz_id = f"rzp_test_{len(self.store) + 1}"
        self.store[rz_id] = payload
        return {"id": rz_id, "amount": payload["amount"]}


class FakeUtility:
    def verify_payment_signature(self, params):
        if params.get("razorpay_signature") != "valid-sig":
            raise Exception("bad signature")


class FakeGateway:
    def __init__(self):
        self.order = FakeOrders({})
        self.utility = FakeUtility()


@pytest.fixture
def setup(monkeypatch):
    fake = FakeGateway()
    monkeypatch.setattr(payments_mod, "get_gateway", lambda: fake)
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)
    with TestingSession() as s:
        seed_all(s)
        s.add(User(name="Sam", email_normalized="sam@example.com",
                   password_hash=hash_password("longpassword1"), role="shopper"))
        s.commit()
        sam = s.query(User).filter_by(email_normalized="sam@example.com").one()
        s.add(Address(user_id=sam.id, recipient="Sam", line1="1 Road", city="Pune", postal_code="411001"))
        s.commit()
        addr_id = str(s.query(Address).filter_by(user_id=sam.id).one().id)
        v = s.query(ProductVariant).filter(ProductVariant.sku.like("%everyday-cotton-tee-cream-m")).one()
        vid, price, stock = str(v.id), v.price_minor, v.stock_quantity

    def override():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override
    client = TestClient(app)
    yield client, TestingSession, addr_id, vid, price, stock
    app.dependency_overrides.clear()


def login_as(client):
    c = TestClient(app)
    r = c.post("/api/v1/auth/login", json={"email": "sam@example.com", "password": "longpassword1"})
    assert r.status_code == 200, r.text
    return c, {"X-CSRF-Token": r.json()["csrf_token"]}


def test_intent_needs_keys_when_unpatched(setup, monkeypatch):
    client, _, addr_id, vid, price, _ = setup
    monkeypatch.setattr(payments_mod, "get_gateway", real_gateway)
    shopper, h = login_as(client)
    r = shopper.post("/api/v1/orders/razorpay-intent", headers={**h, "Idempotency-Key": str(uuid.uuid4())}, json={
        "items": [{"variant_id": vid, "quantity": 1}], "address_id": addr_id,
        "expected_total_minor": price})
    assert r.status_code == 400 and r.json()["error"]["code"] == "GATEWAY_NOT_CONFIGURED"


def test_intent_verify_capture_flow(setup):
    client, TestingSession, addr_id, vid, price, stock = setup
    shopper, h = login_as(client)
    key = str(uuid.uuid4())
    r = shopper.post("/api/v1/orders/razorpay-intent", headers={**h, "Idempotency-Key": key}, json={
        "items": [{"variant_id": vid, "quantity": 1}], "address_id": addr_id,
        "expected_total_minor": price})
    assert r.status_code == 201, r.text
    intent = r.json()
    assert intent["status"] == "pending_payment" and intent["razorpay_order_id"].startswith("rzp_test_")
    with TestingSession() as s:  # no stock moved yet
        assert s.query(ProductVariant).filter_by(id=uuid.UUID(vid)).one().stock_quantity == stock
    pay = {"order_id": intent["id"], "razorpay_order_id": intent["razorpay_order_id"],
           "razorpay_payment_id": "pay_test_1", "razorpay_signature": "valid-sig"}
    ok = shopper.post("/api/v1/orders/verify", headers=h, json=pay)
    assert ok.status_code == 200 and ok.json()["status"] == "paid"
    with TestingSession() as s:
        assert s.query(ProductVariant).filter_by(id=uuid.UUID(vid)).one().stock_quantity == stock - 1
    again = shopper.post("/api/v1/orders/verify", headers=h, json=pay)
    assert again.json()["status"] == "paid"  # idempotent
    with TestingSession() as s:
        assert s.query(ProductVariant).filter_by(id=uuid.UUID(vid)).one().stock_quantity == stock - 1


def test_bad_signature_fails_order(setup):
    client, _, addr_id, vid, price, _ = setup
    shopper, h = login_as(client)
    intent = shopper.post("/api/v1/orders/razorpay-intent", headers={**h, "Idempotency-Key": str(uuid.uuid4())}, json={
        "items": [{"variant_id": vid, "quantity": 1}], "address_id": addr_id,
        "expected_total_minor": price}).json()
    bad = shopper.post("/api/v1/orders/verify", headers=h, json={
        "order_id": intent["id"], "razorpay_order_id": intent["razorpay_order_id"],
        "razorpay_payment_id": "pay_x", "razorpay_signature": "tampered"})
    assert bad.status_code == 400 and bad.json()["error"]["code"] == "PAYMENT_FAILED"


def test_webhook_captures_idempotently(setup, monkeypatch):
    client, TestingSession, addr_id, vid, price, stock = setup
    monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "whsec_test")
    get_settings.cache_clear()
    try:
        shopper, h = login_as(client)
        intent = shopper.post("/api/v1/orders/razorpay-intent", headers={**h, "Idempotency-Key": str(uuid.uuid4())}, json={
            "items": [{"variant_id": vid, "quantity": 1}], "address_id": addr_id,
            "expected_total_minor": price}).json()

        def signed(body: bytes) -> dict:
            sig = hmac.new(b"whsec_test", body, hashlib.sha256).hexdigest()
            return {"X-Razorpay-Signature": sig}

        payload = json.dumps({"event": "payment.captured",
                              "payload": {"payment": {"entity": {"id": "pay_wh_1",
                                                                  "order_id": intent["razorpay_order_id"]}}}}).encode()
        r1 = client.post("/api/v1/webhooks/razorpay", content=payload, headers=signed(payload))
        assert r1.json() == {"ok": True}
        with TestingSession() as s:
            from app.models.models import Order
            assert s.query(Order).filter_by(id=uuid.UUID(intent["id"])).one().status == "paid"
        r2 = client.post("/api/v1/webhooks/razorpay", content=payload, headers=signed(payload))
        assert r2.json() == {"ok": True}  # replay safe
        bad = client.post("/api/v1/webhooks/razorpay", content=payload,
                          headers={"X-Razorpay-Signature": "nope"})
        assert bad.status_code == 400
    finally:
        monkeypatch.delenv("RAZORPAY_WEBHOOK_SECRET", raising=False)
        get_settings.cache_clear()
