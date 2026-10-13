import uuid

from pydantic import BaseModel, field_validator


class CartItemIn(BaseModel):
    variant_id: uuid.UUID
    quantity: int

    @field_validator("quantity")
    @classmethod
    def qty_ok(cls, v: int) -> int:
        if not 1 <= v <= 99:
            raise ValueError("Quantity must be 1-99.")
        return v


class CartValidateIn(BaseModel):
    items: list[CartItemIn]

    @field_validator("items")
    @classmethod
    def not_empty(cls, v: list) -> list:
        if not v:
            raise ValueError("Cart is empty.")
        if len(v) > 50:
            raise ValueError("Too many lines (max 50).")
        return v


class ValidatedLine(BaseModel):
    variant_id: str
    sku: str = ""
    title: str = ""
    color: str = ""
    size: str = ""
    unit_price_minor: int = 0
    quantity: int = 0
    line_total_minor: int = 0
    error: str | None = None
    fields: dict = {}


class OrderCreate(BaseModel):
    items: list[CartItemIn]
    address_id: uuid.UUID
    expected_total_minor: int

    @field_validator("items")
    @classmethod
    def not_empty(cls, v: list) -> list:
        if not v:
            raise ValueError("Order needs items.")
        if len(v) > 50:
            raise ValueError("Too many lines (max 50).")
        return v


class OrderOut(BaseModel):
    id: uuid.UUID
    order_number: str
    status: str
    currency: str
    subtotal_minor: int
    shipping_minor: int
    total_minor: int
    payment_collected: bool = False
