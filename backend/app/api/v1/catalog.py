"""Public catalog endpoints per api-plan. Published products only."""
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from app.api.errors import error
from app.db import get_db
from app.models.models import (
    Category, Product, ProductColor, ProductImage, ProductVariant, TryOnAsset,
)
from app.schemas.catalog import (
    CategoryOut, ColorOut, Page, PhotoOut, ProductDetailOut, ProductListItem,
    SizeChartOut, SizeChartRowOut, TryOnAssetOut, VariantOut,
)

router = APIRouter()


def asset_url(key: str) -> str:
    return key if key.startswith("http") else f"/media/{key}"


def color_out(color: ProductColor, published: set) -> ColorOut:
    variants = [v for v in color.variants if v.active]
    return ColorOut(
        color_id=color.id, name=color.name, hex=color.hex,
        variants=[VariantOut(variant_id=v.id, size_label=v.size_label,
                             price_minor=v.price_minor, stock_quantity=v.stock_quantity)
                  for v in variants],
        try_on_available=color.id in published,
    )


def published_color_ids(db: Session) -> set:
    rows = db.query(TryOnAsset.product_color_id).filter(TryOnAsset.status == "published").all()
    return {r[0] for r in rows}


def product_photos(db: Session, product: Product) -> list[PhotoOut]:
    imgs = (db.query(ProductImage).filter_by(product_id=product.id)
            .order_by(ProductImage.sort_order).all())
    return [PhotoOut(url=asset_url(i.asset_key), alt_text=i.alt_text) for i in imgs]


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    cats = db.query(Category).order_by(Category.name).all()
    items = [CategoryOut(id=c.id, name=c.name, slug=c.slug) for c in cats]
    return {"items": items, "page": 1, "page_size": len(items), "total": len(items)}


@router.get("/products")
def list_products(
    q: str | None = None,
    category: str | None = None,
    min_price_minor: int | None = Query(default=None, ge=0),
    max_price_minor: int | None = Query(default=None, ge=0),
    color: str | None = None,
    size: str | None = None,
    sort: str = Query(default="featured", pattern="^(featured|price_asc|price_desc)$"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = (db.query(Product).filter(Product.status == "published")
             .options(joinedload(Product.category),
                      joinedload(Product.colors).joinedload(ProductColor.variants)))
    if q:
        query = query.filter(Product.title.ilike(f"%{q}%"))
    if category:
        query = query.join(Category).filter(Category.slug == category)
    products = query.all()
    pub = published_color_ids(db)

    items = []
    for p in products:
        colors = [color_out(c, pub) for c in p.colors if any(v.active for v in c.variants)]
        if not colors:
            continue
        if color and not any(color.lower() in c.name.lower() for c in colors):
            continue
        if size and not any(v.size_label == size for c in colors for v in c.variants):
            continue
        prices = [v.price_minor for c in colors for v in c.variants]
        lo = min(prices)
        if min_price_minor is not None and lo < min_price_minor:
            continue
        if max_price_minor is not None and lo > max_price_minor:
            continue
        items.append(ProductListItem(
            id=p.id, slug=p.slug, title=p.title, currency=p.currency,
            category=CategoryOut(id=p.category.id, name=p.category.name, slug=p.category.slug),
            colors=colors, photos=product_photos(db, p), min_price_minor=lo,
            try_on_available=any(c.try_on_available for c in colors),
        ))
    if sort == "price_asc":
        items.sort(key=lambda i: i.min_price_minor)
    elif sort == "price_desc":
        items.sort(key=lambda i: -i.min_price_minor)
    total = len(items)
    return Page(items=items[(page - 1) * page_size:page * page_size],
                page=page, page_size=page_size, total=total)


@router.get("/products/{slug}")
def product_detail(slug: str, db: Session = Depends(get_db)):
    p = (db.query(Product).filter(Product.slug == slug, Product.status == "published")
         .options(joinedload(Product.category),
                  joinedload(Product.colors).joinedload(ProductColor.variants)).one_or_none())
    if p is None:
        return error("NOT_FOUND", "Product not found or unavailable.", 404)
    pub = published_color_ids(db)
    colors = [color_out(c, pub) for c in p.colors if any(v.active for v in c.variants)]
    chart = None
    if p.size_chart_id:
        from app.models.models import SizeChart
        ch = db.query(SizeChart).filter_by(id=p.size_chart_id).one_or_none()
        if ch:
            chart = SizeChartOut(name=ch.name, unit=ch.unit,
                                 measurement_definition=ch.measurement_definition,
                                 rows=[SizeChartRowOut(size_label=r.size_label, chest=r.chest,
                                                       length=r.length, shoulder=r.shoulder)
                                       for r in ch.rows])
    return ProductDetailOut(
        id=p.id, slug=p.slug, title=p.title, description=p.description,
        currency=p.currency,
        category=CategoryOut(id=p.category.id, name=p.category.name, slug=p.category.slug),
        size_chart=chart, colors=colors, photos=product_photos(db, p),
        try_on_available=any(c.try_on_available for c in colors),
    )


@router.get("/products/{product_id}/try-on-assets")
def product_try_on_assets(product_id: str, db: Session = Depends(get_db)):
    try:
        pid = uuid.UUID(product_id)
    except ValueError:
        return error("INVALID_ID", "Product id must be a UUID.", 400)
    if db.query(Product).filter_by(id=pid).one_or_none() is None:
        return error("NOT_FOUND", "Product not found.", 404)
    assets = (db.query(TryOnAsset, ProductColor)
              .join(ProductColor, TryOnAsset.product_color_id == ProductColor.id)
              .filter(ProductColor.product_id == pid, TryOnAsset.status == "published").all())
    return {"items": [TryOnAssetOut(
        color_id=c.id, color_name=c.name, asset_url=asset_url(a.asset_key),
        width=a.width, height=a.height, version=a.version,
        schema_version=a.schema_version, anchors=a.anchor_json,
        calibration=a.calibration_json) for a, c in assets]}
