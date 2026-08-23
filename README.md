# Hapines

A daily mood check-in companion. Chat with an AI companion that helps you briefly
reflect on your day — built as a full-stack, session-aware chat app with a
production-style deployment and CI pipeline.

**Status: actively in development** — core chat flow, session history, and
prompt-engineered responses are working; test coverage and hardening are ongoing.

## Stack

**Frontend** — `apps/web`
- SvelteKit 2 (Svelte 5 runes)
- Vite, deployed via `@sveltejs/adapter-vercel`
- Vitest + Testing Library (unit), Playwright (E2E)

**Backend** — `apps/api`
- Hono (TypeScript, runs on Node)
- Drizzle ORM + Neon Postgres (serverless)
- Google Gemini API (`@google/genai`) for chat completions
- Upstash Redis for rate limiting
- Vitest for unit/integration tests
- Vercel Cron for scheduled message cleanup

## Architecture

```
apps/
  web/    SvelteKit frontend — chat UI, session persisted in sessionStorage
  api/    Hono backend — /chat, /messages, /health, /internal/cleanup
```

- Each conversation is scoped by a server-issued `sessionId` (UUID). The client
  stores it in `sessionStorage` and sends it on subsequent requests so the
  backend can load prior turns as context for Gemini.
- The system prompt (`apps/api/src/lib/prompts.ts`) defines Hapines' persona,
  tone, and safety boundaries (e.g. redirecting crisis disclosures to real
  support resources rather than attempting to handle them).
- Messages older than 30 days are deleted automatically by a daily cron job
  (`/internal/cleanup`), authenticated via a bearer token Vercel Cron sends.

## API

| Route | Method | Purpose |
|---|---|---|
| `/chat` | POST | Send a message, get an AI reply. Body: `{ message, sessionId? }`. Rate-limited per IP. |
| `/messages` | GET | List recent messages (debug/inspection). |
| `/health` | GET | Liveness + DB connectivity check. |
| `/internal/cleanup` | GET | Deletes messages older than 30 days. Requires `Authorization: Bearer <CRON_SECRET>`. Called by Vercel Cron daily. |

## Local development

Requires Node 20+, a Postgres database (e.g. [Neon](https://neon.tech)), a
[Gemini API key](https://ai.google.dev/), and an [Upstash Redis](https://upstash.com/)
instance for rate limiting.

```powershell
# API
cd apps\api
copy .env.example .env   # fill in real values
npm install
npx drizzle-kit generate
npx drizzle-kit migrate
npm run dev               # http://localhost:8787

# Web (separate terminal)
cd apps\web
copy .env.example .env
npm install
npm run dev               # http://localhost:5173
```

## Testing

```powershell
# API
cd apps\api
npm test              # unit/integration (Vitest)

# Web
cd apps\web
npm run check          # type-check
npm test              # unit (Vitest + Testing Library)
npm run test:e2e       # E2E (Playwright)
```

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR to `main`:
type-checking, unit tests, and build for both apps, plus a Playwright E2E job.
Branch protection on `main` requires all checks to pass before merging.

## Deployment

Both apps deploy to Vercel independently (`apps/api` and `apps/web` as
separate Vercel projects). The API project also runs the daily cleanup cron
defined in `apps/api/vercel.json`.

## License

This project is provided as-is for portfolio/demonstration purposes. No