"""Tables per documents/database-models.md (local mirror of the spec).

Conventions: UUID PKs, UTC timestamps, integer minor-unit money
(INR 129900 == Rs 1299.00; never float), FK + DB constraints.
No tables for camera frames, landmarks or face identity.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, CheckConstraint, DateTime, ForeignKey, Integer, JSON, String,
    Text, UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import Uuid


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


def uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(Uuid, primary_key=True, default=uuid.uuid4)


def created_at() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), default=_utcnow, nullable=False)


class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email_normalized: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(16), default="shopper", nullable=False)
    created_at: Mapped[datetime] = created_at()
    __table_args__ = (CheckConstraint("role in ('shopper','admin')", name="ck_users_role"),)


class Session(Base):
    __tablename__ = "sessions"
    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    csrf_token_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Category(Base):
    __tablename__ = "categories"
    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    products: Mapped[list["Product"]] = relationship(back_populates="category")


class SizeChart(Base):
    __tablename__ = "size_charts"
    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    unit: Mapped[str] = mapped_column(String(8), nullable=False)  # cm | in
    measurement_definition: Mapped[str] = mapped_column(Text, nullable=False)
    rows: Mapped[list["SizeChartRow"]] = relationship(back_populates="chart", cascade="all, delete-orphan")


class SizeChartRow(Base):
    __tablename__ = "size_chart_rows"
    id: Mapped[uuid.UUID] = uuid_pk()
    size_chart_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("size_charts.id", ondelete="CASCADE"), nullable=False)
    size_label: Mapped[str] = mapped_column(String(16), nullable=False)
    chest: Mapped[int] = mapped_column(Integer, nullable=False)
    length: Mapped[int] = mapped_column(Integer, nullable=False)
    shoulder: Mapped[int | None] = mapped_column(Integer, nullable=True)
    chart: Mapped[SizeChart] = relationship(back_populates="rows")
    __table_args__ = (
        UniqueConstraint("size_chart_id", "size_label", name="uq_chart_size"),
        CheckConstraint("chest > 0 and length > 0", name="ck_chart_positive"),
    )


class Product(Base):
    __tablename__ = "products"
    id: Mapped[uuid.UUID] = uuid_pk()
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("categories.id"), nullable=False)
    slug: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="draft", nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="INR", nullable=False)
    size_chart_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("size_charts.id"), nullable=True)
    created_at: Mapped[datetime] = created_at()
    category: Mapped[Category] = relationship(back_populates="products")
    colors: Mapped[list["ProductColor"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    __table_args__ = (CheckConstraint("status in ('draft','published','archived')", name="ck_product_status"),)


class ProductColor(Base):
    __tablename__ = "product_colors"
    id: Mapped[uuid.UUID] = uuid_pk()
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    hex: Mapped[str] = mapped_column(String(16), nullable=False)
    product: Mapped[Product] = relationship(back_populates="colors")
    variants: Mapped[list["ProductVariant"]] = relationship(back_populates="color", cascade="all, delete-orphan")
    __table_args__ = (UniqueConstraint("product_id", "name", name="uq_product_color"),)


class ProductVariant(Base):
    __tablename__ = "product_variants"
    id: Mapped[uuid.UUID] = uuid_pk()
    product_color_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_colors.id", ondelete="CASCADE"), nullable=False)
    sku: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    size_label: Mapped[str] = mapped_column(String(16), nullable=False)
    price_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    color: Mapped[ProductColor] = relationship(back_populates="variants")
    __table_args__ = (
        UniqueConstraint("product_color_id", "size_label", name="uq_color_size"),
        CheckConstraint("price_minor >= 0 and stock_quantity >= 0", name="ck_variant_nonneg"),
    )


class ProductImage(Base):
    __tablename__ = "product_images"
    id: Mapped[uuid.UUID] = uuid_pk()
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    product_color_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("product_colors.id", ondelete="SET NULL"), nullable=True)
    asset_key: Mapped[str] = mapped_column(String(255), nullable=False)
    alt_text: Mapped[str] = mapped_column(String(255), default="", nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class TryOnAsset(Base):
    __tablename__ = "try_on_assets"
    id: Mapped[uuid.UUID] = uuid_pk()
    product_color_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_colors.id", ondelete="CASCADE"), nullable=False)
    asset_key: Mapped[str] = mapped_column(String(255), nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    anchor_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    calibration_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    schema_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="draft", nullable=False)
    __table_args__ = (CheckConstraint("status in ('draft','validated','published')", name="ck_asset_status"),)


class WishlistItem(Base):
    __tablename__ = "wishlist_items"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = created_at()


class Address(Base):
    __tablename__ = "addresses"
    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recipient: Mapped[str] = mapped_column(String(120), nullable=False)
    line1: Mapped[str] = mapped_column(String(200), nullable=False)
    line2: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    city: Mapped[str] = mapped_column(String(120), nullable=False)
    region: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    postal_code: Mapped[str] = mapped_column(String(20), nullable=False)
    country: Mapped[str] = mapped_column(String(8), default="IN", nullable=False)
    phone: Mapped[str] = mapped_column(String(32), default="", nullable=False)


class Order(Base):
    __tablename__ = "orders"
    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    order_number: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(24), default="demo_placed", nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="INR", nullable=False)
    subtotal_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    shipping_minor: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # zero in demo mode
    total_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    address_snapshot_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(64), nullable=False)
    razorpay_order_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = created_at()
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key", name="uq_user_idem"),
        CheckConstraint("subtotal_minor >= 0 and total_minor >= 0 and shipping_minor >= 0", name="ck_order_nonneg"),
    )


class OrderItem(Base):
    __tablename__ = "order_items"
    id: Mapped[uuid.UUID] = uuid_pk()
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    variant_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("product_variants.id"), nullable=True)
    sku_snapshot: Mapped[str] = mapped_column(String(64), nullable=False)
    title_snapshot: Mapped[str] = mapped_column(String(200), nullable=False)
    color_snapshot: Mapped[str] = mapped_column(String(80), nullable=False)
    size_snapshot: Mapped[str] = mapped_column(String(16), nullable=False)
    unit_price_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    order: Mapped[Order] = relationship(back_populates="items")
    __table_args__ = (CheckConstraint("quantity > 0 and unit_price_minor >= 0", name="ck_item_pos"),)


class StockMovement(Base):
    __tablename__ = "stock_movements"
    id: Mapped[uuid.UUID] = uuid_pk()
    variant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_variants.id"), nullable=False)
    quantity_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(64), nullable=False)
    order_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("orders.id"), nullable=True)
    created_at: Mapped[datetime] = created_at()


class AdminAuditEvent(Base):
    __tablename__ = "admin_audit_events"
    id: Mapped[uuid.UUID] = uuid_pk()
    actor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(64), nullable=False)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = created_at()
