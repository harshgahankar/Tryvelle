# Recorded licenses (checked 14 Oct 2026 — re-verify on major upgrades)

## Runtime / libraries (all permit commercial use; none require source disclosure)

| Package | License | Notes |
|---|---|---|
| React, ReactDOM, Vite, Tailwind, react-router | MIT | Frontend |
| @mediapipe/tasks-vision 1.1.0 | Apache-2.0 | Pose landmarker runtime (WASM from jsDelivr, pinned) |
| FastAPI, Starlette, SQLAlchemy, Alembic, Pydantic | MIT | Backend |
| Uvicorn, Click, AnyIO, HTTPX | BSD / MIT family | Server + client |
| psycopg / psycopg-binary 3.3.6 | LGPL-3.0 | Postgres driver — dynamic linking only; swap for a BSD driver if LGPL is a concern |
| Pillow 12.3.0 | HPND | Image validation/re-encode |
| bcrypt 5.0.0 | Apache-2.0 | Password hashing |
| pytest | MIT | Tests |

## Models / data

| Item | Source / terms |
|---|---|
| Pose Landmarker Lite model | Google MediaPipe, Apache-2.0 model terms; fetched at runtime from `storage.googleapis.com` (see `VITE_POSE_MODEL_URL`). No training, no vendor lock-in beyond the pinned file. |
| Manrope / Inter fonts | SIL Open Font License 1.1 (Google Fonts) |
| Catalog seed + placeholder photos | **SAMPLE, unlicensed placeholders** (`SAMPLE` labels in seed + alt text). Permission-to-view ≠ redistribution. Replace with owned/supplier-authorized photography + a per-asset source note before any public release. |
| Try-on garment PNGs | None shipped. Upload path requires admin-provided transparent PNGs; record each asset's source + consent in the admin audit trail. |

## Policy

- Never add a dependency, model, or image without recording its license here.
- `npm install` / `pip install` pull from public registries; `package-lock.json` + `requirements.txt` pin exact versions.
- MedusaJS data was evaluated and **rejected** (no usable image rights); see project notes.
