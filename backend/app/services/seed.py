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

# Licensed catalog photos (Unsplash License: free commercial use, no attribution
# required — https://unsplash.com/license). Served from local /media (no hotlink).
# Prices/stock/sizes remain SAMPLE supplier placeholders.
PHOTOS = {
    "everyday-cotton-tee": "sample/everyday-cotton-tee.jpg",
    "washed-linen-tee": "sample/washed-linen-tee.jpg",
    "structured-boxy-overshirt": "sample/structured-boxy-overshirt.jpg",
    "heavyweight-relaxed-crewneck": "sample/heavyweight-relaxed-crewneck.jpg",
    "pleated-twill-trouser": "sample/pleated-twill-trouser.jpg",
}

# One SAMPLE published asset so try-on availability is demonstrable end to end.
# Illustrative anchors — replace with calibrated per-asset metadata before release.
PUBLISHED_SAMPLE_ASSET = ("everyday-cotton-tee", "Cream")

# Owner-supplied garment PNGs (all rights with the owner; do not redistribute).
# 1000x1000 RGBA, verified symmetric straight-on framing. Anchors were MEASURED
# from each file's alpha mask (shoulder-line scan) and refer to WEARER anatomy
# (left_shoulder = wearer's left = image-right). Draft values — confirm visually
# in try-on; refine via PATCH /admin/try-on-assets.
KURTI_PRODUCTS = [
    {"slug": "blue-full-sleeve-kurti", "title": "Blue Full-Sleeve Kurti",
     "color": ("Blue", "#2B4C9B"), "file": "sample/blue-full-sleeve-kurti.png",
     "anchors": {"left_shoulder": {"x": 0.63, "y": 0.13}, "right_shoulder": {"x": 0.37, "y": 0.13},
                 "hem_center": {"x": 0.50, "y": 0.90}}},
    {"slug": "blue-sleeveless-kurti", "title": "Blue Sleeveless Kurti",
     "color": ("Blue", "#2B4C9B"), "file": "sample/blue-sleeveless-kurti.png",
     "anchors": {"left_shoulder": {"x": 0.61, "y": 0.11}, "right_shoulder": {"x": 0.41, "y": 0.11},
                 "hem_center": {"x": 0.50, "y": 0.90}}},
    {"slug": "green-checked-full-sleeve-kurti", "title": "Green Checked Full-Sleeve Kurti",
     "color": ("Green Checks", "#3F6B4F"), "file": "sample/green-checked-full-sleeve-kurti.png",
     "anchors": {"left_shoulder": {"x": 0.64, "y": 0.13}, "right_shoulder": {"x": 0.36, "y": 0.13},
                 "hem_center": {"x": 0.50, "y": 0.90}}},
    {"slug": "purple-full-sleeve-kurti", "title": "Purple Full-Sleeve Kurti",
     "color": ("Purple", "#6B3FA0"), "file": "sample/purple-full-sleeve-kurti.png",
     "anchors": {"left_shoulder": {"x": 0.64, "y": 0.11}, "right_shoulder": {"x": 0.36, "y": 0.11},
                 "hem_center": {"x": 0.50, "y": 0.90}}},
    {"slug": "white-full-sleeve-kurti", "title": "White Full-Sleeve Kurti",
     "color": ("White", "#F5F2EA"), "file": "sample/white-full-sleeve-kurti.png",
     "anchors": {"left_shoulder": {"x": 0.63, "y": 0.14}, "right_shoulder": {"x": 0.37, "y": 0.14},
                 "hem_center": {"x": 0.50, "y": 0.90}}},
]

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
                        published = (p["slug"], color_name) == PUBLISHED_SAMPLE_ASSET
                        db.add(TryOnAsset(
                            product_color_id=color.id, asset_key=f"{SAMPLE_TAG}/{p['slug']}/{color_name}.png",
                            width=1024, height=1024, anchor_json=SAMPLE_ANCHORS,
                            calibration_json=SAMPLE_CALIBRATION,
                            schema_version=1, version=1,
                            status="published" if published else "draft"))
                if db.query(ProductImage).filter_by(product_id=prod.id).count() == 0:
                    db.add(ProductImage(product_id=prod.id, product_color_id=None,
                                         asset_key=PHOTOS.get(p["slug"], f"{SAMPLE_TAG}/{p['slug']}/front.jpg"),
                                         alt_text=f"{p['title']} (photo: Unsplash, free commercial use)", sort_order=0))
    kurtis = db.query(Category).filter_by(slug="kurtis").one_or_none()
    if kurtis is None:
        kurtis = Category(name="Kurtis", slug="kurtis")
        db.add(kurtis)
        db.flush()
        counts["categories"] += 1
    for k in KURTI_PRODUCTS:
        prod = db.query(Product).filter_by(slug=k["slug"]).one_or_none()
        if prod is None:
            prod = Product(category_id=kurtis.id, slug=k["slug"], title=k["title"],
                           description="SAMPLE: owner-supplied kurti. Prices/stock are placeholders.",
                           status="published", currency="INR", size_chart_id=chart.id)
            db.add(prod)
            db.flush()
            counts["products"] += 1
        color_name, hex_ = k["color"]
        color = db.query(ProductColor).filter_by(product_id=prod.id, name=color_name).one_or_none()
        if color is None:
            color = ProductColor(product_id=prod.id, name=color_name, hex=hex_)
            db.add(color)
            db.flush()
        for size_label in ("S", "M", "L"):
            sku = f"owner-{k['slug']}-{color_name}-{size_label}".lower()
            if db.query(ProductVariant).filter_by(sku=sku).one_or_none() is None:
                db.add(ProductVariant(product_color_id=color.id, sku=sku, size_label=size_label,
                                      price_minor=199900, stock_quantity=8, active=True))
                counts["variants"] += 1
        if db.query(TryOnAsset).filter_by(product_color_id=color.id).one_or_none() is None:
            db.add(TryOnAsset(product_color_id=color.id, asset_key=k["file"],
                              width=1000, height=1000, anchor_json=k["anchors"],
                              calibration_json=SAMPLE_CALIBRATION,
                              schema_version=1, version=1, status="published"))
        if db.query(ProductImage).filter_by(product_id=prod.id).count() == 0:
            db.add(ProductImage(product_id=prod.id, product_color_id=None, asset_key=k["file"],
                                alt_text=f"{k['title']} (photo: owner-supplied)", sort_order=0))
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
