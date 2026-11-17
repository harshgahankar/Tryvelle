"""Photo try-on endpoint: validation, garment lookup and model-service proxying.
The model service (ml/serve.py) is mocked; no GPU needed."""
import httpx
import pytest

from app.api.v1 import tryon
from tests.test_catalog import client  # noqa: F401  (seeded DB fixture)

JPEG = b"\xff\xd8\xff\xe0fake-jpeg"


def pid(client, slug):  # noqa: F811
    return client.get(f"/api/v1/products/{slug}").json()["id"]


class FakeClient:
    """Stands in for httpx.AsyncClient; records the call and returns `response`."""
    calls = []
    response = None

    def __init__(self, *a, **k):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def post(self, url, params=None, content=None):
        FakeClient.calls.append((url, params, content))
        if isinstance(FakeClient.response, Exception):
            raise FakeClient.response
        return FakeClient.response


@pytest.fixture
def model(monkeypatch):
    FakeClient.calls = []
    FakeClient.response = httpx.Response(200, content=b"RESULT", headers={"content-type": "image/jpeg"})
    monkeypatch.setattr(tryon.httpx, "AsyncClient", FakeClient)
    return FakeClient


def post(client, product_id, data=JPEG, ctype="image/jpeg"):  # noqa: F811
    return client.post(f"/api/v1/products/{product_id}/try-on-photo", files={"photo": ("me.jpg", data, ctype)})


def test_returns_generated_image_and_sends_garment(client, model):  # noqa: F811
    r = post(client, pid(client, "purple-full-sleeve-kurti"))
    assert r.status_code == 200 and r.content == b"RESULT"
    assert r.headers["cache-control"] == "no-store"
    url, params, content = model.calls[0]
    assert url.endswith("/tryon") and content == JPEG
    assert params["garment"].endswith("purple-full-sleeve-kurti-png.png")


def test_garment_without_try_on_asset(client, model):  # noqa: F811
    r = post(client, pid(client, "beige-linen-shirt"))
    assert r.status_code == 404 and r.json()["error"]["code"] == "TRY_ON_UNAVAILABLE"
    assert model.calls == []


def test_rejects_non_image_and_bad_ids(client, model):  # noqa: F811
    p = pid(client, "white-oxford-shirt")
    assert post(client, p, b"hello", "text/plain").json()["error"]["code"] == "UNSUPPORTED_PHOTO"
    assert post(client, "not-a-uuid").json()["error"]["code"] == "INVALID_ID"
    assert model.calls == []


def test_rejects_oversized_photo(client, model):  # noqa: F811
    r = post(client, pid(client, "white-oxford-shirt"), b"x" * (tryon.MAX_BYTES + 1))
    assert r.status_code == 413 and model.calls == []


def test_model_offline_and_no_person(client, model):  # noqa: F811
    p = pid(client, "white-oxford-shirt")
    model.response = httpx.ConnectError("refused")
    assert post(client, p).json()["error"]["code"] == "TRY_ON_OFFLINE"
    model.response = httpx.Response(422, text="No person detected.")
    r = post(client, p)
    assert r.status_code == 422 and r.json()["error"]["code"] == "NO_PERSON"


def test_dropped_in_flat_png_enables_try_on(client, model):  # noqa: F811
    """Owner adds `<name>-png.png` next to the product photos -> try-on works."""
    import os
    from app.core.config import get_settings
    p = pid(client, "maroon-party-shirt")
    assert post(client, p).json()["error"]["code"] == "TRY_ON_UNAVAILABLE"
    folder = os.path.join(get_settings().STORAGE_LOCAL_DIR, "sample", "Maroon Party Shirt")
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, "maroon-party-shirt-png.png")
    open(path, "wb").write(b"png")
    try:
        r = post(client, p)
        assert r.status_code == 200
        assert model.calls[-1][1]["garment"] == "sample/Maroon Party Shirt/maroon-party-shirt-png.png"
    finally:
        os.remove(path)
