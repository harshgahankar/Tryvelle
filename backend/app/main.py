from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.errors import validation_handler
from app.api.v1.admin import router as admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.catalog import router as catalog_router
from app.api.v1.health import router as health_router
from app.api.v1.me import router as me_router
from app.api.v1.orders import cart_router, orders_router
from app.core.config import get_settings
from app.core.rate_limit import RateLimitMiddleware

settings = get_settings()

app = FastAPI(title="Tryvelle API", version="0.4.0")
app.add_exception_handler(RequestValidationError, validation_handler)
app.add_middleware(RateLimitMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.ALLOWED_WEB_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api/v1", tags=["system"])
app.include_router(health_router, tags=["system"])  # bare /health + /ready
app.include_router(catalog_router, prefix="/api/v1", tags=["catalog"])
app.include_router(auth_router, prefix="/api/v1", tags=["auth"])
app.include_router(me_router, prefix="/api/v1", tags=["account"])
app.include_router(cart_router, prefix="/api/v1", tags=["cart"])
app.include_router(orders_router, prefix="/api/v1", tags=["orders"])
app.include_router(admin_router, prefix="/api/v1", tags=["admin"])

import os  # noqa: E402

os.makedirs(settings.STORAGE_LOCAL_DIR, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.STORAGE_LOCAL_DIR), name="media")
