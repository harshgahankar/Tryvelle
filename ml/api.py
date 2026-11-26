"""The try-on HTTP API, shared by the local server (serve.py) and Modal (modal_app.py).

POST /tryon   multipart: person=<photo>, garment=<flat garment PNG>
              header X-Tryon-Secret: <TRYON_SECRET>   (only checked when the env var is set)
  -> 200 image/jpeg | 401 bad secret | 413 too big | 415 not an image | 422 no person found
GET  /health  -> {"ok": true}
Photos are processed in memory and never written to disk.
"""
import hmac
import io
import os
import threading

from fastapi import FastAPI, File, Header, UploadFile
from fastapi.responses import JSONResponse, Response
from PIL import Image, UnidentifiedImageError

MAX_BYTES = 15 * 1024 * 1024
MAX_SIDE = 2048  # downscale huge phone photos first; the model works at 512x384 anyway


def create_app(get_model) -> FastAPI:
    """get_model() returns a loaded infer.TryOn (called per request, so it can be lazy)."""
    app = FastAPI(title="Tryvelle try-on model", docs_url=None, redoc_url=None)
    lock = threading.Lock()  # one GPU job at a time
    secret = os.environ.get("TRYON_SECRET", "")

    def fail(code, msg):
        return JSONResponse({"detail": msg}, status_code=code)

    async def read_image(f: UploadFile):
        data = await f.read(MAX_BYTES + 1)
        if not data or len(data) > MAX_BYTES:
            return None, fail(413, f"{f.filename or 'file'} missing or larger than 15 MB")
        try:
            img = Image.open(io.BytesIO(data))
            img.load()
            return img, None
        except (UnidentifiedImageError, OSError):
            return None, fail(415, "not an image")

    @app.get("/health")
    def health():
        return {"ok": True}

    @app.post("/tryon")
    async def tryon(person: UploadFile = File(...), garment: UploadFile = File(...),
                    x_tryon_secret: str | None = Header(default=None)):
        if secret and not hmac.compare_digest(x_tryon_secret or "", secret):
            return fail(401, "bad secret")
        p, err = await read_image(person)
        if err:
            return err
        g, err = await read_image(garment)
        if err:
            return err
        p.thumbnail((MAX_SIDE, MAX_SIDE))
        try:
            with lock:
                result, _ = get_model().run(p, g)
        except SystemExit as e:  # infer.auto_mask: no person detected
            return fail(422, str(e))
        buf = io.BytesIO()
        result.save(buf, "JPEG", quality=92)
        return Response(buf.getvalue(), media_type="image/jpeg")

    return app
