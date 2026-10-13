# Milestone 2 — Foundation (opencode-start-prompt)

## Delivered
- `backend/` FastAPI scaffold: config (public settings only), session/token helpers, local storage adapter, `/api/v1/health` + `/ready`.
- Full tables per database-models: users, sessions, password resets, categories, products, colors, variants, images, size charts + rows, try-on assets, wishlist, addresses, orders + items, stock movements, admin audit. UUID PKs, UTC timestamps, minor-unit money, FK + CHECK constraints.
- Alembic toolchain + `migrations/versions/*_initial_schema.py`; `alembic upgrade head` verified on SQLite.
- Idempotent sample seed (4 categories, 5 products, 29 variants, draft try-on metadata marked illustrative) + env-only dev admin bootstrap.
- Pinned `requirements.txt` (lockfile committed); `.env.example` placeholders only.
- 5 pytest tests passing; `/health` → ok, `/ready` → true verified against live uvicorn.

## Deviations / notes
1. Local dev defaults to SQLite file DB (no Docker/Postgres on this machine); Postgres via `DATABASE_URL` + `infra/docker-compose.yml` for staging/prod. Models stay portable (no PG-only types).
2. Demo shipping: backend `orders.shipping_minor` defaults to 0 per api-plan; the React storefront still displays ₹99/199 until the real orders API lands (Milestone 6), as previously recorded.
3. No push performed — commits stay local per your instruction.

## Next (Milestone 3 — Catalog)
Public `GET /categories`, `/products` (search/filter/sort/paginate), `/products/{slug}`, try-on asset URLs; frontend shop/detail switched from mock data to the API.
