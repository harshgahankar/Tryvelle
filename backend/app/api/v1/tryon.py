"""Photo try-on: the shopper uploads (or snaps) a photo, we run the garment's
published try-on asset through the local mini-CatVTON service (ml/serve.py)
and return the generated image. The photo is never stored."""
import uuid
from pathlib import Path, PurePosixPath

import httpx
from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.errors import error
from app.core.config import get_settings
from app.db import get_db
from app.models.models import Product, ProductColor, ProductImage, TryOnAsset

router = APIRouter()

MAX_BYTES = 15 * 1024 * 1024
ALLOWED = {"image/jpeg", "image/png", "image/webp"}


def flat_garment_key(db: Session, product_id) -> str | None:
    """A flat garment image dropped next to the product's photos, named like
    `<anything>-png.png` (e.g. media/sample/Maroon Party Shirt/maroon-party-shirt-png.png).
    Lets owners enable photo try-on by adding one file — no DB change needed."""
    img = (db.query(ProductImage).filter_by(product_id=product_id)
           .order_by(ProductImage.sort_order).first())
    if img is None or img.asset_key.startswith("http"):
        return None
    folder = PurePosixPath(img.asset_key).parent
    media = Path(get_settings().STORAGE_LOCAL_DIR)
    found = sorted((media / folder).glob("*-png.png")) if (media / folder).is_dir() else []
    return str(folder / found[0].name) if found else None


@router.post("/products/{product_id}/try-on-photo")
async def try_on_photo(
    product_id: str,
    photo: UploadFile = File(...),
    color_id: str | None = Form(None),
    db: Session = Depends(get_db),
):
    try:
        pid = uuid.UUID(product_id)
        cid = uuid.UUID(color_id) if color_id else None
    except ValueError:
        return error("INVALID_ID", "Product and colour ids must be UUIDs.", 400)
    if db.query(Product).filter_by(id=pid).one_or_none() is None:
        return error("NOT_FOUND", "Product not found.", 404)

    q = (db.query(TryOnAsset).join(ProductColor, TryOnAsset.product_color_id == ProductColor.id)
         .filter(ProductColor.product_id == pid, TryOnAsset.status == "published"))
    if cid:
        q = q.filter(ProductColor.id == cid)
    asset = q.first()
    garment_key = asset.asset_key if asset and not asset.asset_key.startswith("http") else flat_garment_key(db, pid)
    if garment_key is None:
        return error("TRY_ON_UNAVAILABLE", "Photo try-on isn't available for this garment yet "
                     "(no flat garment image).", 404)

    if photo.content_type not in ALLOWED:
        return error("UNSUPPORTED_PHOTO", "Upload a JPEG, PNG or WebP photo.", 415)
    data = await photo.read(MAX_BYTES + 1)
    if not data:
        return error("UNSUPPORTED_PHOTO", "The photo is empty.", 400)
    if len(data) > MAX_BYTES:
        return error("PHOTO_TOO_LARGE", "Photos must be under 15 MB.", 413)

    url = get_settings().TRYON_MODEL_URL.rstrip("/") + "/tryon"
    try:
        async with httpx.AsyncClient(timeout=300) as client:
            r = await client.post(url, params={"garment": garment_key}, content=data)
    except httpx.HTTPError:
        return error("TRY_ON_OFFLINE", "The try-on model isn't running. Start ml/serve.py and retry.", 503)
    if r.status_code == 422:
        return error("NO_PERSON", "We couldn't find a person in that photo. Use a front-facing photo "
                     "with your shoulders and hips visible.", 422)
    if r.status_code != 200:
        return error("TRY_ON_FAILED", f"The try-on model failed ({r.text[:120]}).", 502)
    return Response(r.content, media_type=r.headers.get("content-type", "image/jpeg"),
                    headers={"Cache-Control": "no-store"})
