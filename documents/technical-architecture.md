# Technical Architecture

## Recommended implementation

| Layer | Proposed choice | Responsibility |
|---|---|---|
| Web | React, TypeScript, Vite | Shopping UI and camera workspace |
| Styling | Tailwind CSS with CSS tokens | Responsive components |
| Pose | MediaPipe Tasks Vision Pose Landmarker | Body landmarks from browser video |
| Rendering | Canvas 2D | Garment translation, scale, rotation and composition |
| API | FastAPI with Pydantic | Authentication, catalog, cart validation, orders and admin |
| Database | PostgreSQL with SQLAlchemy and Alembic | Durable records and migrations |
| Media | S3-compatible object storage | Catalog photos, transparent garments and thumbnails |
| Tests | Browser integration plus API tests | Camera lifecycle, permissions, ownership and stock correctness |

Treat versions as setup choices: choose supported releases, check compatibility and licenses, pin package/model versions, and commit lockfiles. Live preview does not require a GPU server.

## Data boundaries

Web browser calls API for catalog, auth and orders. It downloads public garment assets and the pinned pose model. Camera frames go to local inference and the local canvas only. API writes records to PostgreSQL. Administrator uploads vetted garment assets through API-controlled storage.

Do not send images or landmarks as telemetry. Serve model and WASM from a configured trusted origin with caching. Configure cross-origin asset access so a local canvas snapshot is not blocked by a tainted canvas.

## Repository layout

clothing-store/
  docs/                     these planning files
  frontend/
    src/
      app/                  routing and providers
      features/catalog/
      features/try-on/       camera service, pose adapter, renderer and state machine
      features/cart/
      features/auth/
      features/orders/
      features/admin/
      components/           reusable UI
      lib/                  API client, validation and helpers
      styles/
    public/models/          licensed, pinned runtime assets if self-hosted
  backend/
    app/
      api/                  route groups
      models/
      schemas/
      services/
      core/                 configuration and authentication
    migrations/
    tests/
  infra/                    local database and deployment configuration

## Sessions

Use same-site deployment for web and API where possible. Store a cryptographically random session token in an HttpOnly, Secure, SameSite cookie; store its hash and expiry server-side. Protect cookie-authenticated mutations with CSRF token validation and Origin checks. Configure development cookies separately. Never store passwords or session tokens in localStorage.

Use password hashing, request throttling, one-use password reset tokens with expiry and a mail adapter. Development may use a local mail sink; production needs a configured delivery service.

## Configuration contract

Browser: VITE_API_BASE_URL, VITE_POSE_MODEL_URL, VITE_POSE_WASM_BASE_URL and VITE_DEMO_MODE.
Server: DATABASE_URL, ALLOWED_WEB_ORIGINS, SESSION_TTL_SECONDS, COOKIE_SECURE, STORAGE_BUCKET, STORAGE_ENDPOINT, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY, EMAIL_PROVIDER configuration and DEMO_MODE.

Browser-prefixed configuration is public. Never place database credentials, storage secrets or mail keys there. Include .env.example containing placeholders only.

## Deployment and operations

Deploy web and API over HTTPS. Restrict CORS to configured origins, configure camera Permissions Policy for the intended host, cap uploads and enforce MIME validation. Record structured API errors without secrets or camera data. Maintain health/readiness endpoints, migration instructions, backup/restore steps and documented asset versioning.

Apply migrations before enabling dependent routes. If asset or inference loading fails, degrade to product photos and a clear retry option. Use a storage adapter for local development instead of requiring production credentials on day one.
