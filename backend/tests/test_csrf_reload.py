"""After a page reload the SPA only has the cookie; /auth/me must hand back a usable CSRF token."""
from tests.test_catalog import client  # noqa: F401


def test_me_issues_working_csrf_token(client):  # noqa: F811
    r = client.post("/api/v1/auth/register", json={"name": "Reload", "email": "reload@example.com",
                                                    "password": "Reload-pass-12345"})
    assert r.status_code == 201
    token = client.get("/api/v1/auth/me").json()["csrf_token"]
    pid = client.get("/api/v1/products/white-oxford-shirt").json()["id"]
    assert client.put(f"/api/v1/me/wishlist/{pid}").status_code == 403          # no token
    assert client.put(f"/api/v1/me/wishlist/{pid}", headers={"X-CSRF-Token": token}).status_code in (200, 201, 204)
