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
| Catalog photos (`backend/media/sample/`, served via `/media`) | Unsplash License — free use incl. commercial, no attribution required (https://unsplash.com/license). Files: everyday-cotton-tee.jpg (photo-1521572163474), washed-linen-tee.jpg (photo-1620799140408), structured-boxy-overshirt.jpg (photo-1596755094514), heavyweight-relaxed-crewneck.jpg (photo-1556821840), pleated-twill-trouser.jpg (photo-1541099649105). Photographer credits unrecoverable from CDN URLs — credit them if identified. Content not visually verified by the developers; owner to confirm. |
| Prices / stock / sizes / charts | **SAMPLE supplier placeholders** (owner confirmed 14 Oct 2026). Replace with real supplier data before launch. |
| Owner-supplied garment PNGs (`backend/media/sample/*.png`, 5 Kurti files) | All rights with the store owner; do NOT redistribute. Anchors measured from alpha masks (wearer-anatomy convention), draft pending visual confirmation. |

## Policy

- Never add a dependency, model, or image without recording its license here.
- `npm install` / `pip install` pull from public registries; `package-lock.json` + `requirements.txt` pin exact versions.
- MedusaJS data was evaluated and **rejected** (no usable image rights); see project notes.
