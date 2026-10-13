# API Plan

## Contract conventions

Base path /api/v1. JSON requests and responses except multipart admin media uploads. UUID IDs, ISO 8601 UTC timestamps and integer minor-unit money. Lists return items, page, page_size and total. Cap page_size at 100. Validate input with explicit schemas.

Error shape: {"error":{"code":"OUT_OF_STOCK","message":"Selected size is unavailable","fields":{"quantity":"Reduce quantity"},"request_id":"..."}}

Use 400 malformed request, 401 unauthenticated, 403 forbidden, 404 missing or inaccessible owner resource, 409 state/stock/idempotency conflict, 422 schema validation and 429 rate limit. Never expose stack traces.

## Endpoints

| Method and path | Access | Request or result |
|---|---|---|
| GET /categories | Public | Active categories |
| GET /products | Public | q, category, min_price_minor, max_price_minor, color, size, sort, page, page_size |
| GET /products/{slug} | Public | Published product, variants, photos, chart and try-on availability |
| GET /products/{id}/try-on-assets | Public | Published color assets, URLs, anchors, dimensions and versions |
| POST /auth/register | Public | name, email, password; shopper account |
| POST /auth/login | Public | email/password; sets session cookie, returns user and CSRF token |
| POST /auth/logout | Session | Revoke session and clear cookie |
| GET /auth/me | Session | Current profile and CSRF token |
| POST /auth/forgot-password | Public | email; generic response irrespective of account existence |
| POST /auth/reset-password | Public | token, new_password; consume token and revoke sessions |
| PATCH /me | Shopper | name only initially |
| GET /me/addresses | Shopper | Own addresses |
| POST /me/addresses | Shopper | Address fields |
| PATCH /me/addresses/{id} | Owner | Address fields |
| DELETE /me/addresses/{id} | Owner | Remove address |
| GET /me/wishlist | Shopper | Own saved products |
| PUT /me/wishlist/{product_id} | Shopper | Idempotently save published product |
| DELETE /me/wishlist/{product_id} | Shopper | Idempotently remove |
| POST /cart/validate | Public | items [{variant_id,quantity}]; current prices, stock, totals and per-item errors |
| POST /orders | Shopper | items, address_id, expected_total_minor; Idempotency-Key header |
| GET /me/orders | Shopper | Paginated own orders |
| GET /me/orders/{id} | Owner | Own order with snapshot items |
| POST /me/orders/{id}/cancel | Owner | Cancel eligible order and restore stock once |
| GET /admin/products | Admin | Draft and published catalog |
| POST /admin/products | Admin | Product draft |
| PATCH /admin/products/{id} | Admin | Validated fields; publish/archive via status |
| POST /admin/products/{id}/colors | Admin | name, hex |
| POST /admin/colors/{id}/variants | Admin | sku, size_label, price_minor, initial stock |
| PATCH /admin/variants/{id} | Admin | Price and active flag |
| POST /admin/variants/{id}/stock-adjustments | Admin | delta and reason, atomic change |
| POST /admin/products/{id}/images | Admin | Multipart image and alt text |
| POST /admin/colors/{id}/try-on-assets | Admin | Multipart transparent image plus calibration metadata |
| PATCH /admin/try-on-assets/{id} | Admin | Anchors, calibration or validated publish status |
| GET /admin/orders | Admin | Paginated demo orders |
| PATCH /admin/orders/{id}/status | Admin | Allowed transition only |
| GET /health | Public | Service liveness without secrets |
| GET /ready | Deployment | Database connectivity; restrict detailed response |

## Order example

POST /orders with Idempotency-Key: a new UUID per checkout attempt.
Body: {"items":[{"variant_id":"<uuid>","quantity":1}],"address_id":"<uuid>","expected_total_minor":129900}
Response 201: {"id":"<uuid>","order_number":"DEMO-...","status":"demo_placed","currency":"INR","total_minor":129900,"payment_collected":false}

Expected total protects shoppers from silent price changes; return PRICE_CHANGED with validated totals if it differs. Server validates address ownership, product state, stock, quantity and prices. Initial shipping is explicitly zero in demo mode. No browser-supplied totals override stored values.

## Product and asset response

Each color includes color_id, name, hex and its variants. Asset payload includes color_id, asset_url, width, height, version, schema_version, anchors and calibration. Anchors are normalized coordinates within the asset, not body measurements. Try-on availability must derive from published validated assets.

## Access and upload controls

Enforce ownership in queries, not just UI routes. All cookie-authenticated mutations need CSRF validation. Rate-limit auth, reset and upload endpoints. Bound password, field and quantity lengths.

Validate file signatures, decoded dimensions and maximum bytes; decode/re-encode images, reject unsafe SVG and strip metadata. Use random asset keys. Only expose published assets. Use controlled same-origin media or explicit asset CORS headers.

Live try-on has no webcam upload or remote inference endpoint. Payment webhooks and photo-generation jobs are outside this API version.
