# Database Models

Use UUID primary keys, UTC timestamps and migrations. Prices are integer minor units: INR 129900 means ₹1299.00. Avoid floating point for money. Foreign keys and database constraints are required.

| Table | Main fields | Constraints and relationships |
|---|---|---|
| users | id, name, email_normalized, password_hash, role, created_at | Unique normalized email; role shopper/admin; no role input from public registration |
| sessions | id, user_id, token_hash, csrf_token_hash, expires_at, revoked_at | Unique token hash; belongs to user |
| password_reset_tokens | id, user_id, token_hash, expires_at, used_at | One-use hashed token |
| categories | id, name, slug | Unique slug |
| products | id, category_id, slug, title, description, status, currency, size_chart_id, created_at | Unique slug; draft/published/archived |
| product_colors | id, product_id, name, hex | Unique product and color name |
| product_variants | id, product_color_id, sku, size_label, price_minor, stock_quantity, active | Unique SKU and color-size pair; price/stock nonnegative |
| product_images | id, product_id, product_color_id nullable, asset_key, alt_text, sort_order | Product color must belong to same product |
| size_charts | id, name, unit, measurement_definition | Explicit cm/in units and measurement meaning |
| size_chart_rows | id, size_chart_id, size_label, chest, length, shoulder nullable | Unique chart and size; positive values |
| try_on_assets | id, product_color_id, asset_key, width, height, anchor_json, calibration_json, schema_version, version, status | Draft/validated/published; one published asset per color |
| wishlist_items | user_id, product_id, created_at | Composite primary key; cascade removal |
| addresses | id, user_id, recipient, line1, line2, city, region, postal_code, country, phone | Access restricted to owner |
| orders | id, user_id, order_number, status, currency, subtotal_minor, shipping_minor, total_minor, address_snapshot_json, idempotency_key, created_at | Unique order number and user-idempotency pair |
| order_items | id, order_id, variant_id nullable, sku_snapshot, title_snapshot, color_snapshot, size_snapshot, unit_price_minor, quantity | Quantity positive; preserve historical snapshots |
| stock_movements | id, variant_id, quantity_delta, reason, order_id nullable, created_at | Audit inventory changes; transaction with stock update |
| admin_audit_events | id, actor_id, entity_type, entity_id, action, created_at | No camera content or auth secrets |

## Cart ownership

For the first release, cart lives in browser storage as variant IDs and quantities only. Browser storage contains no authentication credentials. API validates cart on demand and again during checkout. Prices from browser storage are never authoritative. Account-synced carts can be added later with cart and cart_items tables.

## Relationships

Category has products. Product has colors; color has size variants and try-on asset versions. Product has photographs and optional size chart. User has sessions, addresses, wishlist entries and orders. Order has snapshot items and stock movements.

## Order transactions

Validate the idempotency key, lock required variants in stable order, verify stock, read current prices, calculate totals, insert order and snapshots, decrement stock and record movements in one transaction. Roll back everything if any item fails. A retry with the same key and same payload returns the original order; the same key with a different payload returns conflict.

Initial status flow: demo_placed → demo_confirmed → demo_completed. Cancellation is allowed before completion and restores stock once in a transaction. There is no paid state in demo mode.

## Indexes and retention

Index product category/status, normalized email, variant color, orders user/created_at and token hashes. Introduce full-text search only if simple search proves inadequate.

Expire and purge revoked/expired sessions and reset tokens through a scheduled maintenance command. Archive products rather than deleting ordered history. Do not create tables for camera frames, body landmarks or face identity. Keep shopper PII out of logs.
