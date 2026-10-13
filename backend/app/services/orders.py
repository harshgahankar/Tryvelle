"""Order service: validation, idempotent placement, cancel. All money server-side."""
import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.models import (
    Address, AdminAuditEvent, Order, OrderItem, Product, ProductColor,
    ProductVariant, StockMovement,
)

ORDER_PREFIX = "DEMO-"
CANCELLABLE = ("demo_placed", "demo_confirmed", "paid")  # paid cancel = manual refund via gateway


class OrderError(Exception):
    def __init__(self, code: str, message: str, status: int = 409, fields: dict | None = None,
                 payload: dict | None = None):
        super().__init__(message)
        self.code = code
        self.status = status
        self.fields = fields or {}
        self.payload = payload


def validate_lines(db: Session, items: list) -> tuple[list[dict], int]:
    """Server-authoritative validation. Returns (lines, subtotal_minor)."""
    lines = []
    subtotal = 0
    for it in items:
        vid = it.variant_id if hasattr(it, "variant_id") else it["variant_id"]
        qty = it.quantity if hasattr(it, "quantity") else it["quantity"]
        try:
            vid = uuid.UUID(str(vid))
        except ValueError:
            lines.append({"variant_id": str(vid), "error": "INVALID_ID"})
            continue
        v = db.query(ProductVariant).filter_by(id=vid).one_or_none()
        if v is None or not v.active:
            lines.append({"variant_id": str(vid), "error": "UNAVAILABLE"})
            continue
        color = db.query(ProductColor).filter_by(id=v.product_color_id).one()
        prod = db.query(Product).filter_by(id=color.product_id).one()
        if prod.status != "published":
            lines.append({"variant_id": str(vid), "error": "UNAVAILABLE"})
            continue
        if v.stock_quantity < qty:
            lines.append({"variant_id": str(vid), "sku": v.sku, "error": "OUT_OF_STOCK",
                          "fields": {"quantity": f"Only {v.stock_quantity} available."}})
            continue
        line_total = v.price_minor * qty
        subtotal += line_total
        lines.append({"variant_id": v.id, "sku": v.sku, "title": prod.title,
                      "color": color.name, "size": v.size_label,
                      "unit_price_minor": v.price_minor, "quantity": qty,
                      "line_total_minor": line_total, "error": None})
    return lines, subtotal


def _snapshot(order: Order) -> dict:
    return {"id": order.id, "order_number": order.order_number, "status": order.status,
            "currency": order.currency, "subtotal_minor": order.subtotal_minor,
            "shipping_minor": order.shipping_minor, "total_minor": order.total_minor,
            "payment_collected": False}


def place_order(db: Session, user_id, items: list, address_id, expected_total: int,
                idem_key: str) -> dict:
    """One transaction: idempotency check, lock in stable order, stock verify,
    reprice, insert snapshots, decrement, movements. Rolls back on any failure."""
    if not idem_key or len(idem_key) > 64:
        raise OrderError("INVALID_IDEMPOTENCY_KEY", "Idempotency-Key header required (max 64).", 400)
    try:
        addr_id = uuid.UUID(str(address_id))
    except ValueError:
        raise OrderError("INVALID_ID", "Address id must be a UUID.", 400)
    address = db.query(Address).filter_by(id=addr_id, user_id=user_id).one_or_none()
    if address is None:
        raise OrderError("INVALID_ADDRESS", "Address not found for this account.", 400)

    existing = db.query(Order).filter_by(user_id=user_id, idempotency_key=idem_key).one_or_none()
    payload_sig = f"{sorted((str(i.variant_id if hasattr(i, 'variant_id') else i['variant_id']), i.quantity if hasattr(i, 'quantity') else i['quantity']) for i in items)}|{addr_id}|{expected_total}"
    if existing is not None:
        if existing.address_snapshot_json.get("idem_sig") == payload_sig:
            return _snapshot(existing)  # same key + same payload -> original order
        raise OrderError("IDEMPOTENCY_CONFLICT", "Key reused with a different payload.", 409)

    try:
        # Lock variants in stable id order to avoid deadlocks.
        vids = sorted({str(i.variant_id if hasattr(i, "variant_id") else i["variant_id"]) for i in items})
        locked = {}
        for raw in vids:
            try:
                vid = uuid.UUID(raw)
            except ValueError:
                raise OrderError("INVALID_ID", f"Variant id invalid: {raw}.", 400)
            v = db.query(ProductVariant).filter_by(id=vid).with_for_update().one_or_none()
            if v is None or not v.active:
                raise OrderError("UNAVAILABLE", "A selected variant is unavailable.", 409)
            locked[str(vid)] = v

        lines, subtotal = [], 0
        for it in items:
            vid = str(it.variant_id if hasattr(it, "variant_id") else it["variant_id"])
            qty = it.quantity if hasattr(it, "quantity") else it["quantity"]
            v = locked[vid]
            color = db.query(ProductColor).filter_by(id=v.product_color_id).one()
            prod = db.query(Product).filter_by(id=color.product_id).one()
            if prod.status != "published":
                raise OrderError("UNAVAILABLE", "A selected product is unavailable.", 409)
            if v.stock_quantity < qty:
                raise OrderError("OUT_OF_STOCK", "Insufficient stock for a selected size.", 409,
                                 {"quantity": f"{prod.title} {v.size_label}: only {v.stock_quantity} available."})
            lines.append((v, color, prod, qty))
            subtotal += v.price_minor * qty

        shipping = 0  # explicitly zero in demo mode
        total = subtotal + shipping
        if total != expected_total:
            raise OrderError("PRICE_CHANGED", "Totals changed since review.", 409,
                             {"expected_total_minor": "Review updated totals and retry with a new key."},
                             {"subtotal_minor": subtotal, "shipping_minor": shipping, "total_minor": total})

        order = Order(
            user_id=user_id, order_number=f"{ORDER_PREFIX}{secrets.token_hex(4).upper()}",
            status="demo_placed", currency="INR", subtotal_minor=subtotal,
            shipping_minor=shipping, total_minor=total,
            address_snapshot_json={
                "recipient": address.recipient, "line1": address.line1, "line2": address.line2,
                "city": address.city, "region": address.region, "postal_code": address.postal_code,
                "country": address.country, "phone": address.phone, "idem_sig": payload_sig},
            idempotency_key=idem_key)
        db.add(order)
        db.flush()
        for v, color, prod, qty in lines:
            # Atomic conditional decrement: the real oversell guard on every
            # database (row locks alone don't hold on SQLite).
            updated = db.query(ProductVariant).filter(
                ProductVariant.id == v.id,
                ProductVariant.stock_quantity >= qty).update(
                {"stock_quantity": ProductVariant.stock_quantity - qty},
                synchronize_session=False)
            if updated != 1:
                raise OrderError("OUT_OF_STOCK", "Insufficient stock for a selected size.", 409)
            db.add(OrderItem(order_id=order.id, variant_id=v.id, sku_snapshot=v.sku,
                             title_snapshot=prod.title, color_snapshot=color.name,
                             size_snapshot=v.size_label, unit_price_minor=v.price_minor, quantity=qty))
            db.add(StockMovement(variant_id=v.id, quantity_delta=-qty,
                                 reason="demo order", order_id=order.id))
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise OrderError("OUT_OF_STOCK", "Insufficient stock for a selected size.", 409)
        return _snapshot(order)
    except Exception:
        db.rollback()
        raise


def cancel_order(db: Session, user_id, order_id) -> dict:
    try:
        oid = uuid.UUID(str(order_id))
    except ValueError:
        raise OrderError("INVALID_ID", "Order id must be a UUID.", 400)
    order = db.query(Order).filter_by(id=oid, user_id=user_id).one_or_none()
    if order is None:
        raise OrderError("NOT_FOUND", "Order not found.", 404)
    if order.status == "demo_cancelled":
        raise OrderError("ALREADY_CANCELLED", "Order is already cancelled.", 409)
    if order.status not in CANCELLABLE:
        raise OrderError("NOT_CANCELLABLE", "Only orders before completion can be cancelled.", 409)
    try:
        for item in db.query(OrderItem).filter_by(order_id=order.id).all():
            if item.variant_id is not None:
                v = db.query(ProductVariant).filter_by(id=item.variant_id).with_for_update().one_or_none()
                if v is not None:
                    v.stock_quantity += item.quantity
                    db.add(StockMovement(variant_id=v.id, quantity_delta=item.quantity,
                                         reason="cancel restore", order_id=order.id))
        order.status = "demo_cancelled"
        db.commit()
        return _snapshot(order)
    except Exception:
        db.rollback()
        raise


def transition_order(db: Session, actor_id, order_id, status: str) -> dict:
    allowed = {"demo_placed": ("demo_confirmed", "demo_cancelled"),
               "demo_confirmed": ("demo_completed", "demo_cancelled"),
               "paid": ("demo_confirmed", "demo_cancelled"),
               "pending_payment": ("demo_cancelled",),
               "demo_completed": (), "demo_cancelled": (), "payment_failed": ("demo_cancelled",)}
    try:
        oid = uuid.UUID(str(order_id))
    except ValueError:
        raise OrderError("INVALID_ID", "Order id must be a UUID.", 400)
    order = db.query(Order).filter_by(id=oid).one_or_none()
    if order is None:
        raise OrderError("NOT_FOUND", "Order not found.", 404)
    if status not in allowed.get(order.status, ()):
        raise OrderError("BAD_TRANSITION",
                         f"Cannot move {order.status} to {status}.", 409)
    if status == "demo_cancelled":
        # Admin cancel restores stock exactly once via the same path.
        result = cancel_order(db, order.user_id, oid)
        db.add(AdminAuditEvent(actor_id=actor_id, entity_type="order",
                               entity_id=str(oid), action="cancel"))
        db.commit()
        return result
    order.status = status
    db.add(AdminAuditEvent(actor_id=actor_id, entity_type="order",
                           entity_id=str(oid), action=f"status->{status}"))
    db.commit()
    return _snapshot(order)
