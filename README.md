# AI-Integrated Public Health System

## What this is
A full-stack public-health platform: Python FastAPI backend plus JavaScript web and mobile clients. It provides data collection, OCR/AI analysis, reporting, and dashboards, intended for deployments using Docker Compose or local development.

### Stack
- **Language(s):** JavaScript (frontend & mobile), Python (backend)
- **Framework / runtime:** FastAPI (backend, uvicorn), React (frontend, react-scripts), React Native (mobile)
- **Notable files:** docker-compose.yml, .env.example, backend/Dockerfile, backend/app/main.py (FastAPI entrypoint), init-db.sql, nginx.conf, prometheus.yml

## How it's organized
```
.env.example                      example env file (copy to .env and edit)
init-db.sql                       Postgres initialization + minimal schema
nginx.conf                        simple reverse proxy for backend/frontend
prometheus.yml                    prometheus scrape config
backend/                          FastAPI backend (app/) + Dockerfile + requirements.txt
frontend/                         React web client (package.json)
mobile app/                       React Native mobile client (package.json, App.js)
docker-compose.yml                orchestrates postgres, redis, backend, frontend, nginx, monitoring
CONTRIBUTING.md                   contribution guide
DEVELOPMENT.md                    local development instructions
README.md                         this file
```

How it fits together: docker-compose boots Postgres and Redis, builds and runs the backend (uvicorn app.main:app on port 8000), runs Celery workers, and serves the frontend on port 3000. Nginx reverse-proxies /api and websocket routes to the backend and serves frontend static content.

## Backend entrypoint and important files
- Entrypoint: backend/app/main.py — FastAPI app exposed as `app` and started by the Dockerfile with:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- Backend config: backend/app/config.py — primary environment variables and defaults (the app loads .env by default). Key env vars you should set in .env or your environment:
  - DATABASE_URL (default: postgresql://user:password@localhost:5432/public_health_db)
  - POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB (used by docker-compose)
  - REDIS_URL (redis://redis:6379/0)
  - OPENAI_API_KEY, OPENAI_MODEL, OPENAI_MAX_TOKENS, OPENAI_TEMPERATURE
  - AZURE_FORM_RECOGNIZER_ENDPOINT, AZURE_FORM_RECOGNIZER_KEY
  - AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET
  - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
  - SENDGRID_API_KEY, EMAIL_FROM
  - SECRET_KEY (change for production)
  - CELERY_BROKER_URL, CELERY_RESULT_BACKEND
  - SENTRY_DSN (optional)

(See backend/app/config.py for the full list and defaults.)

## How to run
Recommended (Docker Compose — all services):

```bash
# From repository root
cp .env.example .env
# Edit .env and add any API keys (OPENAI_API_KEY etc.)
docker-compose up --build
```

Services started by docker-compose (important ports):
- Postgres: 5432
- Redis: 6379
- Backend (uvicorn): 8000
- Frontend (React): 3000
- Nginx: 80
- Prometheus: 9090
- Grafana: 3001

Check backend health: http://localhost:8000/health

Run backend locally without Docker:

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Make sure DATABASE_URL + REDIS_URL point to reachable services
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Run frontend locally:

```bash
cd frontend
npm install
npm start
# App will run on http://localhost:3000
```

Run mobile app (React Native):

```bash
cd "mobile app"
npm install
npm start
# Use `npm run android` or `npm run ios` to build on device/emulator
```

## Files I added for local/production readiness
- init-db.sql — creates the `public_health_user` user, `public_health_db` and a minimal schema (users, reports). This file is mounted into the Postgres container and executes on first initialization.
- nginx.conf — lightweight reverse proxy configuration used by the nginx service in docker-compose.
- prometheus.yml — Prometheus scrape config (targets backend metrics path /metrics).
- .env.example — non-secret placeholders for all required env vars; copy to .env.
- CONTRIBUTING.md and DEVELOPMENT.md — contributor and developer setup guidance.

## Troubleshooting & notes
- init-db.sql only runs on the first initialization of the Postgres volume. If Postgres container is already initialized, changes to init-db.sql won't re-run; remove the postgres_data volume to reinitialize (be careful: this deletes data).
- If nginx fails to start, check docker logs: `docker-compose logs nginx` — ensure nginx.conf is present and backend/frontend are healthy.
- If the backend needs DB migrations, check for Alembic configuration in backend/ (if present) and run `alembic upgrade head` from backend before starting Celery tasks.
- For HTTPS: docker-compose mounts ./ssl into nginx; if you don't have certs, either add them to ./ssl or update nginx.conf to serve HTTP only.

## Next steps you might want me to do
- Add a LICENSE (MIT/Apache)
- Add Alembic migrations and wiring to docker-compose to run them on startup
- Create a simple GitHub Actions workflow to run lint/tests

If you'd like, I will add any of the above and tweak README further (examples, API documentation snippets, or screenshots).
