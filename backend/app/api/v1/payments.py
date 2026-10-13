"""Razorpay test-mode payments. No live keys: intent endpoint refuses clearly."""
import hmac
import json
from datetime import datetime, timezone

import razorpay
from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.orm import Session

from app.api.errors import error
from app.core.config import get_settings
from app.core.deps import get_current_user
from app.db import get_db
from app.models.models import Order, OrderItem
from app.schemas.orders import OrderCreate
from app.services.orders import OrderError, validate_lines

router = APIRouter()


class GatewayNotConfigured(Exception):
    pass


def get_gateway():
    settings = get_settings()
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise GatewayNotConfigured("Set RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET (test mode) first.")
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def authed(user):
    if isinstance(user, dict):
        return error(user["code"], user["message"], user["status"])
    return None


def order_snapshot(order: Order) -> dict:
    return {"id": order.id, "order_number": order.order_number, "status": order.status,
            "currency": order.currency, "subtotal_minor": order.subtotal_minor,
            "shipping_minor": order.shipping_minor, "total_minor": order.total_minor,
            "payment_collected": order.status == "paid",
            "razorpay_order_id": order.razorpay_order_id}


@router.post("/orders/razorpay-intent", status_code=201)
def create_intent(body: OrderCreate, db: Session = Depends(get_db),
                  idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
                  user=Depends(get_current_user)):
    """Validate + create a pending_payment order + Razorpay order. No stock moves."""
    from app.models.models import Address
    import uuid as _uuid
    err = authed(user)
    if err:
        return err
    if not idempotency_key or len(idempotency_key) > 64:
        return error("INVALID_IDEMPOTENCY_KEY", "Idempotency-Key header required (max 64).", 400)
    try:
        addr_id = _uuid.UUID(str(body.address_id))
    except ValueError:
        return error("INVALID_ID", "Address id must be a UUID.", 400)
    address = db.query(Address).filter_by(id=addr_id, user_id=user.id).one_or_none()
    if address is None:
        return error("INVALID_ADDRESS", "Address not found for this account.", 400)
    existing = db.query(Order).filter_by(user_id=user.id, idempotency_key=idempotency_key).one_or_none()
    if existing is not None:
        if existing.status == "pending_payment" and existing.razorpay_order_id:
            out = order_snapshot(existing)
            out["key_id"] = get_settings().RAZORPAY_KEY_ID
            return out
        return error("IDEMPOTENCY_CONFLICT", "Key reused with a different payload.", 409)
    lines, subtotal = validate_lines(db, body.items)
    if any(l.get("error") for l in lines):
        return error("UNAVAILABLE", "A selected variant is unavailable.", 409)
    if subtotal != body.expected_total_minor:
        return error("PRICE_CHANGED", "Totals changed since review.", 409)
    import secrets as _secrets
    order = Order(
        user_id=user.id, order_number=f"DEMO-{_secrets.token_hex(4).upper()}",
        status="pending_payment", currency="INR", subtotal_minor=subtotal,
        shipping_minor=0, total_minor=subtotal,
        address_snapshot_json={"recipient": address.recipient, "line1": address.line1,
                               "city": address.city, "postal_code": address.postal_code},
        idempotency_key=idempotency_key)
    db.add(order)
    db.flush()
    for l in lines:
        db.add(OrderItem(order_id=order.id, variant_id=_uuid.UUID(str(l["variant_id"])),
                         sku_snapshot=l["sku"], title_snapshot=l["title"],
                         color_snapshot=l["color"], size_snapshot=l["size"],
                         unit_price_minor=l["unit_price_minor"], quantity=l["quantity"]))
    try:
        gateway = get_gateway()
    except GatewayNotConfigured as e:
        db.rollback()
        return error("GATEWAY_NOT_CONFIGURED", str(e), 400)
    try:
        rz = gateway.order.create({"amount": subtotal, "currency": "INR",
                                   "receipt": order.order_number,
                                   "notes": {"order_id": str(order.id)}})
    except Exception as e:
        db.rollback()
        return error("GATEWAY_ERROR", f"Razorpay order failed: {e}.", 502)
    order.razorpay_order_id = rz["id"]
    db.commit()
    out = order_snapshot(order)
    out["key_id"] = get_settings().RAZORPAY_KEY_ID
    return out


def _capture(db: Session, order: Order, payment_id: str) -> dict:
    """Idempotent stock-decrementing capture. Only from pending_payment."""
    from app.models.models import ProductVariant
    if order.status == "paid":
        return order_snapshot(order)
    if order.status != "pending_payment":
        raise OrderError("BAD_STATE", f"Order is {order.status}; cannot capture.", 409)
    try:
        for item in db.query(OrderItem).filter_by(order_id=order.id).all():
            if item.variant_id is None:
                raise OrderError("UNAVAILABLE", "Order references an archived variant.", 409)
            updated = db.query(ProductVariant).filter(
                ProductVariant.id == item.variant_id,
                ProductVariant.stock_quantity >= item.quantity).update(
                {"stock_quantity": ProductVariant.stock_quantity - item.quantity},
                synchronize_session=False)
            if updated != 1:
                raise OrderError("OUT_OF_STOCK", "Stock ran out before payment completed.", 409)
            from app.models.models import StockMovement
            db.add(StockMovement(variant_id=item.variant_id, quantity_delta=-item.quantity,
                                 reason="razorpay capture", order_id=order.id))
        order.status = "paid"
        order.paid_at = datetime.now(timezone.utc)
        snap = dict(order.address_snapshot_json or {})
        snap["razorpay_payment_id"] = payment_id
        order.address_snapshot_json = snap
        db.commit()
        return order_snapshot(order)
    except Exception:
        db.rollback()
        raise


@router.post("/orders/verify")
def verify_payment(body: dict, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Verify Razorpay checkout signature, then capture exactly once."""
    err = authed(user)
    if err:
        return err
    try:
        order_id = body["order_id"]
        params = {"razorpay_order_id": body["razorpay_order_id"],
                  "razorpay_payment_id": body["razorpay_payment_id"],
                  "razorpay_signature": body["razorpay_signature"]}
    except KeyError:
        return error("VALIDATION_ERROR", "order_id + razorpay payment fields required.", 422)
    import uuid as _uuid
    try:
        oid = _uuid.UUID(order_id)
    except ValueError:
        return error("INVALID_ID", "Order id must be a UUID.", 400)
    order = db.query(Order).filter_by(id=oid, user_id=user.id).one_or_none()
    if order is None:
        return error("NOT_FOUND", "Order not found.", 404)
    if order.razorpay_order_id != params["razorpay_order_id"]:
        return error("MISMATCH", "Payment does not belong to this order.", 400)
    try:
        get_gateway().utility.verify_payment_signature(params)
    except GatewayNotConfigured as e:
        return error("GATEWAY_NOT_CONFIGURED", str(e), 400)
    except Exception:
        order.status = "payment_failed"
        db.commit()
        return error("PAYMENT_FAILED", "Signature invalid. No charge captured on our side.", 400)
    try:
        return _capture(db, order, params["razorpay_payment_id"])
    except OrderError as e:
        return error(e.code, str(e), e.status, e.fields)


@router.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """Backup reconciliation for payment.captured (Razorpay retries; keep idempotent)."""
    secret = get_settings().RAZORPAY_WEBHOOK_SECRET
    if not secret:
        return error("GATEWAY_NOT_CONFIGURED", "Set RAZORPAY_WEBHOOK_SECRET first.", 400)
    raw = await request.body()
    sig = request.headers.get("X-Razorpay-Signature", "")
    import razorpay as _rz
    try:
        _rz.Client(auth=("", "")).utility.verify_webhook_signature(raw.decode(), sig, secret)
    except Exception:
        return error("BAD_SIGNATURE", "Webhook signature invalid.", 400)
    try:
        event = json.loads(raw)
    except ValueError:
        return error("BAD_PAYLOAD", "Invalid JSON.", 400)
    if event.get("event") == "payment.captured":
        entity = (event.get("payload", {}).get("payment", {}).get("entity", {}))
        rz_order = entity.get("order_id")
        if rz_order:
            order = db.query(Order).filter_by(razorpay_order_id=rz_order).one_or_none()
            if order is not None and order.status == "pending_payment":
                try:
                    _capture(db, order, entity.get("id", ""))
                except OrderError:
                    pass  # stock gone: stays pending; ops handles manually
    return {"ok": True}
