"""Scheduled maintenance: purge revoked/expired sessions and used/expired reset tokens.
Usage from backend/:  python scripts/purge_expired.py"""
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import SessionLocal  # noqa: E402
from app.models.models import PasswordResetToken, Session as SessionRow  # noqa: E402

if __name__ == "__main__":
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        s = db.query(SessionRow).filter(
            (SessionRow.revoked_at.is_not(None)) | (SessionRow.expires_at < now)).delete(synchronize_session=False)
        t = db.query(PasswordResetToken).filter(
            (PasswordResetToken.used_at.is_not(None)) | (PasswordResetToken.expires_at < now)).delete(synchronize_session=False)
        db.commit()
    print({"sessions_purged": s, "reset_tokens_purged": t})
