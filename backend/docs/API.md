# API reference (v1)

Base path `/api/v1`. JSON everywhere except multipart admin uploads. UUID ids,
UTC timestamps, integer minor-unit money. Lists return
`{items, page, page_size, total}` (page_size ≤ 100). Errors look like
`{"error":{"code","message","fields","request_id"}}`.

Cookie-authenticated mutations need the `X-CSRF-Token` header. Order creation
needs an `Idempotency-Key` header (fresh UUID per attempt).

| Method + path | Access | Notes |
|---|---|---|
| GET /categories | Public | Active categories |
| GET /products | Public | q, category, min/max_price_minor, color, size, sort, page, page_size |
| GET /products/{slug} | Public | Published only; variants, photos, chart, try-on flags |
| GET /products/{id}/try-on-assets | Public | Published assets only |
| POST /auth/register | Public | name, email, password (10–256); sets session cookie |
| POST /auth/login | Public | Sets session cookie, returns user + CSRF token |
| POST /auth/logout | Public | Revokes session, clears cookie |
| GET /auth/me | Session | Current user |
| POST /auth/forgot-password | Public | Always generic ok (no enumeration) |
| POST /auth/reset-password | Public | One-use token; revokes all sessions |
| PATCH /me | Shopper | Rename |
| GET/POST /me/addresses | Shopper | Own addresses |
| PATCH/DELETE /me/addresses/{id} | Owner | 404 for other users' ids |
| GET /me/wishlist | Shopper | Saved products |
| PUT/DELETE /me/wishlist/{product_id} | Shopper | Idempotent; published products only |
| POST /cart/validate | Public | Server prices/stock/totals, per-line errors |
| POST /orders | Shopper | Idempotent demo order, `payment_collected: false` |
| GET /me/orders, GET /me/orders/{id} | Owner | Own orders with snapshots |
| POST /me/orders/{id}/cancel | Owner | Before completion; restores stock once |
| GET /admin/products | Admin | Draft + published, q/status filters |
| POST /admin/products | Admin | Draft; publish needs ≥1 active variant |
| PATCH /admin/products/{id} | Admin | Fields + status transitions |
| POST /admin/products/{id}/colors | Admin | Unique name per product |
| POST /admin/colors/{id}/variants | Admin | Unique SKU, non-negative price/stock |
| PATCH /admin/variants/{id} | Admin | Price/active |
| POST /admin/variants/{id}/stock-adjustments | Admin | Atomic delta, never negative, logged |
| POST /admin/products/{id}/images | Admin | PNG/JPEG/WEBP ≤5MB, re-encoded, metadata stripped |
| POST /admin/colors/{id}/try-on-assets | Admin | Transparent PNG + validated anchors |
| PATCH /admin/try-on-assets/{id}[?publish=true] | Admin | Re-calibrate; one published per color |
| GET /admin/orders | Admin | Paginated demo orders |
| PATCH /admin/orders/{id}/status | Admin | placed→confirmed→completed/cancelled only |
| GET /health, GET /ready | Public | Liveness; DB connectivity |
