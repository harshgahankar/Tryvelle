"""Spec error envelope: {"error": {"code", "message", "fields", "request_id"}}."""
import uuid

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def error(code: str, message: str, status: int = 400, fields: dict | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": {
            "code": code,
            "message": message,
            "fields": fields or {},
            "request_id": uuid.uuid4().hex[:12],
        }},
    )


async def validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    fields = {}
    for e in exc.errors():
        loc = ".".join(str(p) for p in e["loc"][1:]) or "query"
        fields[loc] = e["msg"]
    return error("VALIDATION_ERROR", "Request failed schema validation.", 422, fields)
