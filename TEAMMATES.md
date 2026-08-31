# Team Coding Workflow and Deployment Notes

This guide explains how the team should build, test, and ship BhashaFlow in its current cloud setup.

## 1. Current Architecture

BhashaFlow now runs as a distributed app:

```text
Vercel Frontend (React SPA)
  -> Render Backend (Node.js / Express)
    -> Render AI Engine (FastAPI / Python)
      -> Gemini + Sarvam APIs
    -> MongoDB Atlas
```

### Request Flow

1. Users access the React frontend on Vercel.
2. The frontend calls the Render backend using `VITE_BACKEND_URL`, which is baked into the Vite build.
3. The backend handles Google OAuth, email/password auth, and JWT creation.
4. Grievance media/text is sent from the backend to the Render FastAPI AI engine.
5. MongoDB Atlas stores users, grievance metadata, AI analysis, status history, and training data.

## 2. Provider Responsibilities

| Layer | Provider | Responsibility |
|---|---|---|
| Frontend | Vercel | Static React/Vite SPA hosting with React Router support |
| Logic/API | Render | Node.js backend, auth, uploads, grievance APIs, portal routing |
| AI | Render | FastAPI service for OCR, Sarvam, Gemini, and grievance processing |
| Data | MongoDB Atlas | Persistent application data |
| External AI | Gemini + Sarvam | LLM classification, translation, STT/TTS, OCR assistance |

## 3. Important Deployment Changes

### Frontend

- `frontend/vercel.json` rewrites every path to `/index.html`, so React Router works for direct page loads.
- `VITE_BACKEND_URL` must be set in Vercel. Production should point to the Render backend, not localhost.
- Local Docker builds pass `VITE_BACKEND_URL` as a build argument.

### Backend

- The backend must run on `process.env.PORT || 5000` for Render.
- CORS must allow the Vercel domain: `https://bhasha-flow.vercel.app`.
- `AI_ENGINE_URL` must point to the AI service base URL. Keep it clean, without a trailing slash, so requests do not become `//process-grievance-full`.
- `GET /` is the lightweight backend health check.

### AI Engine

- FastAPI supports both `GET /` and `HEAD /` on the health route.
- `HEAD /` prevents Render/UptimeRobot health checks from causing `405 Method Not Allowed`.
- `WEB_CONCURRENCY` is configured in Render to control memory use on the 512 MB free tier.

## 4. CI/CD Flow

### Old Flow

```text
Git push -> Jenkins local build -> Docker build -> Ngrok tunnel
```

### Current Flow

```text
Git push -> GitHub webhook -> Render/Vercel parallel builds
         -> automated health checks -> zero-downtime swap
```

Jenkins is now the **pre-flight gatekeeper**. It validates Docker images locally before the cloud deployment. This catches problems such as syntax errors, missing dependencies, bad env wiring, and service startup failures before Render/Vercel build the live services.

## 5. Cross-Service Networking

| Connection Path | Security Method | Implementation |
|---|---|---|
| Vercel -> Render Backend | CORS whitelist | `app.use(cors({ origin: [...] }))` includes the Vercel URL |
| Google -> Render Backend | OAuth redirect allowlist | Authorized redirect URIs in Google Cloud Console |
| Render Backend -> AI Engine | Service URL env var | `AI_ENGINE_URL` in Render dashboard |
| Cloud -> External APIs | API keys | Secrets stored in Render/Vercel env variables |
| UptimeRobot -> Render | Health checks | Pings `/` every 5 minutes |

## 6. Stability Rules

Render free-tier services sleep after inactivity. To reduce user-facing cold starts:

- UptimeRobot pings both Render services every 5 minutes.
- Backend health check: `GET /`.
- AI health check: `GET /` and `HEAD /`.
- Health checks must stay lightweight and must not trigger OCR, Gemini, Sarvam, or database-heavy work.

## 7. Daily Development Routine

Always start from the latest `main`:

```bash
git checkout main
git pull origin main
```

Create a feature branch:

```bash
git checkout -b feature/name-of-your-feature
```

Run the app:

```bash
docker compose up --build
```

Use `--build` whenever you changed code, pulled new code, changed dependencies, or changed environment variables. The frontend and AI engine are especially build-sensitive because app code and Vite env variables are baked into their images.

## 8. Local Ports

| Service | Local URL |
|---|---|
| Frontend | `http://localhost:3000` |
| Backend | `http://localhost:5000` |
| AI Engine | `http://localhost:8000` |

Jenkins uses offset ports to avoid conflicts:

| Service | Jenkins URL |
|---|---|
| Frontend | `http://localhost:4000` |
| Backend | `http://localhost:6000` |
| AI Engine | `http://localhost:9000` |

## 9. Before Opening a Pull Request

1. Run the Docker stack with `docker compose up --build`.
2. Check `GET /` on the backend.
3. Check `GET /` or `HEAD /` on the AI engine.
4. Test the user flow you changed.
5. Confirm production-only env values were not committed.
6. Commit with a clear message:

```bash
git add .
git commit -m "feat: describe the change"
git push origin feature/name-of-your-feature
```

Then open a pull request into `main`. After approval, GitHub triggers the cloud deployment flow, while Jenkins validates the Docker pre-flight build.

## 10. Common Conflict Scenarios

### Same-Line Conflict

Two teammates edit the same line in the same file. Pull latest `main`, resolve the conflicting block manually, test, then push again.

### Deleted File Conflict

One teammate deletes or renames a file while another teammate edits it. Decide whether the new logic belongs in the replacement file or whether the deletion should be adjusted.

### Dependency Conflict

Two teammates install packages and both change `package.json`, `package-lock.json`, or Python requirements. Pull latest `main`, reinstall/build, keep both valid dependencies if both features need them, and test with Docker.

## 11. Env Var Checklist

Frontend/Vercel:

```env
VITE_BACKEND_URL=<render-backend-url>
VITE_GOOGLE_CLIENT_ID=<google-client-id>
```

Backend/Render:

```env
PORT=<provided-by-render>
MONGO_URI=<mongo-atlas-uri>
JWT_SECRET=<jwt-secret>
FRONTEND_URL=https://bhasha-flow.vercel.app
BACKEND_URL=<render-backend-url>
AI_ENGINE_URL=<render-ai-engine-url>
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
GMAIL_USER=<gmail-user>
GMAIL_PASS=<gmail-app-password>
```

AI Engine/Render:

```env
SARVAM_API_KEY=<sarvam-key>
GEMINI_API_KEY=<gemini-key>
GEMINI_MODEL=gemini-3-flash-preview
WEB_CONCURRENCY=<render-configured-value>
```
