"""Supplier catalog import: CSV upsert + automatic anchor measurement.

Usage from backend/:  python scripts/import_catalog.py [path/to/catalog.csv]

- Upserts categories/products/colors/variants (price/stock refreshed).
- Display photos: every image in the product folder EXCEPT the overlay file.
- Overlay PNG: alpha-mask shoulder scan measures draft anchors (wearer anatomy),
  symmetry/framing warnings printed per product. Assets are created published
  so try-on works immediately; confirm visually, refine via admin PATCH.
- Missing folders/files are warnings, never errors. Idempotent: safe to re-run.

CSV columns: slug,title,category,description,color_name,hex,sizes,price_minor,
stock_per_size,folder,overlay  (sizes like S|M|L, folders under STORAGE_LOCAL_DIR)
"""
import csv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from PIL import Image  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.models.models import (  # noqa: E402
    Category, Product, ProductColor, ProductImage, ProductVariant, TryOnAsset,
)

IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".webp")


def measure_anchors(path: str) -> tuple[dict, list[str]]:
    """Alpha-mask shoulder scan. Returns (anchors, warnings)."""
    warnings: list[str] = []
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    a = im.split()[-1]
    px = a.load()
    cols = [[x for x in range(w) if px[x, y] >= 128] for y in range(h)]
    spans = [(max(r) - min(r)) if r else 0 for r in cols]
    opaque = sum(1 for s in spans for _ in [s] if s)  # rows with content
    if opaque == 0:
        return {}, ["fully transparent image"]
    mx = max(spans)
    row = next(y for y, s in enumerate(spans) if s > 0.4 * mx)
    xs = cols[row]
    left, right = min(xs) / w, max(xs) / w
    y = row / h
    half = w // 2
    left_n = sum(1 for yy in range(h) for x in range(half) if px[x, yy] >= 128)
    right_n = sum(1 for yy in range(h) for x in range(half, w) if px[x, yy] >= 128)
    total = left_n + right_n
    if total and abs(left_n - right_n) / total > 0.08:
        warnings.append(f"asymmetric framing ({100 * left_n / total:.0f}/{100 * right_n / total:.0f}) — check tilt")
    if y > 0.25:
        warnings.append(f"shoulders low in frame ({y:.0%}) — crop headroom")
    if right - left < 0.15:
        warnings.append("narrow shoulder span — check crop")
    anchors = {"left_shoulder": {"x": round(right, 2), "y": round(y, 2)},
               "right_shoulder": {"x": round(left, 2), "y": round(y, 2)},
               "hem_center": {"x": 0.50, "y": 0.90}}
    return anchors, warnings


def import_catalog(csv_path: str, media_root: str | None = None, session_factory=None) -> dict:
    settings = get_settings()
    root = media_root or settings.STORAGE_LOCAL_DIR
    Session = session_factory or SessionLocal
    report = {"products": 0, "variants": 0, "photos": 0, "assets": 0, "warnings": []}
    with Session() as db:
        with open(csv_path, newline="", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        # Size chart reuse: first available chart, if any.
        from app.models.models import SizeChart
        chart = db.query(SizeChart).first()
        chart_id = chart.id if chart else None
        for r in rows:
            slug = r["slug"].strip()
            folder = os.path.join(root, r["folder"].strip())
            cat = db.query(Category).filter_by(slug=r["category"].strip().lower()).one_or_none()
            if cat is None:
                cat = Category(name=r["category"].strip(), slug=r["category"].strip().lower())
                db.add(cat)
                db.flush()
            prod = db.query(Product).filter_by(slug=slug).one_or_none()
            if prod is None:
                prod = Product(category_id=cat.id, slug=slug, title=r["title"].strip(),
                               description=r["description"].strip(), status="published",
                               currency="INR", size_chart_id=chart_id)
                db.add(prod)
                db.flush()
                report["products"] += 1
            else:
                prod.title, prod.category_id = r["title"].strip(), cat.id
            color = db.query(ProductColor).filter_by(product_id=prod.id, name=r["color_name"].strip()).one_or_none()
            if color is None:
                color = ProductColor(product_id=prod.id, name=r["color_name"].strip(), hex=r["hex"].strip())
                db.add(color)
                db.flush()
            for size_label in r["sizes"].split("|"):
                size_label = size_label.strip()
                sku = f"supplier-{slug}-{r['color_name'].strip()}-{size_label}".lower()
                # Check by product_color_id + size_label (unique constraint), not SKU
                existing_var = db.query(ProductVariant).filter_by(product_color_id=color.id, size_label=size_label).one_or_none()
                if existing_var is None:
                    db.add(ProductVariant(product_color_id=color.id, sku=sku, size_label=size_label,
                                          price_minor=int(r["price_minor"]),
                                          stock_quantity=int(r["stock_per_size"]), active=True))
                    report["variants"] += 1
                else:
                    existing_var.price_minor = int(r["price_minor"])
                    existing_var.stock_quantity = int(r["stock_per_size"])
                    existing_var.active = True
            overlay = r["overlay"].strip()
            overlay_path = os.path.join(folder, overlay)
            if overlay and os.path.isfile(overlay_path):
                anchors, warnings = measure_anchors(overlay_path)
                for w in warnings:
                    report["warnings"].append(f"{slug}: {w}")
                asset = db.query(TryOnAsset).filter_by(product_color_id=color.id).one_or_none()
                key = os.path.relpath(overlay_path, root).replace(os.sep, "/")
                im = Image.open(overlay_path)
                if asset is None:
                    db.add(TryOnAsset(product_color_id=color.id, asset_key=key,
                                      width=im.width, height=im.height, anchor_json=anchors,
                                      calibration_json={"scale_multiplier": 1.0, "offset_x": 0.0, "offset_y": 0.0},
                                      schema_version=1, version=1, status="published"))
                    report["assets"] += 1
                else:
                    asset.asset_key, asset.anchor_json = key, anchors
            elif overlay:
                report["warnings"].append(f"{slug}: overlay missing ({overlay}) — no try-on asset")
            if os.path.isdir(folder):
                order = 0
                for fname in sorted(os.listdir(folder)):
                    if not fname.lower().endswith(IMAGE_EXTS) or fname == overlay:
                        continue
                    key = os.path.relpath(os.path.join(folder, fname), root).replace(os.sep, "/")
                    if db.query(ProductImage).filter_by(product_id=prod.id, asset_key=key).one_or_none() is None:
                        db.add(ProductImage(product_id=prod.id, product_color_id=None, asset_key=key,
                                            alt_text=f"{r['title'].strip()} (photo: owner-supplied)",
                                            sort_order=order))
                        report["photos"] += 1
                    order += 1
            else:
                report["warnings"].append(f"{slug}: folder missing ({r['folder'].strip()}) — no photos")
        db.commit()
    return report


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "supplier_catalog.csv")
    print(import_catalog(path))
