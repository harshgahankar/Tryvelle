# Release checklist — demo first release (all must be true)

- [ ] Served over **HTTPS** (camera requires it outside localhost); `COOKIE_SECURE=true` in prod env.
- [ ] Camera `Permissions-Policy: camera=(self)` set on the web host.
- [ ] `alembic upgrade head` applied to the prod DB **before** enabling dependent routes.
- [ ] Backup/restore runbook tested (see root README).
- [ ] `LICENSES.md` re-verified for current pins; no unlicensed product photography shipped (seed still SAMPLE or replaced with authorized assets + source notes).
- [ ] Pose model + WASM pins unchanged or re-validated on target browsers.
- [ ] No secrets in `frontend/dist` (re-run the audit: `SETUP_ADMIN|DATABASE_URL|STORAGE_SECRET` must match nothing); no `.env` committed.
- [ ] Network inspection: no camera frame/landmark leaves the browser; none in API requests/logs.
- [ ] Cookie (HttpOnly/SameSite), CSRF, Origin, role, ownership tests green (`pytest -q`).
- [ ] Admin bootstrap via env only; no reusable credentials; admin list minimal.
- [ ] No payment UI anywhere (grep: card/stripe/upi-collect); every order screen states **demo — no payment collected**.
- [ ] Catalog still browsable with camera/model failures (fallbacks shown, not blank).
- [ ] `DEVICE_MATRIX.md` has passing laptop + phone entries for the try-on gate.
- [ ] Rate limits sane for expected traffic; CORS origins restricted to the prod host.
- [ ] `purge_expired.py` scheduled (sessions/reset tokens).
