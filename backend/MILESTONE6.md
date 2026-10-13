# Milestone 6 — Shopping flows (opencode-start-prompt)

## Delivered
- `POST /cart/validate` (public): server-authoritative prices/stock/totals, per-line errors, zero demo shipping. Client prices are never accepted (only variant_id + quantity).
- `POST /orders` (shopper): idempotency-key creation, stable-order locking, atomic conditional decrement (oversell-safe on SQLite and Postgres), snapshots, stock movements, one-transaction rollback; same key+payload returns original, same key+other payload → 409, stale expected total → PRICE_CHANGED with server totals.
- Owner history/detail/cancel (cancel restores stock exactly once; completed/cancelled reject); admin list + allowed transitions (placed→confirmed→completed, cancel path shared).
- Frontend: cart resolves lines to variants and shows server totals + per-line stock states; checkout requires login, uses saved addresses, mints an idempotency key per attempt with double-submit lock and PRICE_CHANGED retry; orders page with cancel; admin orders console; confirmation from the API; shipping displayed as Free everywhere.
- Tests: 24/24 pytest (incl. 4-thread oversell race: 1 placed, 3 OUT_OF_STOCK) + 16/16 vitest; builds green; live register→address→validate→DEMO order verified.

## Notes
1. Mock-only `heavy-canvas-chore-shirt` bag lines correctly show "no longer available" — they have no server variant. Remove or re-add from the shop.
2. `ShopContext.placeOrder` local stub is now unused by checkout (kept for compatibility).
3. No push performed — commits stay local per your instruction.

## Next (Milestone 7 — Quality + deployment)
HTTPS staging notes, device matrix records, migration/restore docs, release checklist, deployment gate verification.
