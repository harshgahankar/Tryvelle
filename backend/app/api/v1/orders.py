"""Cart validation (public) + demo orders (shopper). Server prices win."""
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

from app.api.errors import error
from app.core.deps import get_current_user
from app.db import get_db
from app.models.models import Order, OrderItem
from app.schemas.orders import CartValidateIn, OrderCreate, OrderOut, ValidatedLine
from app.services.orders import OrderError, cancel_order, place_order, validate_lines

cart_router = APIRouter()
orders_router = APIRouter()


def authed(user):
    if isinstance(user, dict):
        return error(user["code"], user["message"], user["status"])
    return None


@cart_router.post("/cart/validate")
def validate_cart(body: CartValidateIn, db: Session = Depends(get_db)):
    lines, subtotal = validate_lines(db, body.items)
    shipping = 0  # explicitly zero in demo mode
    out = []
    for l in lines:
        if l.get("error") == "INVALID_ID":
            out.append(ValidatedLine(variant_id=l["variant_id"], error="INVALID_ID").model_dump())
        else:
            out.append(ValidatedLine(variant_id=str(l["variant_id"]), sku=l.get("sku", ""),
                                     title=l.get("title", ""), color=l.get("color", ""),
                                     size=l.get("size", ""),
                                     unit_price_minor=l.get("unit_price_minor", 0),
                                     quantity=l.get("quantity", 0),
                                     line_total_minor=l.get("line_total_minor", 0),
                                     error=l.get("error"),
                                     fields=l.get("fields", {})).model_dump())
    return {"items": out, "subtotal_minor": subtotal, "shipping_minor": shipping,
            "total_minor": subtotal + shipping}


@orders_router.post("/orders", status_code=201)
def create_order(body: OrderCreate, db: Session = Depends(get_db),
                 idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
                 user=Depends(get_current_user)):
    err = authed(user)
    if err:
        return err
    try:
        return OrderOut(**place_order(db, user.id, body.items, body.address_id,
                                      body.expected_total_minor, idempotency_key or "")).model_dump()
    except OrderError as e:
        payload = {"validated": e.payload} if e.payload else {}
        resp = error(e.code, str(e), e.status, e.fields)
        if payload:
            body_json = resp.body.decode()
            import json
            content = json.loads(body_json)
            content["error"].update(payload)
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=e.status, content=content)
        return resp


def order_detail(db: Session, order: Order) -> dict:
    items = db.query(OrderItem).filter_by(order_id=order.id).all()
    return {**OrderOut(id=order.id, order_number=order.order_number, status=order.status,
                       currency=order.currency, subtotal_minor=order.subtotal_minor,
                       shipping_minor=order.shipping_minor, total_minor=order.total_minor).model_dump(),
            "items": [{"sku": i.sku_snapshot, "title": i.title_snapshot, "color": i.color_snapshot,
                       "size": i.size_snapshot, "unit_price_minor": i.unit_price_minor,
                       "quantity": i.quantity} for i in items],
            "address": {k: v for k, v in order.address_snapshot_json.items() if k != "idem_sig"},
            "created_at": order.created_at.isoformat()}


@orders_router.get("/me/orders")
def list_orders(page: int = 1, page_size: int = 12, db: Session = Depends(get_db),
                user=Depends(get_current_user)):
    err = authed(user)
    if err:
        return err
    page, page_size = max(1, page), max(1, min(page_size, 100))
    q = db.query(Order).filter_by(user_id=user.id).order_by(Order.created_at.desc())
    total = q.count()
    items = [order_detail(db, o) for o in q.offset((page - 1) * page_size).limit(page_size).all()]
    return {"items": items, "page": page, "page_size": page_size, "total": total}


@orders_router.get("/me/orders/{order_id}")
def get_order(order_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    err = authed(user)
    if err:
        return err
    import uuid as _uuid
    try:
        oid = _uuid.UUID(order_id)
    except ValueError:
        return error("INVALID_ID", "Order id must be a UUID.", 400)
    order = db.query(Order).filter_by(id=oid, user_id=user.id).one_or_none()
    if order is None:
        return error("NOT_FOUND", "Order not found.", 404)
    return order_detail(db, order)


@orders_router.post("/me/orders/{order_id}/cancel")
def cancel(order_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    err = authed(user)
    if err:
        return err
    try:
        return cancel_order(db, user.id, order_id)
    except OrderError as e:
        return error(e.code, str(e), e.status, e.fields)
