import re
import uuid

from pydantic import BaseModel, EmailStr, field_validator

PASSWORD_MIN = 10


class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("name")
    @classmethod
    def name_ok(cls, v: str) -> str:
        v = v.strip()
        if not (1 <= len(v) <= 120):
            raise ValueError("Name must be 1-120 characters.")
        return v

    @field_validator("password")
    @classmethod
    def password_ok(cls, v: str) -> str:
        if len(v) < PASSWORD_MIN or len(v) > 256:
            raise ValueError(f"Password must be {PASSWORD_MIN}-256 characters.")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_ok(cls, v: str) -> str:
        if len(v) < PASSWORD_MIN or len(v) > 256:
            raise ValueError(f"Password must be {PASSWORD_MIN}-256 characters.")
        return v


class ProfilePatch(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_ok(cls, v: str) -> str:
        v = v.strip()
        if not (1 <= len(v) <= 120):
            raise ValueError("Name must be 1-120 characters.")
        return v


class AddressIn(BaseModel):
    recipient: str
    line1: str
    line2: str = ""
    city: str
    region: str = ""
    postal_code: str
    country: str = "IN"
    phone: str = ""

    @field_validator("recipient", "line1", "city", "postal_code")
    @classmethod
    def nonempty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Required.")
        if len(v) > 200:
            raise ValueError("Too long (max 200).")
        return v.strip()


class AddressOut(AddressIn):
    id: uuid.UUID


class WishlistOut(BaseModel):
    product_id: uuid.UUID
    slug: str
    title: str
