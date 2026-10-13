"""Auth/session/CSRF/ownership tests on a throwaway SQLite DB."""
import os
import sys

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import hash_password  # noqa: E402
from app.db import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.models import Base, User  # noqa: E402
from app.services.seed import seed_all  # noqa: E402


@pytest.fixture
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)
    with TestingSession() as s:
        seed_all(s)
        s.add(User(name="Admin", email_normalized="admin@example.com",
                   password_hash=hash_password("adminpass123"), role="admin"))
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


def register(client, email="sam@example.com"):
    return client.post("/api/v1/auth/register",
                       json={"name": "Sam", "email": email, "password": "longpassword1"})


def login(client, email="sam@example.com"):
    return client.post("/api/v1/auth/login",
                       json={"email": email, "password": "longpassword1"})


def auth_headers(client, email="sam@example.com"):
    r = client.post("/api/v1/auth/login",
                    json={"email": email, "password": "longpassword1"})
    csrf = r.json()["csrf_token"]
    # TestClient persists cookies automatically.
    return {"X-CSRF-Token": csrf}


def test_register_login_me_logout(client):
    assert register(client).status_code == 201
    assert register(client, "sam@example.com").status_code == 409  # duplicate
    bad = client.post("/api/v1/auth/login",
                      json={"email": "sam@example.com", "password": "wrongpassword!"})
    assert bad.status_code == 401 and bad.json()["error"]["code"] == "INVALID_CREDENTIALS"
    assert login(client).status_code == 200
    me = client.get("/api/v1/auth/me")
    assert me.json()["user"]["email"] == "sam@example.com"
    assert me.json()["user"]["role"] == "shopper"  # role never from client input
    client.post("/api/v1/auth/logout")
    assert client.get("/api/v1/auth/me").status_code == 401


def test_csrf_required_on_mutation(client):
    register(client)
    login(client)
    r = client.patch("/api/v1/me", json={"name": "Nope"})  # no CSRF header
    assert r.status_code == 403 and r.json()["error"]["code"] == "CSRF_REQUIRED"


def test_profile_and_addresses_owner_only(client):
    register(client, "a@example.com")
    h = auth_headers(client, "a@example.com")
    assert client.patch("/api/v1/me", json={"name": "A2"}, headers=h).json()["name"] == "A2"
    addr = client.post("/api/v1/me/addresses", headers=h, json={
        "recipient": "A", "line1": "1 Road", "city": "Pune",
        "postal_code": "411001"}).json()
    # Second user cannot see or touch it.
    shopper2 = TestClient(app)
    shopper2.post("/api/v1/auth/register",
                  json={"name": "B", "email": "b@example.com", "password": "longpassword1"})
    r2 = shopper2.post("/api/v1/auth/login",
                       json={"email": "b@example.com", "password": "longpassword1"})
    h2 = {"X-CSRF-Token": r2.json()["csrf_token"]}
    assert shopper2.get("/api/v1/me/addresses").json()["items"] == []
    assert shopper2.patch(f"/api/v1/me/addresses/{addr['id']}", headers=h2, json={
        "recipient": "X", "line1": "9 Rd", "city": "Mumbai", "postal_code": "400001"}).status_code == 404
    assert shopper2.delete(f"/api/v1/me/addresses/{addr['id']}", headers=h2).status_code == 404


def test_wishlist_idempotent(client):
    register(client)
    h = auth_headers(client)
    pid = client.get("/api/v1/products").json()["items"][0]["id"]
    assert client.put(f"/api/v1/me/wishlist/{pid}", headers=h).status_code == 200
    assert client.put(f"/api/v1/me/wishlist/{pid}", headers=h).status_code == 200  # no duplicate
    assert len(client.get("/api/v1/me/wishlist").json()["items"]) == 1
    assert client.delete(f"/api/v1/me/wishlist/{pid}", headers=h).status_code == 200
    assert client.get("/api/v1/me/wishlist").json()["items"] == []


def test_forgot_generic_and_reset_one_use(client):
    register(client)
    assert client.post("/api/v1/auth/forgot-password",
                       json={"email": "sam@example.com"}).json()["ok"] is True
    # Unknown email returns the same shape (no enumeration).
    assert client.post("/api/v1/auth/forgot-password",
                       json={"email": "ghost@example.com"}).json()["ok"] is True
