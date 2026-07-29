# AI-Integrated Public Health System

## What this is
A small full-stack project combining a Python backend with JavaScript frontends (web and mobile) to provide public-health related data collection and visualization powered by AI-assisted features.

### Stack
- **Language(s):** JavaScript (frontend + mobile), Python (backend)
- **Framework / runtime:** Python (likely Flask/FastAPI) backend; JavaScript web frontend (React/Vue/Next.js); mobile app (React Native / Expo or other)
- **Notable files:** docker-compose.yml, .env, backend/ (Python services), frontend/ (web client), mobile app/ (mobile client)

## How it's organized
```
.env                             environment variables for local/deploy
AI-Integrated Public Health System  (project title / metadata file)
backend/                         Python backend (API, data processing, ML/AI integration)
frontend/                        JavaScript web client
mobile app/                      JavaScript mobile client
docker-compose.yml               orchestrates services (db, backend, frontend)
```
How it fits together: The docker-compose.yml wires up the backend and any required services (database, cache). The backend exposes HTTP APIs consumed by the frontend and mobile app. The repo separates UI (frontend/mobile) from server code (backend).

## How to run it (shortest path)
1. Create a .env file at the repo root (a sample .env is present).
2. Start services with Docker Compose:

```bash
# from repository root
cp .env .env.local  # make a local copy and edit any secrets
docker-compose up --build
```

3. Backend: by default should be reachable at http://localhost:8000 (or port defined in docker-compose).
4. Frontend / Mobile: the docker-compose config or each project's README (frontend/, mobile app/) may include start scripts. If these are separate Node projects:

```bash
# frontend
cd frontend
npm install
npm start

# mobile (if React Native / Expo)
cd "mobile app"
npm install
npm start
```

### Important env vars
- Any API keys, DB connection strings, or AI service credentials should go into the top-level .env. Do not commit secrets.

## Notes for maintainers
- Repo looks like a mixed Python/JS project. Inspect backend/ for the Python entrypoint (app.py, main.py) and frontend/package.json for scripts.
- If you expect CI or container builds, check .github/workflows/ or Dockerfile(s) inside backend/ and frontend/.

## Try asking
- Where is the backend entrypoint (which file starts the API server) inside backend/?
- Which framework does the frontend use (is there a package.json in frontend/ and what are the start/build scripts)?
- Does the docker-compose.yml start a database service, and if so what credentials/ports are expected?

---

(If you want, I can expand this README with run/debug instructions after I inspect backend/, frontend/, and mobile app/ files, and add a basic Development section or a CONTRIBUTING guide.)
