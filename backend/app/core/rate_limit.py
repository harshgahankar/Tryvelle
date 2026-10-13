"""Fixed-window in-memory rate limiter for auth/reset/upload endpoints."""
import time
from collections import defaultdict

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

_LIMITS = [("/api/v1/auth/", 60, 30), ("POST:/me", 60, 60)]  # (prefix, window_s, max)
_hits: dict[tuple[str, str], list[float]] = defaultdict(list)


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        key = None
        for prefix, window, maximum in _LIMITS:
            if prefix.startswith("POST:"):
                if request.method == "POST" and request.url.path.startswith(prefix[5:]):
                    key = (prefix, request.client.host if request.client else "?")
                    break
            elif request.url.path.startswith(prefix):
                key = (prefix, request.client.host if request.client else "?")
                break
        if key:
            _, window, maximum = next(l for l in _LIMITS if l[0] == key[0])
            now = time.time()
            bucket = [t for t in _hits[key] if now - t < window]
            if len(bucket) >= maximum:
                return JSONResponse(
                    {"error": {"code": "RATE_LIMITED", "message": "Too many requests. Retry shortly.",
                               "fields": {}, "request_id": "ratelimit"}}, status_code=429)
            bucket.append(now)
            _hits[key] = bucket
        return await call_next(request)
