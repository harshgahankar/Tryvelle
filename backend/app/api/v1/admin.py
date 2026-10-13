"""Admin catalog control. All routes require the admin role (server-enforced)."""
import io
import uuid

from fastapi import APIRouter, Cookie, Depends, File, Form, Header, UploadFile
from PIL import Image, UnidentifiedImageError
from sqlalchemy.orm import Session, joinedload

from app.api.errors import error
from app.core.deps import check_csrf, get_current_user, require_admin
from app.db import get_db
from app.models.models import (
    AdminAuditEvent, Category, Product, ProductColor, ProductImage,
    ProductVariant, StockMovement, TryOnAsset,
)
from app.schemas.admin import (
    AssetMeta, ColorCreate, ProductCreate, ProductPatch, StockAdjust,
    VariantCreate, VariantPatch,
)
from app.storage import store_local

router = APIRouter()
MAX_BYTES = 5 * 1024 * 1024


def admin(user):
    err = require_admin(user)
    if isinstance(err, dict):
        return error(err["code"], err["message"], err["status"])
    return None


def csrf(db: Session, session: str | None, token: str | None):
    err = check_csrf(db, session or "", token)
    if err:
        return error(err["code"], err["message"], err["status"])
    return None


def audit(db: Session, actor_id, entity_type: str, entity_id: str, action: str) -> None:
    db.add(AdminAuditEvent(actor_id=actor_id, entity_type=entity_type,
                           entity_id=str(entity_id), action=action))


def decode_image(data: bytes):
    """Returns (Image, format). Rejects unsafe/undecodable content."""
    try:
        img = Image.open(io.BytesIO(data))
        img.verify()
        img = Image.open(io.BytesIO(data))
        img.load()
        return img, (img.format or "").upper()
    except (UnidentifiedImageError, OSError, ValueError):
        return None, ""


def validate_anchors(anchors: dict, calibration: dict) -> str | None:
    try:
        pts = [anchors[k] for k in ("left_shoulder", "right_shoulder", "hem_center")]
        if not all(isinstance(p, dict) and 0 <= p["x"] <= 1 and 0 <= p["y"] <= 1
                   and all(isinstance(v, (int, float)) for v in (p["x"], p["y"])) for p in pts):
            return "Anchors must be normalized {x,y} in [0,1]."
        l, r = anchors["left_shoulder"], anchors["right_shoulder"]
        import math
        span = math.hypot(r["x"] - l["x"], r["y"] - l["y"])
        if not span > 0.01:
            return "Shoulder span must be nonzero."
        if not (isinstance(calibration.get("scale_multiplier"), (int, float))
                and calibration["scale_multiplier"] > 0):
            return "calibration.scale_multiplier must be positive."
        return None
    except (KeyError, TypeError):
        return "anchors need left_shoulder/right_shoulder/hem_center; calibration need scale_multiplier."


@router.get("/admin/products")
def admin_list_products(q: str | None = None, status: str | None = None,
                        db: Session = Depends(get_db), user=Depends(get_current_user)):
    err = admin(user)
    if err:
        return err
    query = db.query(Product).options(joinedload(Product.category))
    if q:
        query = query.filter(Product.title.ilike(f"%{q}%"))
    if status:
        query = query.filter(Product.status == status)
    items = [{"id": p.id, "slug": p.slug, "title": p.title, "status": p.status,
              "category": p.category.slug if p.category else None} for p in query.all()]
    return {"items": items, "total": len(items)}


@router.post("/admin/products", status_code=201)
def admin_create_product(body: ProductCreate, db: Session = Depends(get_db),
                         session: str | None = Cookie(default=None),
                         x_csrf_token: str | None = Header(default=None),
                         user=Depends(get_current_user)):
    err = admin(user) or csrf(db, session, x_csrf_token)
    if err:
        return err
    cat = db.query(Category).filter_by(slug=body.category_slug).one_or_none()
    if cat is None:
        return error("UNKNOWN_CATEGORY", "Category slug not found.", 400)
    if db.query(Product).filter_by(slug=body.slug).one_or_none():
        return error("SLUG_TAKEN", "Product slug already exists.", 409)
    p = Product(category_id=cat.id, slug=body.slug, title=body.title,
                description=body.description, status="draft", size_chart_id=body.size_chart_id)
    db.add(p)
    db.commit()
    audit(db, user.id, "product", p.id, "create")
    db.commit()
    return {"id": p.id, "slug": p.slug, "status": p.status}


@router.patch("/admin/products/{product_id}")
def admin_patch_product(product_id: str, body: ProductPatch, db: Session = Depends(get_db),
                        session: str | None = Cookie(default=None),
                        x_csrf_token: str | None = Header(default=None),
                        user=Depends(get_current_user)):
    err = admin(user) or csrf(db, session, x_csrf_token)
    if err:
        return err
    try:
        pid = uuid.UUID(product_id)
    except ValueError:
        return error("INVALID_ID", "Product id must be a UUID.", 400)
    p = db.query(Product).filter_by(id=pid).one_or_none()
    if p is None:
        return error("NOT_FOUND", "Product not found.", 404)
    if body.title is not None:
        p.title = body.title
    if body.description is not None:
        p.description = body.description
    if body.category_slug is not None:
        cat = db.query(Category).filter_by(slug=body.category_slug).one_or_none()
        if cat is None:
            return error("UNKNOWN_CATEGORY", "Category slug not found.", 400)
        p.category_id = cat.id
    if body.size_chart_id is not None:
        p.size_chart_id = body.size_chart_id
    if body.status is not None:
        if body.status == "published":
            has_variant = (db.query(ProductVariant).join(ProductColor)
                           .filter(ProductColor.product_id == pid, ProductVariant.active).count() > 0)
            if not has_variant:
                return error("UNPUBLISHABLE", "Publishing needs at least one active variant.", 409)
        p.status = body.status
        audit(db, user.id, "product", pid, f"status->{body.status}")
    db.commit()
    return {"id": p.id, "status": p.status}


@router.post("/admin/products/{product_id}/colors", status_code=201)
def admin_create_color(product_id: str, body: ColorCreate, db: Session = Depends(get_db),
                       session: str | None = Cookie(default=None),
                       x_csrf_token: str | None = Header(default=None),
                       user=Depends(get_current_user)):
    err = admin(user) or csrf(db, session, x_csrf_token)
    if err:
        return err
    try:
        pid = uuid.UUID(product_id)
    except ValueError:
        return error("INVALID_ID", "Product id must be a UUID.", 400)
    if db.query(Product).filter_by(id=pid).one_or_none() is None:
        return error("NOT_FOUND", "Product not found.", 404)
    if db.query(ProductColor).filter_by(product_id=pid, name=body.name).one_or_none():
        return error("COLOR_TAKEN", "Color name already exists for this product.", 409)
    c = ProductColor(product_id=pid, name=body.name, hex=body.hex)
    db.add(c)
    db.commit()
    return {"color_id": c.id, "name": c.name}


@router.post("/admin/colors/{color_id}/variants", status_code=201)
def admin_create_variant(color_id: str, body: VariantCreate, db: Session = Depends(get_db),
                         session: str | None = Cookie(default=None),
                         x_csrf_token: str | None = Header(default=None),
                         user=Depends(get_current_user)):
    err = admin(user) or csrf(db, session, x_csrf_token)
    if err:
        return err
    try:
        cid = uuid.UUID(color_id)
    except ValueError:
        return error("INVALID_ID", "Color id must be a UUID.", 400)
    if db.query(ProductColor).filter_by(id=cid).one_or_none() is None:
        return error("NOT_FOUND", "Color not found.", 404)
    if db.query(ProductVariant).filter_by(sku=body.sku).one_or_none():
        return error("SKU_TAKEN", "SKU already exists.", 409)
    v = ProductVariant(product_color_id=cid, sku=body.sku, size_label=body.size_label,
                       price_minor=body.price_minor, stock_quantity=body.stock_quantity, active=True)
    db.add(v)
    db.commit()
    return {"variant_id": v.id, "sku": v.sku}


@router.patch("/admin/variants/{variant_id}")
def admin_patch_variant(variant_id: str, body: VariantPatch, db: Session = Depends(get_db),
                        session: str | None = Cookie(default=None),
                        x_csrf_token: str | None = Header(default=None),
                        user=Depends(get_current_user)):
    err = admin(user) or csrf(db, session, x_csrf_token)
    if err:
        return err
    try:
        vid = uuid.UUID(variant_id)
    except ValueError:
        return error("INVALID_ID", "Variant id must be a UUID.", 400)
    v = db.query(ProductVariant).filter_by(id=vid).one_or_none()
    if v is None:
        return error("NOT_FOUND", "Variant not found.", 404)
    if body.price_minor is not None:
        v.price_minor = body.price_minor
    if body.active is not None:
        v.active = body.active
    db.commit()
    return {"variant_id": v.id, "price_minor": v.price_minor, "active": v.active}


@router.post("/admin/variants/{variant_id}/stock-adjustments")
def admin_adjust_stock(variant_id: str, body: StockAdjust, db: Session = Depends(get_db),
                       session: str | None = Cookie(default=None),
                       x_csrf_token: str | None = Header(default=None),
                       user=Depends(get_current_user)):
    err = admin(user) or csrf(db, session, x_csrf_token)
    if err:
        return err
    try:
        vid = uuid.UUID(variant_id)
    except ValueError:
        return error("INVALID_ID", "Variant id must be a UUID.", 400)
    v = db.query(ProductVariant).filter_by(id=vid).with_for_update().one_or_none()
    if v is None:
        return error("NOT_FOUND", "Variant not found.", 404)
    if v.stock_quantity + body.delta < 0:
        return error("NEGATIVE_STOCK", "Adjustment would make stock negative.", 409,
                     {"stock_quantity": "Increase delta or add stock first."})
    v.stock_quantity += body.delta
    db.add(StockMovement(variant_id=vid, quantity_delta=body.delta, reason=body.reason))
    audit(db, user.id, "variant", vid, f"stock{body.delta:+d}")
    db.commit()
    return {"variant_id": v.id, "stock_quantity": v.stock_quantity}


@router.post("/admin/products/{product_id}/images", status_code=201)
async def admin_upload_image(product_id: str, file: UploadFile = File(...),
                             alt_text: str = Form(default=""),
                             db: Session = Depends(get_db),
                             session: str | None = Cookie(default=None),
                             x_csrf_token: str | None = Header(default=None),
                             user=Depends(get_current_user)):
    err = admin(user) or csrf(db, session, x_csrf_token)
    if err:
        return err
    try:
        pid = uuid.UUID(product_id)
    except ValueError:
        return error("INVALID_ID", "Product id must be a UUID.", 400)
    if db.query(Product).filter_by(id=pid).one_or_none() is None:
        return error("NOT_FOUND", "Product not found.", 404)
    data = await file.read()
    if len(data) > MAX_BYTES:
        return error("FILE_TOO_LARGE", "Image exceeds 5 MB.", 400)
    img, fmt = decode_image(data)
    if img is None or fmt not in ("PNG", "JPEG", "WEBP"):
        return error("INVALID_IMAGE", "Upload a PNG, JPEG or WEBP image.", 400)
    # Decode/re-encode stills to strip metadata; photos need no alpha.
    buf = io.BytesIO()
    img.convert("RGB").save(buf, "JPEG", quality=85)
    key = store_local(file.filename or "photo.jpg", buf.getvalue())
    rec = ProductImage(product_id=pid, asset_key=key, alt_text=alt_text[:255])
    db.add(rec)
    db.commit()
    return {"image_id": rec.id, "asset_key": key, "width": img.width, "height": img.height}


@router.post("/admin/colors/{color_id}/try-on-assets", status_code=201)
async def admin_upload_asset(color_id: str, file: UploadFile = File(...),
                             anchors: str = Form(...), calibration: str = Form(default="{}"),
                             db: Session = Depends(get_db),
                             session: str | None = Cookie(default=None),
                             x_csrf_token: str | None = Header(default=None),
                             user=Depends(get_current_user)):
    import json
    err = admin(user) or csrf(db, session, x_csrf_token)
    if err:
        return err
    try:
        cid = uuid.UUID(color_id)
    except ValueError:
        return error("INVALID_ID", "Color id must be a UUID.", 400)
    if db.query(ProductColor).filter_by(id=cid).one_or_none() is None:
        return error("NOT_FOUND", "Color not found.", 404)
    try:
        anchors_d, calibration_d = json.loads(anchors), json.loads(calibration)
    except (ValueError, TypeError):
        return error("INVALID_METADATA", "anchors/calibration must be JSON.", 400)
    problem = validate_anchors(anchors_d, calibration_d)
    if problem:
        return error("UNCALIBRATED", problem, 400)
    data = await file.read()
    if len(data) > MAX_BYTES:
        return error("FILE_TOO_LARGE", "Image exceeds 5 MB.", 400)
    img, fmt = decode_image(data)
    if img is None or fmt != "PNG":
        return error("INVALID_IMAGE", "Try-on asset must be a transparent PNG.", 400)
    if img.mode not in ("RGBA", "LA", "PA") and "transparency" not in img.info:
        return error("NO_ALPHA", "Try-on PNG must contain an alpha channel.", 400)
    buf = io.BytesIO()
    img.save(buf, "PNG")  # re-encode to strip metadata, keep transparency
    key = store_local(file.filename or "garment.png", buf.getvalue())
    rec = TryOnAsset(product_color_id=cid, asset_key=key, width=img.width, height=img.height,
                     anchor_json=anchors_d, calibration_json=calibration_d,
                     schema_version=1, version=1, status="draft")
    db.add(rec)
    db.commit()
    return {"asset_id": rec.id, "status": rec.status}


@router.patch("/admin/try-on-assets/{asset_id}")
def admin_patch_asset(asset_id: str, body: AssetMeta, db: Session = Depends(get_db),
                      session: str | None = Cookie(default=None),
                      x_csrf_token: str | None = Header(default=None),
                      user=Depends(get_current_user),
                      publish: bool = False):
    err = admin(user) or csrf(db, session, x_csrf_token)
    if err:
        return err
    try:
        aid = uuid.UUID(asset_id)
    except ValueError:
        return error("INVALID_ID", "Asset id must be a UUID.", 400)
    rec = db.query(TryOnAsset).filter_by(id=aid).one_or_none()
    if rec is None:
        return error("NOT_FOUND", "Asset not found.", 404)
    problem = validate_anchors(body.anchors, body.calibration)
    if problem:
        return error("UNCALIBRATED", problem, 400)
    rec.anchor_json = body.anchors
    rec.calibration_json = body.calibration
    if publish:
        # Invalid assets can never publish; one published asset per color.
        rec.status = "validated"
        others = db.query(TryOnAsset).filter(
            TryOnAsset.product_color_id == rec.product_color_id,
            TryOnAsset.id != rec.id, TryOnAsset.status == "published").all()
        for o in others:
            o.status = "validated"
        rec.status = "published"
        audit(db, user.id, "try_on_asset", aid, "publish")
    db.commit()
    return {"asset_id": rec.id, "status": rec.status}
