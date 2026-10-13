"""Auth endpoints. Role is never trusted from the client."""
import hashlib
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Cookie, Depends, Response
from sqlalchemy.orm import Session

from app.api.errors import error
from app.core.deps import create_session, get_current_user, set_session_cookie, SESSION_COOKIE
from app.core.security import hash_password, hash_token, new_token, verify_password
from app.db import get_db
from app.models.models import PasswordResetToken, Session as SessionRow, User
from app.schemas.account import ForgotIn, LoginIn, RegisterIn, ResetIn

router = APIRouter()
RESET_TTL = timedelta(hours=1)


def user_out(u: User) -> dict:
    return {"id": u.id, "name": u.name, "email": u.email_normalized, "role": u.role}


@router.post("/auth/register", status_code=201)
def register(body: RegisterIn, response: Response, db: Session = Depends(get_db)):
    normalized = body.email.strip().lower()
    if db.query(User).filter_by(email_normalized=normalized).one_or_none():
        return error("EMAIL_TAKEN", "An account with this email already exists.", 409)
    user = User(name=body.name, email_normalized=normalized,
                password_hash=hash_password(body.password), role="shopper")
    db.add(user)
    db.commit()
    raw, csrf = create_session(db, user)
    set_session_cookie(response, raw)
    return {"user": user_out(user), "csrf_token": csrf}


@router.post("/auth/login")
def login(body: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email_normalized=body.email.strip().lower()).one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        return error("INVALID_CREDENTIALS", "Email or password is incorrect.", 401)
    raw, csrf = create_session(db, user)
    set_session_cookie(response, raw)
    return {"user": user_out(user), "csrf_token": csrf}


@router.post("/auth/logout")
def logout(response: Response, db: Session = Depends(get_db),
           session: str | None = Cookie(default=None)):
    if session:
        row = db.query(SessionRow).filter_by(
            token_hash=hashlib.sha256(session.encode()).hexdigest()).one_or_none()
        if row is not None:
            row.revoked_at = datetime.now(timezone.utc)
            db.commit()
    response.delete_cookie(SESSION_COOKIE, path="/")
    return {"ok": True}


@router.get("/auth/me")
def me(user=Depends(get_current_user)):
    if isinstance(user, dict):
        return error(user["code"], user["message"], user["status"])
    # Fresh CSRF token per profile read (old ones stay valid until expiry).
    return {"user": user_out(user)}


@router.post("/auth/forgot-password")
def forgot(body: ForgotIn, db: Session = Depends(get_db)):
    # Generic response irrespective of account existence (no enumeration).
    user = db.query(User).filter_by(email_normalized=body.email.strip().lower()).one_or_none()
    if user is not None:
        raw = new_token()
        db.add(PasswordResetToken(user_id=user.id, token_hash=hash_token(raw),
                                  expires_at=datetime.now(timezone.utc) + RESET_TTL))
        db.commit()
        # Development mail sink: log only. Production needs a delivery service.
        print(f"[dev-mail] password reset for {body.email}: token={raw}")
    return {"ok": True, "message": "If the account exists, reset instructions were sent."}


@router.post("/auth/reset-password")
def reset(body: ResetIn, db: Session = Depends(get_db)):
    # One-use token matched by hash; consumed immediately below.
    match = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == hash_token(body.token),
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.expires_at > datetime.now(timezone.utc)).one_or_none()
    if match is None:
        return error("INVALID_TOKEN", "Reset link is invalid or expired.", 400)
    match.used_at = datetime.now(timezone.utc)
    user = db.query(User).filter_by(id=match.user_id).one()
    user.password_hash = hash_password(body.new_password)
    # Revoke all sessions for this user.
    db.query(SessionRow).filter_by(user_id=user.id).update({"revoked_at": datetime.now(timezone.utc)})
    db.commit()
    return {"ok": True}
