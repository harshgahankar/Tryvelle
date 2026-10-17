"""Sample seed. Every record here is clearly labeled sample — never supplier-verified.

The catalog is the owner-supplied garment line: one product per folder under
media/sample/, with colors + size variants, a shared size chart, display photos
for every garment, and published try-on asset metadata for the five garments
that ship an overlay PNG.
Idempotent: safe to run repeatedly (upserts by slug/SKU).
"""
from app.core.security import hash_password
from app.models.models import (
    Category, Product, ProductColor, ProductImage, ProductVariant,
    SizeChart, SizeChartRow, TryOnAsset, User,
)

SAMPLE_TAG = "sample"

# Illustrative calibration only; per-asset values are refined via the admin API.
SAMPLE_CALIBRATION = {"scale_multiplier": 1.0, "offset_x": 0.0, "offset_y": 0.0}

# Owner-supplied garments (all rights with the owner; do not redistribute).
# Folders live under media/sample/. Each folder holds display photos (-01..-03);
# five garments also carry an overlay PNG (-png.png) for live try-on. Overlay
# PNGs are 1000x1000 RGBA with verified symmetric straight-on framing; anchors
# were MEASURED from each overlay's alpha mask (shoulder-line scan) and refer to
# WEARER anatomy (left_shoulder = wearer's left = image-right).
OWNER_PRODUCTS = [
    {
        "slug": "beige-linen-shirt", "title": "Beige Linen Shirt",
        "description": "SAMPLE: lightweight linen blend shirt. Owner-supplied.",
        "category": ("Shirts", "shirts"), "color": ("Beige", "#D9C7A3"),
        "sizes": [("S", 159900, 8), ("M", 159900, 8), ("L", 159900, 5)],
        "folder": "sample/Beige Linen Shirt",
        "photos": ["Beige-Linen-Shirt-01.png", "Beige-Linen-Shirt-02.png", "Beige-Linen-Shirt-03.png"],
    },
    {
        "slug": "black-denim-shirt", "title": "Black Denim Shirt",
        "description": "SAMPLE: washed black denim shirt. Owner-supplied.",
        "category": ("Shirts", "shirts"), "color": ("Black", "#1C1C1C"),
        "sizes": [("S", 169900, 8), ("M", 169900, 8), ("L", 169900, 5)],
        "folder": "sample/Black Denim Shirt",
        "photos": ["Black-Denim-Shirt-01.png", "Black-Denim-Shirt-02.png", "Black-Denim-Shirt-03.png"],
    },
    {
        "slug": "maroon-party-shirt", "title": "Maroon Party Shirt",
        "description": "SAMPLE: satin-finish party shirt. Owner-supplied.",
        "category": ("Shirts", "shirts"), "color": ("Maroon", "#6E1F2E"),
        "sizes": [("S", 179900, 7), ("M", 179900, 7), ("L", 179900, 4)],
        "folder": "sample/Maroon Party Shirt",
        "photos": ["Maroon-Party-Shirt-01.png", "Maroon-Party-Shirt-02.png", "Maroon-Party-Shirt-03.png"],
    },
    {
        "slug": "navy-formal-shirt", "title": "Navy Formal Shirt",
        "description": "SAMPLE: crisp formal shirt. Owner-supplied.",
        "category": ("Shirts", "shirts"), "color": ("Navy", "#1F2A44"),
        "sizes": [("S", 149900, 10), ("M", 149900, 10), ("L", 149900, 6)],
        "folder": "sample/Navi Formal Shirt",
        "photos": ["Navi-formal-shirt-01.png", "Navi-formal-shirt-02.png", "Navi-formal-shirt-03.png"],
    },
    {
        "slug": "olive-safari-shirt", "title": "Olive Safari Shirt",
        "description": "SAMPLE: utility safari shirt. Owner-supplied.",
        "category": ("Shirts", "shirts"), "color": ("Olive", "#4B5320"),
        "sizes": [("S", 189900, 6), ("M", 189900, 6), ("L", 189900, 4)],
        "folder": "sample/Olive Safari Shirt",
        "photos": ["Olive-Safari-Shirt-01.png", "Olive-Safari-Shirt-02.png", "Olive-Safari-Shirt-03.png"],
    },
    {
        "slug": "light-blue-casual-shirt", "title": "Light Blue Casual Shirt",
        "description": "SAMPLE: everyday brushed-cotton casual shirt. Owner-supplied.",
        "category": ("Shirts", "shirts"), "color": ("Light Blue", "#A9C6DE"),
        "sizes": [("S", 129900, 12), ("M", 129900, 12), ("L", 129900, 8)],
        "folder": "sample/Light Blue Casual Shirt", "overlay": "blue-full-sleeve-shirt-png.png",
        "photos": ["blue-full-sleeve-shirt-01.png", "blue-full-sleeve-shirt-02.png", "blue-full-sleeve-shirt-03.png"],
        "anchors": {"left_shoulder": {"x": 0.63, "y": 0.13}, "right_shoulder": {"x": 0.37, "y": 0.13},
                    "hem_center": {"x": 0.50, "y": 0.90}},
    },
    {
        "slug": "green-checked-shirt", "title": "Green Checked Full Sleeves Shirt",
        "description": "SAMPLE: yarn-dyed green checked shirt. Owner-supplied.",
        "category": ("Shirts", "shirts"), "color": ("Green Checks", "#3F6B4F"),
        "sizes": [("S", 139900, 11), ("M", 139900, 11), ("L", 139900, 6)],
        "folder": "sample/Green Checked Full Sleeves Shirt", "overlay": "green-checked-full-sleeve-shirt-png.png",
        "photos": ["green-checked-full-sleeve-shirt-01.png", "green-checked-full-sleeve-shirt-02.png",
                   "green-checked-full-sleeve-shirt-03.png"],
        "anchors": {"left_shoulder": {"x": 0.64, "y": 0.13}, "right_shoulder": {"x": 0.36, "y": 0.13},
                    "hem_center": {"x": 0.50, "y": 0.90}},
    },
    {
        "slug": "white-oxford-shirt", "title": "White Oxford Shirt",
        "description": "SAMPLE: breathable cotton oxford shirt. Owner-supplied.",
        "category": ("Shirts", "shirts"), "color": ("White", "#F5F2EA"),
        "sizes": [("S", 149900, 10), ("M", 149900, 10), ("L", 149900, 6)],
        "folder": "sample/White Oxford Shirt", "overlay": "white-full-sleeve-shirt-png.png",
        "photos": ["white-full-sleeve-shirt-01.png", "white-full-sleeve-shirt-02.png", "white-full-sleeve-shirt-03.png"],
        "anchors": {"left_shoulder": {"x": 0.63, "y": 0.14}, "right_shoulder": {"x": 0.37, "y": 0.14},
                    "hem_center": {"x": 0.50, "y": 0.90}},
    },
    {
        "slug": "blue-sleeveless-kurti", "title": "Blue sleeveless kurti",
        "description": "SAMPLE: summer sleeveless kurti. Owner-supplied.",
        "category": ("Kurtis", "kurtis"), "color": ("Blue", "#2B4C9B"),
        "sizes": [("S", 149900, 9), ("M", 149900, 9), ("L", 149900, 6)],
        "folder": "sample/Blue sleeveless kurti", "overlay": "blue-sleeveless-kurti-png.png",
        "photos": ["blue-sleeveless-kurti-01.png", "blue-sleeveless-kurti-02.png", "blue-sleeveless-kurti-03.png"],
        "anchors": {"left_shoulder": {"x": 0.61, "y": 0.11}, "right_shoulder": {"x": 0.41, "y": 0.11},
                    "hem_center": {"x": 0.50, "y": 0.90}},
    },
    {
        "slug": "purple-full-sleeve-kurti", "title": "Purple Full Sleeve Kurti",
        "description": "SAMPLE: elegant purple full-sleeve kurti. Owner-supplied.",
        "category": ("Kurtis", "kurtis"), "color": ("Purple", "#6B3FA0"),
        "sizes": [("S", 189900, 7), ("M", 189900, 7), ("L", 189900, 4)],
        "folder": "sample/Purple Full Sleeve Kurti", "overlay": "purple-full-sleeve-kurti-png.png",
        "photos": ["purple-full-sleeve-kurti-01.png", "purple-full-sleeve-kurti-02.png",
                   "purple-full-sleeve-kurti-03.png"],
        "anchors": {"left_shoulder": {"x": 0.64, "y": 0.11}, "right_shoulder": {"x": 0.36, "y": 0.11},
                    "hem_center": {"x": 0.50, "y": 0.90}},
    },
    {
        "slug": "beige-kaftan-kurti", "title": "Beige Kaftan Kurti",
        "description": "SAMPLE: relaxed kaftan-style kurti. Owner-supplied.",
        "category": ("Kurtis", "kurtis"), "color": ("Beige", "#D9C7A3"),
        "sizes": [("S", 199900, 7), ("M", 199900, 7), ("L", 199900, 5)],
        "folder": "sample/Beige Kaftan Kurti",
        "photos": ["Beige-Kaftan-Kurti-01.png", "Beige-Kaftan-Kurti-02.png"],
    },
    {
        "slug": "black-printed-kurti", "title": "Black Printed Kurti",
        "description": "SAMPLE: block-printed kurti. Owner-supplied.",
        "category": ("Kurtis", "kurtis"), "color": ("Black", "#1C1C1C"),
        "sizes": [("S", 179900, 8), ("M", 179900, 8), ("L", 179900, 5)],
        "folder": "sample/Black Printed Kurti",
        "photos": ["black-printed-kurti-01.png", "black-printed-kurti-02.png", "black-printed-kurti-03.png"],
    },
    {
        "slug": "coral-sleeveless-kurti", "title": "Coral Sleeveless Kurti",
        "description": "SAMPLE: summer sleeveless kurti. Owner-supplied.",
        "category": ("Kurtis", "kurtis"), "color": ("Coral", "#F0806A"),
        "sizes": [("S", 149900, 9), ("M", 149900, 9), ("L", 149900, 6)],
        "folder": "sample/Coral Sleeveless Kurti",
        "photos": ["Coral-sleeveless-Kurti-01.png", "Coral-sleeveless-Kurti-02.png", "Coral-sleeveless-Kurti-03.png"],
    },
    {
        "slug": "emerald-straight-kurti", "title": "Emerald Straight Kurti",
        "description": "SAMPLE: straight-cut kurti. Owner-supplied.",
        "category": ("Kurtis", "kurtis"), "color": ("Emerald", "#2E6B4F"),
        "sizes": [("S", 189900, 7), ("M", 189900, 7), ("L", 189900, 4)],
        "folder": "sample/Emerald Straight Kurti",
        "photos": ["Emerald-Straight-Kurti-01.png", "Emerald-Straight-Kurti-02.png", "Emerald-Straight-Kurti-03.png"],
    },
    {
        "slug": "indigo-denim-kurti", "title": "Indigo Denim Kurti",
        "description": "SAMPLE: denim-finish kurti. Owner-supplied.",
        "category": ("Kurtis", "kurtis"), "color": ("Indigo", "#3B3F63"),
        "sizes": [("S", 179900, 8), ("M", 179900, 8), ("L", 179900, 5)],
        "folder": "sample/Indigo Denim Kurti",
        "photos": ["Indigo-Denim-Kurti-01.png", "Indigo-Denim-Kurti-02.png", "Indigo-Denim-Kurti-03.png"],
    },
    {
        "slug": "lavender-chikankari-kurti", "title": "Lavender Chikankari Kurti",
        "description": "SAMPLE: chikankari embroidery kurti. Owner-supplied.",
        "category": ("Kurtis", "kurtis"), "color": ("Lavender", "#B7A6D9"),
        "sizes": [("S", 229900, 6), ("M", 229900, 6), ("L", 229900, 4)],
        "folder": "sample/Lavender Chikankari Kurti",
        "photos": ["Lavender-Chikankari-Kurti-01.png", "Lavender-Chikankari-Kurti-02.png",
                   "Lavender-Chikankari-Kurti-03.png"],
    },
    {
        "slug": "mustard-a-line-kurti", "title": "Mustard A-Line Kurti",
        "description": "SAMPLE: A-line flared kurti. Owner-supplied.",
        "category": ("Kurtis", "kurtis"), "color": ("Mustard", "#C9A227"),
        "sizes": [("S", 169900, 8), ("M", 169900, 8), ("L", 169900, 5)],
        "folder": "sample/Mustard A-Line Kurti",
        "photos": ["Mustard-A-Line-Kurti-01.png", "Mustard-A-Line-Kurti-02.png", "Mustard-A-Line-Kurti-03.png"],
    },
    {
        "slug": "peach-printed-kurti", "title": "Peach Printed Kurti",
        "description": "SAMPLE: floral printed kurti. Owner-supplied.",
        "category": ("Kurtis", "kurtis"), "color": ("Peach", "#F2B8A0"),
        "sizes": [("S", 169900, 8), ("M", 169900, 8), ("L", 169900, 5)],
        "folder": "sample/Peach Printed Kurti",
        "photos": ["Peach-Printed-Kurti-01.png", "Peach-Printed-Kurti-02.png", "Peach-Printed-Kurti-03.png"],
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
    for p in OWNER_PRODUCTS:
        cat_name, cat_slug = p["category"]
        cat = db.query(Category).filter_by(slug=cat_slug).one_or_none()
        if cat is None:
            cat = Category(name=cat_name, slug=cat_slug)
            db.add(cat)
            db.flush()
            counts["categories"] += 1
        prod = db.query(Product).filter_by(slug=p["slug"]).one_or_none()
        if prod is None:
            prod = Product(category_id=cat.id, slug=p["slug"], title=p["title"],
                           description=p["description"], status="published",
                           currency="INR", size_chart_id=chart.id)
            db.add(prod)
            db.flush()
            counts["products"] += 1
        else:
            prod.title, prod.category_id = p["title"], cat.id
        color_name, hex_ = p["color"]
        color = db.query(ProductColor).filter_by(product_id=prod.id, name=color_name).one_or_none()
        if color is None:
            color = ProductColor(product_id=prod.id, name=color_name, hex=hex_)
            db.add(color)
            db.flush()
        for size_label, price_minor, stock in p["sizes"]:
            sku = f"owner-{p['slug']}-{color_name}-{size_label}".lower()
            # Key on (color, size) — the unique constraint — not SKU, so imported
            # rows with a different SKU are reused instead of colliding.
            var = db.query(ProductVariant).filter_by(product_color_id=color.id,
                                                     size_label=size_label).one_or_none()
            if var is None:
                db.add(ProductVariant(product_color_id=color.id, sku=sku, size_label=size_label,
                                      price_minor=price_minor, stock_quantity=stock, active=True))
                counts["variants"] += 1
            else:
                var.price_minor, var.stock_quantity, var.active = price_minor, stock, True
        overlay = p.get("overlay")
        if overlay:
            key = f"{p['folder']}/{overlay}"
            asset = db.query(TryOnAsset).filter_by(product_color_id=color.id).one_or_none()
            if asset is None:
                db.add(TryOnAsset(product_color_id=color.id, asset_key=key,
                                  width=1000, height=1000, anchor_json=p["anchors"],
                                  calibration_json=SAMPLE_CALIBRATION,
                                  schema_version=1, version=1, status="published"))
            else:
                asset.asset_key, asset.anchor_json = key, p["anchors"]
        keep = set()
        for order, photo in enumerate(p["photos"]):
            key = f"{p['folder']}/{photo}"
            keep.add(key)
            if db.query(ProductImage).filter_by(product_id=prod.id, asset_key=key).one_or_none() is None:
                db.add(ProductImage(product_id=prod.id, product_color_id=None, asset_key=key,
                                    alt_text=f"{p['title']} (photo: owner-supplied)", sort_order=order))
        # Drop stale local photo rows (e.g. the previous flat layout); keep remote URLs.
        for stale in db.query(ProductImage).filter_by(product_id=prod.id).all():
            if not stale.asset_key.startswith("http") and stale.asset_key not in keep:
                db.delete(stale)
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
