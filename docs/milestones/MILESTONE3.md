# Milestone 3 — Catalog with real API (opencode-start-prompt)

## Delivered
- Backend `GET /api/v1/categories`, `/products` (q, category, min/max_price_minor, color, size, sort, page, page_size ≤ 100), `/products/{slug}` (variants, photos, chart, try-on availability; 404 envelope for missing/draft/archived), `/products/{id}/try-on-assets` (published only, UUID-validated).
- Spec error envelope + 422 validation handler; `/media` static mount (remote sample URLs pass through).
- Seed: sample photo URLs + one published SAMPLE asset (everyday-cotton-tee Cream, illustrative anchors — replace before release).
- Frontend `src/lib/api.js` (env base URL with local default), Shop on live API (debounced search, server price/sort, pagination, loading skeleton, retryable error, empty state), ProductDetail on live API (variant-driven price/stock, per-color try-on badge, chart from API, unavailable-variant + missing-product states).
- Tests: 11/11 pytest passing; endpoints verified against live uvicorn; `npm run build` passes.

## Notes
1. Cart still uses the mock catalog for price/image lookup — slugs/prices match the seed (1299/1499/1899/2499/2199), so totals stay consistent until cart validation lands (Milestone 6).
2. Home arrivals remain mock data; home API wiring is optional polish for Milestone 5.
3. No push performed — commits stay local per your instruction.

## Next (Milestone 4 — Accounts + admin)
Auth (register/login/logout/me, cookie sessions + CSRF), wishlist, admin product/variant/asset CRUD with calibration + publishing, server-side role enforcement.
