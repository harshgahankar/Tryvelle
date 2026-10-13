from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "sqlite:///./dev.db"
    ALLOWED_WEB_ORIGINS: str = "http://localhost:5173"
    SESSION_TTL_SECONDS: int = 1209600
    COOKIE_SECURE: bool = False
    STORAGE_BACKEND: str = "local"
    STORAGE_LOCAL_DIR: str = "./media"
    MEDIA_BASE_URL: str = "http://localhost:8000"  # absolute media URLs; frontend runs on another origin
    DEMO_MODE: bool = True
    SETUP_ADMIN_EMAIL: str = ""
    SETUP_ADMIN_PASSWORD: str = ""
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
