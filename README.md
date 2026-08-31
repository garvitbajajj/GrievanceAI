# BhashaFlow

**Multilingual GenAI for Citizen Social Grievances**  
NIIT University B.Tech CSE Capstone Project

## Project Overview

BhashaFlow helps citizens describe grievances in Indian languages, uses AI to extract and translate the complaint, classifies it into the right civic category, and routes the user to the relevant government portal with next steps.

- **Input modes:** text, voice/audio, image OCR, and optional supporting proof.
- **AI pipeline:** OCR / speech-to-text -> Sarvam translation -> Gemini classification and summary -> portal routing.
- **User flow:** describe -> verify AI understanding -> add details -> review -> receive portal/action guidance.
- **Admin flow:** view, filter, assign, and update grievance statuses.

## Current Cloud Architecture

The production system is now distributed across three major providers so each workload can run where it fits best: Vercel for the static React client, Render for Node.js logic and Python AI services, and MongoDB Atlas for persistent metadata.

```text
Users
  |
  v
Vercel Frontend (React + Vite SPA)
  |
  | HTTPS API calls
  v
Render Backend (Node.js + Express)
  |
  | Google OAuth callback + JWT issue
  v
Client session on Vercel

Render Backend
  |
  | AI_ENGINE_URL / process-grievance-full
  v
Render AI Engine (FastAPI + Python)
  |
  | OCR, STT, translation, LLM analysis
  v
Gemini + Sarvam APIs

Render Backend
  |
  v
MongoDB Atlas
```

### Request Flow

1. Users open the Vercel-hosted frontend.
2. React calls the Render Node.js backend through the build-time `VITE_BACKEND_URL`.
3. The backend handles email/password auth, Google OAuth, and JWT issuance.
4. When a grievance is submitted, the backend stores a pending record and forwards media/text to the Render FastAPI AI engine.
5. The AI engine calls EasyOCR, Sarvam, and Gemini as needed, then returns structured analysis.
6. The backend stores metadata and AI output in MongoDB Atlas and returns verification/routing data to the frontend.

## Component Notes

### Frontend: Vercel

- React 18 + Vite single page app.
- `frontend/vercel.json` rewrites all routes to `index.html`, so React Router works on refresh and direct links.
- `VITE_BACKEND_URL` is injected during build/deploy so production talks to Render instead of `localhost`.
- Docker local builds also pass `VITE_BACKEND_URL` as a build arg.

### Backend: Render Node.js Service

- Express API with JWT auth, Google OAuth, grievance routes, admin routes, uploads, and scheduled follow-up emails.
- CORS allows the local frontend and the live Vercel origin: `https://bhasha-flow.vercel.app`.
- Uses `process.env.PORT || 5000`, which is required for Render port binding.
- Reads `AI_ENGINE_URL` from the environment to call the FastAPI engine. Keep this value as a clean base URL without a trailing slash to avoid double-slash request paths.
- Provides `GET /` as a lightweight health route for cloud checks and uptime pings.

### AI Engine: Render FastAPI Service

- Python 3.11 + FastAPI service for OCR, translation, speech, and grievance processing.
- `GET /` and `HEAD /` are both supported so Render and UptimeRobot checks receive `200 OK` instead of `405 Method Not Allowed`.
- `WEB_CONCURRENCY` is configured in Render for the free-tier memory budget while running EasyOCR/Gemini workloads.
- Main backend integration endpoint: `POST /process-grievance-full`.

### Data and External Services

- MongoDB Atlas stores users, grievances, AI analysis, status updates, and training data.
- Gemini handles structured classification/summarization.
- Sarvam handles translation, speech-to-text, and text-to-speech services.
- Secrets live in Render/Vercel environment variables and Jenkins credentials, not in source control.

## Cross-Service Connectivity

| Connection Path | Security Method | Implementation |
|---|---|---|
| Vercel -> Render Backend | CORS whitelist | `app.use(cors({ origin: [...] }))` includes the Vercel domain |
| Google -> Render Backend | OAuth redirect allowlist | Google Cloud Console authorized redirect URI points to the Render backend callback |
| Render Backend -> AI Engine | Service URL env var | `AI_ENGINE_URL` is configured in Render and Docker Compose |
| Cloud -> External APIs | API keys | Render/Vercel env variables and Jenkins credentials |
| UptimeRobot -> Render services | Health endpoints | `GET /` on Node.js, `GET/HEAD /` on FastAPI |

## DevOps and CI/CD

### Previous Pipeline

```text
Git push -> Jenkins local build -> Docker build -> Ngrok tunnel
```

### Current Pipeline

```text
Git push -> GitHub webhook -> Render and Vercel parallel builds
         -> automated health checks -> zero-downtime service swap
```

Jenkins now acts as the **pre-flight gatekeeper**. It still builds and runs the Docker stack locally through `docker-compose.yml` plus `docker-compose.ci.yml`, but its purpose is to catch container, syntax, dependency, and integration failures before the code reaches Render/Vercel.

CI port mapping:

| Service | Local Dev | Jenkins CI |
|---|---:|---:|
| Frontend | 3000 | 4000 |
| Backend | 5000 | 6000 |
| AI Engine | 8000 | 9000 |

## Stability

Render free-tier services can sleep after inactivity. To reduce cold-start problems:

- UptimeRobot pings the `/` route of both Render services every 5 minutes.
- Node.js returns a lightweight JSON response from `GET /`.
- FastAPI supports both `GET /` and `HEAD /`, avoiding expensive AI work during health checks.
- AI concurrency is limited with `WEB_CONCURRENCY` in Render to fit the 512 MB free-tier memory profile.

## Key Features

- Multilingual grievance submission across Indian languages.
- Text, audio, and image-based complaint intake.
- Google OAuth and email/password authentication.
- Forgot-password flow with secure email reset tokens.
- AI verification step before final submission.
- Category, priority, summary, keyword, and portal recommendation output.
- Citizen dashboard with grievance history and status.
- Admin dashboard for filtering, assignment, and status updates.
- PDF summary generation support.

## Local Development

### Prerequisites

- Git
- Docker Desktop
- VS Code or another editor

### Configure Environment

```bash
git clone https://github.com/saumya-0611/BhashaFlow.git
cd BhashaFlow
cp .env.example .env
```

Fill in `.env`:

```env
MONGO_URI=<your_mongo_uri>
JWT_SECRET=<your_jwt_secret>

GMAIL_USER=<your_gmail>
GMAIL_PASS=<your_gmail_app_password>
TECH_LEAD_EMAIL=<tech_lead_email>

SARVAM_API_KEY=<your_sarvam_key>
GEMINI_API_KEY=<your_gemini_key>
GEMINI_MODEL=gemini-3-flash-preview

GOOGLE_CLIENT_ID=<your_google_client_id>
GOOGLE_CLIENT_SECRET=<your_google_client_secret>
VITE_GOOGLE_CLIENT_ID=<same_as_GOOGLE_CLIENT_ID>

FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
VITE_BACKEND_URL=http://localhost:5000
```

### Run Locally

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | `http://localhost:3000` |
| Backend API | `http://localhost:5000` |
| AI Engine | `http://localhost:8000` |

Use `docker compose up --build` after code changes, dependency changes, or `.env` changes because the app code is baked into the Docker images.

## Project Structure

```text
BhashaFlow/
|-- frontend/                  React + Vite frontend
|   |-- vercel.json            SPA rewrite config for Vercel
|   |-- Dockerfile             Build-time Vite env injection
|   `-- src/
|       |-- pages/             Citizen, admin, auth, and grievance pages
|       |-- components/        Shared UI components
|       `-- utils/api.js       Central Axios client
|-- backend/                   Node.js + Express backend
|   |-- server.js              App bootstrap, CORS, health check, routes
|   |-- routes/                Auth, Google OAuth, grievance, admin routes
|   |-- models/                Mongoose schemas
|   `-- utils/                 Portal data, mailer, cron jobs
|-- ai-engine/                 FastAPI AI service
|   |-- main.py                Health routes and AI endpoints
|   `-- services/              Gemini, Sarvam, OCR, speech, grievance logic
|-- docker-compose.yml         Local development stack
|-- docker-compose.ci.yml      Jenkins CI override
|-- Jenkinsfile                Docker pre-flight CI pipeline
`-- .env.example               Environment variable template
```

## Troubleshooting

| Issue | Fix |
|---|---|
| React route refresh returns 404 on Vercel | Confirm `frontend/vercel.json` is deployed with the SPA rewrite |
| Frontend calls localhost in production | Check `VITE_BACKEND_URL` in Vercel and rebuild |
| Backend fails to start on Render | Confirm it uses `process.env.PORT` and required env vars are set |
| AI call has a double slash in URL | Set `AI_ENGINE_URL` without a trailing slash |
| FastAPI health check returns 405 | Confirm `@app.head("/")` is deployed |
| Render service sleeps | Confirm UptimeRobot is pinging `/` every 5 minutes |
| Category enum errors | Keep Gemini schema, Mongoose enum, and portal data categories aligned |

## Team

- **Tech Lead / DevOps:** Saumya Srivastava - CI/CD, Docker, deployment, cross-service integration.
- **Frontend:** `frontend/`
- **Backend:** `backend/`
- **AI/ML:** `ai-engine/`

## License

This project is developed as part of the NIIT University B.Tech CSE Capstone Program.
