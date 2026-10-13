"""Session + CSRF + role dependencies. Auth enforced by the API, never the client."""
import hashlib
import hmac
import time
from datetime import datetime, timezone

from fastapi import Cookie, Depends, Header, Request
from sqlalchemy.orm import Session

from app.api.errors import error
from app.core.config import get_settings
from app.core.security import hash_token, new_token
from app.db import get_db
from app.models.models import Session as SessionRow, User

SESSION_COOKIE = "session"


def _sha(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(db: Session, user: User) -> tuple[str, str]:
    """Returns (session_token, csrf_token) plaintext; only hashes are stored."""
    settings = get_settings()
    raw, csrf = new_token(), new_token()
    db.add(SessionRow(
        user_id=user.id, token_hash=_sha(raw), csrf_token_hash=_sha(csrf),
        expires_at=datetime.fromtimestamp(time.time() + settings.SESSION_TTL_SECONDS, tz=timezone.utc),
    ))
    db.commit()
    return raw, csrf


def set_session_cookie(response, raw: str) -> None:
    settings = get_settings()
    response.set_cookie(
        SESSION_COOKIE, raw, httponly=True, secure=settings.COOKIE_SECURE,
        samesite="lax", path="/", max_age=settings.SESSION_TTL_SECONDS,
    )


def get_current_user(
    request: Request,
    session: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> User | dict:
    """Returns the User, or an error dict (routers turn it into the envelope)."""
    if not session:
        return {"code": "UNAUTHENTICATED", "message": "Login required.", "status": 401}
    row = db.query(SessionRow).filter_by(token_hash=_sha(session)).one_or_none()
    now = datetime.now(timezone.utc)
    if row is None or row.revoked_at is not None or row.expires_at.replace(tzinfo=timezone.utc) < now:
        return {"code": "UNAUTHENTICATED", "message": "Session expired. Login again.", "status": 401}
    origin = request.headers.get("origin")
    if origin:
        allowed = [o.strip() for o in get_settings().ALLOWED_WEB_ORIGINS.split(",")]
        if origin.rstrip("/") not in [a.rstrip("/") for a in allowed]:
            return {"code": "FORBIDDEN", "message": "Origin not allowed.", "status": 403}
    user = db.query(User).filter_by(id=row.user_id).one_or_none()
    if user is None:
        return {"code": "UNAUTHENTICATED", "message": "Account missing.", "status": 401}
    return user


def check_csrf(db: Session, session: str, csrf_token: str | None) -> dict | None:
    if not csrf_token:
        return {"code": "CSRF_REQUIRED", "message": "CSRF token missing.", "status": 403}
    row = db.query(SessionRow).filter_by(token_hash=_sha(session)).one_or_none()
    if row is None or not hmac.compare_digest(row.csrf_token_hash, _sha(csrf_token)):
        return {"code": "CSRF_INVALID", "message": "CSRF validation failed.", "status": 403}
    return None


def ok_or_error(value):
    """Passthrough helper: routers return error(...) when given an error dict."""
    return value


def require_admin(user: User | dict):
    if isinstance(user, dict):
        return user
    if user.role != "admin":
        return {"code": "FORBIDDEN", "message": "Administrator access required.", "status": 403}
    return user
