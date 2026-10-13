"""Password hashing (bcrypt) + opaque token hashing (SHA-256)."""
import hashlib
import secrets

import bcrypt


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def new_token(bytes_: int = 32) -> str:
    return secrets.token_urlsafe(bytes_)


def hash_token(token: str) -> str:
    # Server stores hashes only; session/CSRF/reset tokens are opaque randoms.
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
