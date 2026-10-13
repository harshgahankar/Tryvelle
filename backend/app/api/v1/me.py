"""Shopper account: profile, addresses (owner-only), wishlist."""
import uuid

from fastapi import APIRouter, Cookie, Depends, Header
from sqlalchemy.orm import Session

from app.api.errors import error
from app.core.deps import check_csrf, get_current_user
from app.db import get_db
from app.models.models import Address, Product, WishlistItem
from app.schemas.account import AddressIn, AddressOut, ProfilePatch, WishlistOut

router = APIRouter()


def authed(user):
    if isinstance(user, dict):
        return error(user["code"], user["message"], user["status"])
    return None


def csrf(db: Session, session: str | None, token: str | None):
    err = check_csrf(db, session or "", token)
    if err:
        return error(err["code"], err["message"], err["status"])
    return None


def address_out(r: Address) -> AddressOut:
    return AddressOut(id=r.id, recipient=r.recipient, line1=r.line1, line2=r.line2,
                      city=r.city, region=r.region, postal_code=r.postal_code,
                      country=r.country, phone=r.phone)


@router.patch("/me")
def update_profile(body: ProfilePatch, db: Session = Depends(get_db),
                   session: str | None = Cookie(default=None),
                   x_csrf_token: str | None = Header(default=None),
                   user=Depends(get_current_user)):
    err = authed(user) or csrf(db, session, x_csrf_token)
    if err:
        return err
    user.name = body.name
    db.commit()
    return {"id": user.id, "name": user.name}


@router.get("/me/addresses")
def list_addresses(db: Session = Depends(get_db), user=Depends(get_current_user)):
    err = authed(user)
    if err:
        return err
    return {"items": [address_out(r) for r in db.query(Address).filter_by(user_id=user.id).all()]}


@router.post("/me/addresses", status_code=201)
def create_address(body: AddressIn, db: Session = Depends(get_db),
                   session: str | None = Cookie(default=None),
                   x_csrf_token: str | None = Header(default=None),
                   user=Depends(get_current_user)):
    err = authed(user) or csrf(db, session, x_csrf_token)
    if err:
        return err
    row = Address(user_id=user.id, **body.model_dump())
    db.add(row)
    db.commit()
    return address_out(row)


@router.patch("/me/addresses/{addr_id}")
def update_address(addr_id: str, body: AddressIn, db: Session = Depends(get_db),
                   session: str | None = Cookie(default=None),
                   x_csrf_token: str | None = Header(default=None),
                   user=Depends(get_current_user)):
    err = authed(user) or csrf(db, session, x_csrf_token)
    if err:
        return err
    try:
        aid = uuid.UUID(addr_id)
    except ValueError:
        return error("INVALID_ID", "Address id must be a UUID.", 400)
    row = db.query(Address).filter_by(id=aid, user_id=user.id).one_or_none()
    if row is None:
        return error("NOT_FOUND", "Address not found.", 404)
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    db.commit()
    return address_out(row)


@router.delete("/me/addresses/{addr_id}")
def delete_address(addr_id: str, db: Session = Depends(get_db),
                   session: str | None = Cookie(default=None),
                   x_csrf_token: str | None = Header(default=None),
                   user=Depends(get_current_user)):
    err = authed(user) or csrf(db, session, x_csrf_token)
    if err:
        return err
    try:
        aid = uuid.UUID(addr_id)
    except ValueError:
        return error("INVALID_ID", "Address id must be a UUID.", 400)
    row = db.query(Address).filter_by(id=aid, user_id=user.id).one_or_none()
    if row is None:
        return error("NOT_FOUND", "Address not found.", 404)
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.get("/me/wishlist")
def list_wishlist(db: Session = Depends(get_db), user=Depends(get_current_user)):
    err = authed(user)
    if err:
        return err
    rows = (db.query(WishlistItem, Product).join(Product, WishlistItem.product_id == Product.id)
            .filter(WishlistItem.user_id == user.id).all())
    return {"items": [WishlistOut(product_id=p.id, slug=p.slug, title=p.title) for _, p in rows]}


@router.put("/me/wishlist/{product_id}")
def save_wishlist(product_id: str, db: Session = Depends(get_db),
                  session: str | None = Cookie(default=None),
                  x_csrf_token: str | None = Header(default=None),
                  user=Depends(get_current_user)):
    err = authed(user) or csrf(db, session, x_csrf_token)
    if err:
        return err
    try:
        pid = uuid.UUID(product_id)
    except ValueError:
        return error("INVALID_ID", "Product id must be a UUID.", 400)
    prod = db.query(Product).filter_by(id=pid, status="published").one_or_none()
    if prod is None:
        return error("NOT_FOUND", "Published product not found.", 404)
    if db.query(WishlistItem).filter_by(user_id=user.id, product_id=pid).one_or_none() is None:
        db.add(WishlistItem(user_id=user.id, product_id=pid))
        db.commit()
    return {"ok": True}


@router.delete("/me/wishlist/{product_id}")
def remove_wishlist(product_id: str, db: Session = Depends(get_db),
                    session: str | None = Cookie(default=None),
                    x_csrf_token: str | None = Header(default=None),
                    user=Depends(get_current_user)):
    err = authed(user) or csrf(db, session, x_csrf_token)
    if err:
        return err
    try:
        pid = uuid.UUID(product_id)
    except ValueError:
        return error("INVALID_ID", "Product id must be a UUID.", 400)
    row = db.query(WishlistItem).filter_by(user_id=user.id, product_id=pid).one_or_none()
    if row is not None:
        db.delete(row)
        db.commit()
    return {"ok": True}
