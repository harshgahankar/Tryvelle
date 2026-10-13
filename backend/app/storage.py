"""Storage adapter. Local filesystem for dev; S3-compatible bucket later.

Admin uploads get random asset keys; only published assets are ever served.
"""
import os
import secrets

from app.core.config import get_settings


def store_local(filename: str, data: bytes) -> str:
    settings = get_settings()
    if settings.STORAGE_BACKEND != "local":
        raise RuntimeError("Only the local storage adapter is implemented in M2.")
    os.makedirs(settings.STORAGE_LOCAL_DIR, exist_ok=True)
    ext = os.path.splitext(filename)[1].lower()[:8]
    key = f"{secrets.token_hex(16)}{ext}"
    path = os.path.join(settings.STORAGE_LOCAL_DIR, key)
    with open(path, "wb") as f:
        f.write(data)
    return key
