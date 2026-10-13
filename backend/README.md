# Tryvelle API (Milestone 2 — foundation)

FastAPI + PostgreSQL (local dev defaults to a file DB) + Alembic + sample seed.
Demo mode: no payments; order shipping is zero in demo mode per api-plan.

## Setup (Windows PowerShell, from repo root)

```
python -m venv .venv
.\.venv\Scripts\pip install -r backend\requirements.txt
copy backend\.env.example backend\.env
```

## Database

```
cd backend
..\.venv\Scripts\alembic upgrade head   # apply migrations (creates dev.db locally)
..\.venv\Scripts\python scripts\seed.py # idempotent sample catalog
```

PostgreSQL (staging/prod or local via Docker): set
`DATABASE_URL=postgresql+psycopg://tryon:tryon@localhost:5432/tryon`
(`infra/docker-compose.yml` provides the container) then run the same
`alembic upgrade head`. Apply migrations before enabling dependent routes.

## Dev admin (explicit only — never a committed password)

```
$env:SETUP_ADMIN_EMAIL="you@example.com"
$env:SETUP_ADMIN_PASSWORD="..."
..\.venv\Scripts\python scripts\create_admin.py
```

## Run + test

```
..\.venv\Scripts\python -m uvicorn app.main:app --port 8000   # from backend/
..\.venv\Scripts\python -m pytest -q                           # from backend/
```

Endpoints: `GET /api/v1/health` (liveness), `GET /api/v1/ready` (DB check).
Catalog/auth/orders/admin routes land in Milestones 3–6.
