"""Import script tests: anchor measurement + idempotent CSV import on throwaway DB."""
import csv
import os
import sys

import pytest  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts"))

from app.models.models import Base, Product  # noqa: E402
from import_catalog import import_catalog, measure_anchors  # noqa: E402


def garment_png(path):
    im = Image.new("RGBA", (1000, 1000), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle([360, 130, 640, 900], fill=(40, 60, 150, 255))  # symmetric torso
    im.save(path)


def test_measure_anchors():
    os.makedirs("/tmp/garment-test", exist_ok=True)
    garment_png("/tmp/garment-test/g.png")
    anchors, warnings = measure_anchors("/tmp/garment-test/g.png")
    assert warnings == []
    assert anchors["left_shoulder"] == {"x": 0.64, "y": 0.13}
    assert anchors["right_shoulder"] == {"x": 0.36, "y": 0.13}


def test_import_idempotent(tmp_path):
    media = tmp_path / "media"
    (media / "Test Shirt").mkdir(parents=True)
    garment_png(str(media / "Test Shirt" / "test-shirt-png.png"))
    Image.new("RGB", (800, 1000), (200, 200, 200)).save(str(media / "Test Shirt" / "front.jpg"))
    csv_path = tmp_path / "cat.csv"
    with open(csv_path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["slug", "title", "category", "description", "color_name", "hex", "sizes",
                    "price_minor", "stock_per_size", "folder", "overlay"])
        w.writerow(["test-shirt", "Test Shirt", "Shirts", "d", "White", "#FFFFFF", "S|M",
                    "99900", "5", "Test Shirt", "test-shirt-png.png"])
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    first = import_catalog(str(csv_path), media_root=str(media), session_factory=factory)
    assert (first["products"], first["variants"], first["photos"], first["assets"]) == (1, 2, 1, 1)
    second = import_catalog(str(csv_path), media_root=str(media), session_factory=factory)
    assert (second["products"], second["variants"], second["photos"], second["assets"]) == (0, 0, 0, 0)
    with factory() as s:
        assert s.query(Product).filter_by(slug="test-shirt").one().title == "Test Shirt"
