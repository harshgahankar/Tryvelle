import uuid

from pydantic import BaseModel, field_validator


class ProductCreate(BaseModel):
    category_slug: str
    slug: str
    title: str
    description: str = ""
    size_chart_id: uuid.UUID | None = None


class ProductPatch(BaseModel):
    title: str | None = None
    description: str | None = None
    category_slug: str | None = None
    size_chart_id: uuid.UUID | None = None
    status: str | None = None

    @field_validator("status")
    @classmethod
    def status_ok(cls, v: str | None) -> str | None:
        if v is not None and v not in ("draft", "published", "archived"):
            raise ValueError("status must be draft/published/archived.")
        return v


class ColorCreate(BaseModel):
    name: str
    hex: str

    @field_validator("hex")
    @classmethod
    def hex_ok(cls, v: str) -> str:
        if not v.startswith("#") or len(v) not in (4, 7):
            raise ValueError("hex must look like #RGB or #RRGGBB.")
        return v


class VariantCreate(BaseModel):
    sku: str
    size_label: str
    price_minor: int
    stock_quantity: int = 0

    @field_validator("price_minor", "stock_quantity")
    @classmethod
    def nonneg(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Must be >= 0.")
        return v


class VariantPatch(BaseModel):
    price_minor: int | None = None
    active: bool | None = None

    @field_validator("price_minor")
    @classmethod
    def nonneg(cls, v: int | None) -> int | None:
        if v is not None and v < 0:
            raise ValueError("Must be >= 0.")
        return v


class StockAdjust(BaseModel):
    delta: int
    reason: str

    @field_validator("reason")
    @classmethod
    def reason_ok(cls, v: str) -> str:
        if not v.strip() or len(v) > 64:
            raise ValueError("Reason required (max 64).")
        return v.strip()


class AssetMeta(BaseModel):
    anchors: dict
    calibration: dict
