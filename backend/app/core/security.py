"""Password hashing + opaque token helpers. No camera data ever touches this module."""
import secrets

from passlib.context import CryptContext

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return _pwd.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _pwd.verify(password, password_hash)


def new_token(bytes_: int = 32) -> str:
    return secrets.token_urlsafe(bytes_)


def hash_token(token: str) -> str:
    # Server stores hashes only; session/CSRF/reset tokens are opaque randoms.
    return _pwd.hash(token)
