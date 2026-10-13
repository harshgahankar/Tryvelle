"""Pydantic response schemas. Money is integer minor units everywhere."""
import uuid

from pydantic import BaseModel


class CategoryOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str


class VariantOut(BaseModel):
    variant_id: uuid.UUID
    size_label: str
    price_minor: int
    stock_quantity: int


class ColorOut(BaseModel):
    color_id: uuid.UUID
    name: str
    hex: str
    variants: list[VariantOut]
    try_on_available: bool = False


class PhotoOut(BaseModel):
    url: str
    alt_text: str


class ProductListItem(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    currency: str
    category: CategoryOut
    colors: list[ColorOut]
    photos: list[PhotoOut]
    min_price_minor: int
    try_on_available: bool


class Page(BaseModel):
    items: list
    page: int
    page_size: int
    total: int


class SizeChartRowOut(BaseModel):
    size_label: str
    chest: int
    length: int
    shoulder: int | None


class SizeChartOut(BaseModel):
    name: str
    unit: str
    measurement_definition: str
    rows: list[SizeChartRowOut]


class ProductDetailOut(BaseModel):
    id: uuid.UUID
    slug: str
    title: str
    description: str
    currency: str
    category: CategoryOut
    size_chart: SizeChartOut | None
    colors: list[ColorOut]
    photos: list[PhotoOut]
    try_on_available: bool


class TryOnAssetOut(BaseModel):
    color_id: uuid.UUID
    color_name: str
    asset_url: str
    width: int
    height: int
    version: int
    schema_version: int
    anchors: dict
    calibration: dict
