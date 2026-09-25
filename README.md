# GrievanceAI

**Multilingual GenAI for citizen grievances.** Citizens describe a problem in any Indian language, by typing, speaking, or uploading a photo or PDF. GrievanceAI transcribes and translates it, classifies it into the right civic category, and routes the citizen to the correct government portal, with nearby offices on a map and step-by-step next actions.

## Features

- **Multimodal input:** typed text, voice recordings, and images/PDFs (including handwritten letters), in any Indian language.
- **One-call AI pipeline:** a single Gemini multimodal request does OCR, speech-to-text, translation to English, summarisation and classification into 29 categories, returning structured JSON.
- **Citizen verification:** the AI asks a yes/no confirmation question *in the citizen's own language* before the grievance is filed.
- **Smart routing:** category-plus-state portal directory (CPGRAMS, Rail Madad, Cyber Crime portal, and more), expected resolution time, and AI-located nearby offices on a Leaflet map.
- **Citizen dashboard:** grievance history, status timeline, and a downloadable summary PDF translated back into the citizen's language.
- **Admin / authority dashboard:** filter, assign and update grievances, see analytics by status, category and language, and send resolution emails with the remark translated for the citizen.
- **Auth:** email/password, Google OAuth, password reset and TOTP two-factor authentication (Supabase Auth).
- **Automated follow-ups:** a daily `pg_cron` job emails citizens whose grievance has passed its expected resolution date.
- **Graceful degradation:** Gemini calls fall through a list of models on quota or availability errors. Typed complaints fall back to a keyword classifier, so filing still works if the AI is down.

## Architecture

```text
React + Vite SPA (Vercel)
   │  supabase-js ──────────────► Supabase Auth (email/password, Google, TOTP)
   │  axios + JWT
   ▼
Supabase Edge Function `api`  (Deno + Hono)
   ├── Supabase Postgres   profiles, grievances, ai_analyses, status_updates, training_data
   ├── Supabase Storage    private bucket for attachments (served via signed URLs)
   ├── Google Gemini       OCR · speech-to-text · translation · classification · office lookup
   └── Gmail SMTP          resolution + follow-up emails
pg_cron (daily 09:00 IST) ──► POST /api/cron/follow-up
```

- The frontend only talks to Postgres through the API. Every table has RLS on and no policies, so the public key can't read or write data directly. Ownership and role checks live in the function.
- All routes live under `https://<project>.supabase.co/functions/v1/api/...`.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, React Router, Framer Motion, Leaflet, jsPDF |
| API | Supabase Edge Functions (Deno), Hono |
| Database / Storage / Auth | Supabase Postgres, Storage, Auth |
| AI | Google Gemini (structured JSON output, multimodal) |
| Scheduling | pg_cron + pg_net |
| Hosting | Vercel (frontend), Supabase (backend) |

## Project structure

```text
frontend/                     React SPA
  src/utils/supabase.js       Supabase client (auth)
  src/utils/api.js            axios instance for the api function
supabase/
  functions/api/index.ts      all API routes (Hono)
  functions/api/gemini.ts     Gemini pipeline + model fallback
  functions/api/portalData.js portal directory and routing rules
  functions/api/mailer.js     email templates (Gmail SMTP)
  migrations/                 schema, storage bucket, cron job
```

## Running locally

```bash
cd frontend
cp .env.example .env    # set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev             # http://localhost:3000
```

The frontend talks to the deployed Supabase project. To work on the API, use the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref <project-ref>
supabase db push                 # apply migrations
supabase functions deploy api    # verify_jwt=false is set in supabase/config.toml
```

### Edge Function secrets

Set these in **Supabase dashboard → Edge Functions → Secrets** (see `.env.example`):

| Secret | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | yes | Gemini API key |
| `GEMINI_MODELS` | no | Comma-separated model fallback order |
| `GMAIL_USER`, `GMAIL_PASS` | no | Gmail address + App Password for emails (skipped when unset) |
| `FRONTEND_URL` | no | Base URL used in email links |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

### Making an admin

New sign-ups are citizens. To promote an account, run this in the Supabase SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

## API overview

| Method | Route | Who |
|---|---|---|
| POST | `/api/auth/register` | public |
| GET/PUT | `/api/auth/profile` | signed in |
| POST | `/api/auth/change-password` | signed in |
| POST | `/api/grievance/ingest` | citizen (multipart: `text`, `image`, `audio`) |
| POST | `/api/grievance/confirm`, `/api/grievance/submit` | citizen |
| GET | `/api/grievance/recent`, `/api/grievance/:id` | citizen (own grievances) |
| POST | `/api/grievance/:id/feedback`, `/api/grievance/:id/translate-analysis` | citizen |
| GET | `/api/admin/grievances`, `/api/admin/grievance/:id`, `/api/admin/stats`, `/api/admin/ai-insights` | admin / authority |
| PUT | `/api/admin/grievance/:id/status`, `/api/admin/grievance/:id/assign` | admin / authority |
| POST | `/api/admin/grievance/:id/notify-citizen` | admin / authority |
| GET | `/api/public/stats` | public |

## Smoke test

```bash
SUPABASE_URL=https://<project-ref>.supabase.co SUPABASE_ANON_KEY=<publishable-key> node scripts/smoke.mjs
```

Runs register → login → ingest → confirm → submit → dashboard → admin-guard against the deployed API.
