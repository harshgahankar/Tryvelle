# Milestone 4 — Accounts + admin (opencode-start-prompt)

## Delivered
- Auth: register/login (session cookie + CSRF token), logout (revokes), me, forgot (generic, dev mail sink logs token), reset (one-use, revokes all sessions). bcrypt passwords, SHA-256 token hashes, HttpOnly/SameSite cookie, Origin + CSRF checks on mutations, fixed-window rate limits on auth endpoints.
- Account: profile rename, address CRUD (owner-scoped, cross-user access → 404), wishlist add/remove (idempotent, published-only).
- Admin (role enforced server-side): product draft/create/publish-gated (needs ≥1 active variant)/archive, colors, variants, price/active flags, atomic stock adjustments (never negative + movement log), photo upload (type/size/PIL validation, metadata-stripped re-encode), try-on PNG upload (alpha required) + anchor PATCH with validation, publish (one-published-per-color via demotion) + audit events.
- `scripts/purge_expired.py` for sessions/reset tokens.
- Frontend: session AuthContext (cookie + CSRF), login/register/forgot/reset pages, wishlist page + save button, minimal admin console (list/search/publish/archive/create), header auth state.
- Tests: 19/19 pytest (authz, ownership, CSRF, stock, upload, publish rules) + 12/12 vitest; vite build green; live register→me→admin-403 verified.

## Deviations / notes
1. passlib dropped (incompatible with bcrypt 5.x wrap-bug probe); bcrypt used directly.
2. Admin orders endpoints deferred to Milestone 6 (need order creation first).
3. Full variant/asset calibration editor UI deferred to Milestone 5; console covers product lifecycle now.
4. No push performed — commits stay local per your instruction.

## Next (Milestone 5 — Integrated preview)
Product-color switching without reopening camera, asset caching, error/fallback states, mobile controls, home arrivals from API.
