"""Sample seed. Every record here is clearly labeled sample — never supplier-verified.

Covers the asset-and-data-plan minimum: categories, products with colors and
size variants, size chart, and draft try-on asset metadata (illustrative
anchors; replace per asset before publishing anything).
Idempotent: safe to run repeatedly (upserts by slug/SKU).
"""
from app.core.security import hash_password
from app.models.models import (
    Category, Product, ProductColor, ProductImage, ProductVariant,
    SizeChart, SizeChartRow, TryOnAsset, User,
)

SAMPLE_TAG = "sample"

CATALOG = [
    {
        "category": ("Tops & Tees", "tops-tees"),
        "products": [
            {"slug": "everyday-cotton-tee", "title": "Everyday Cotton Tee",
             "description": "SAMPLE: single-knit combed 220 GSM tee.",
             "colors": [("Cream", "#F3EFE6"), ("Charcoal", "#2C2C2B")],
             "sizes": [("XS", 129900, 3), ("S", 129900, 10), ("M", 129900, 10), ("L", 129900, 10)],
             "try_on": True},
            {"slug": "washed-linen-tee", "title": "Washed Linen Tee",
             "description": "SAMPLE: pre-washed flax tee.",
             "colors": [("Oatmeal", "#DED6C7"), ("Black", "#181818")],
             "sizes": [("S", 149900, 8), ("M", 149900, 8), ("L", 149900, 5)],
             "try_on": True},
        ],
    },
    {
        "category": ("Relaxed Shirting", "relaxed-shirting"),
        "products": [
            {"slug": "structured-boxy-overshirt", "title": "Structured Boxy Overshirt",
             "description": "SAMPLE: heavy twill overshirt. No validated try-on asset.",
             "colors": [("Olive", "#525547"), ("Charcoal", "#2C2C2B")],
             "sizes": [("S", 249900, 6), ("M", 249900, 6), ("L", 249900, 4)],
             "try_on": False},
        ],
    },
    {
        "category": ("Lightweight Knitwear", "lightweight-knitwear"),
        "products": [
            {"slug": "heavyweight-relaxed-crewneck", "title": "Heavyweight Relaxed Crewneck",
             "description": "SAMPLE: brushed 380 GSM fleece.",
             "colors": [("Ecru", "#EAE7DC"), ("Burgundy", "#8D040F")],
             "sizes": [("S", 189900, 7), ("M", 189900, 7), ("L", 189900, 7)],
             "try_on": True},
        ],
    },
    {
        "category": ("Tailored Trousers", "tailored-trousers"),
        "products": [
            {"slug": "pleated-twill-trouser", "title": "Pleated Twill Trouser",
             "description": "SAMPLE: wide-pleat twill. Trousers unsupported in v1 try-on.",
             "colors": [("Charcoal", "#2C2C2B")],
             "sizes": [("S", 219900, 5), ("M", 219900, 5), ("L", 219900, 5)],
             "try_on": False},
        ],
    },
]

SIZE_CHART = {
    "name": "SAMPLE Unisex Tops (cm)",
    "unit": "cm",
    "measurement_definition": "SAMPLE: garment measured flat; chest = 2x half-chest. Replace with supplier chart.",
    "rows": [
        ("XS", 100, 66, 44), ("S", 104, 68, 45), ("M", 108, 70, 46),
        ("L", 112, 72, 47), ("XL", 116, 74, 48),
    ],
}

# Illustrative anchors only — must be replaced per asset version before publishing.
SAMPLE_ANCHORS = {
    "left_shoulder": {"x": 0.28, "y": 0.18},
    "right_shoulder": {"x": 0.72, "y": 0.18},
    "hem_center": {"x": 0.50, "y": 0.88},
}
SAMPLE_CALIBRATION = {"scale_multiplier": 1.0, "offset_x": 0.0, "offset_y": 0.0}


def seed_all(db) -> dict:
    counts = {"categories": 0, "products": 0, "variants": 0}
    chart = db.query(SizeChart).filter_by(name=SIZE_CHART["name"]).one_or_none()
    if chart is None:
        chart = SizeChart(name=SIZE_CHART["name"], unit=SIZE_CHART["unit"],
                          measurement_definition=SIZE_CHART["measurement_definition"])
        db.add(chart)
        db.flush()
        for label, chest, length, shoulder in SIZE_CHART["rows"]:
            db.add(SizeChartRow(size_chart_id=chart.id, size_label=label,
                               chest=chest, length=length, shoulder=shoulder))
    for group in CATALOG:
        name, slug = group["category"]
        cat = db.query(Category).filter_by(slug=slug).one_or_none()
        if cat is None:
            cat = Category(name=name, slug=slug)
            db.add(cat)
            db.flush()
            counts["categories"] += 1
        for p in group["products"]:
            prod = db.query(Product).filter_by(slug=p["slug"]).one_or_none()
            if prod is None:
                prod = Product(category_id=cat.id, slug=p["slug"], title=p["title"],
                               description=p["description"], status="published",
                               currency="INR", size_chart_id=chart.id)
                db.add(prod)
                db.flush()
                counts["products"] += 1
            for color_name, hex_ in p["colors"]:
                color = db.query(ProductColor).filter_by(product_id=prod.id, name=color_name).one_or_none()
                if color is None:
                    color = ProductColor(product_id=prod.id, name=color_name, hex=hex_)
                    db.add(color)
                    db.flush()
                for size_label, price_minor, stock in p["sizes"]:
                    sku = f"{SAMPLE_TAG}-{p['slug']}-{color_name}-{size_label}".lower()
                    var = db.query(ProductVariant).filter_by(sku=sku).one_or_none()
                    if var is None:
                        db.add(ProductVariant(product_color_id=color.id, sku=sku,
                                              size_label=size_label, price_minor=price_minor,
                                              stock_quantity=stock, active=True))
                        counts["variants"] += 1
                if p["try_on"]:
                    asset = db.query(TryOnAsset).filter_by(product_color_id=color.id).one_or_none()
                    if asset is None:
                        db.add(TryOnAsset(
                            product_color_id=color.id, asset_key=f"{SAMPLE_TAG}/{p['slug']}/{color_name}.png",
                            width=1024, height=1024, anchor_json=SAMPLE_ANCHORS,
                            calibration_json=SAMPLE_CALIBRATION,
                            schema_version=1, version=1, status="draft"))
                if db.query(ProductImage).filter_by(product_id=prod.id).count() == 0:
                    db.add(ProductImage(product_id=prod.id, product_color_id=None,
                                         asset_key=f"{SAMPLE_TAG}/{p['slug']}/front.jpg",
                                         alt_text=f"SAMPLE photo: {p['title']}", sort_order=0))
    db.commit()
    return counts


def create_admin(db, email: str, password: str) -> str:
    """Explicit setup command helper. Password comes from the environment only."""
    if not email or not password:
        raise ValueError("SETUP_ADMIN_EMAIL and SETUP_ADMIN_PASSWORD must both be set.")
    normalized = email.strip().lower()
    existing = db.query(User).filter_by(email_normalized=normalized).one_or_none()
    if existing is not None:
        return "exists"
    db.add(User(name="Store Admin", email_normalized=normalized,
                password_hash=hash_password(password), role="admin"))
    db.commit()
    return "created"
