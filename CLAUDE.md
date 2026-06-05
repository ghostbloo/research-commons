# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Anima Research Commons — a platform for collecting, annotating, and rating crowd-sourced model interviews/conversations. Node + Express + TypeScript backend with a Vue 3 frontend.

## Layout

Two npm packages in one repo:

- **Backend** lives at the repo root: source in `src/`, run with the root `package.json`. (Note: it's `src/`, not `backend/src/`.)
- **Frontend** lives in `frontend/`, its own `package.json`, Vue 3 + Vite + Pinia + Tailwind.

`data/` holds all runtime state (JSONL stores + SQLite); it's created on first run and is not source. The annotation domain model (ontologies, tags, selections, ratings, ranking systems) is documented in `docs/ontology.md` — read it before touching annotation code.

## Commands

Backend (run from repo root):

```bash
npm run dev      # tsx watch src/index.ts — auto-reload on :3020
npm run build    # tsc — also the typecheck/lint gate (no separate linter)
npm start        # node dist/index.js (requires build first)
npm run migrate  # tsx src/database/migrate.ts — SQLite migrations
```

Frontend (run from `frontend/`):

```bash
npm run dev          # vite dev server on :5173, proxies /api → :3020
npm run build        # vite build (no typecheck)
npm run build:check  # vue-tsc + vite build — use this to typecheck the frontend
```

Full-stack build from root: `npm run build:full` (tsc + frontend build).

There is no automated test suite. `test-api.sh` is a manual curl smoke script; verification is done via the typecheck builds above and by exercising the running app.

### Local-dev gotchas

- **Run the backend on the default port 3020.** The Vite dev proxy targets `http://localhost:3020` (`frontend/vite.config.ts`); changing `PORT` means also editing that proxy target, or frontend API calls break.
- **Native deps** (`better-sqlite3`, `bcrypt`, `sharp`) compile from source, so a C++ toolchain is required (Xcode Command Line Tools on macOS, `build-essential` on Linux). Prefer a current LTS Node — very new major versions may not have prebuilt binaries yet.
- First boot seeds default ontologies/rankings/models/topic but creates **no** admin user. Use `create-admin-user.ts` / `make-admin.sh`, or register through the UI.

## Architecture

**Hybrid storage — the central design decision.** Two stores, split by data shape:

- **Event store (append-only JSONL under `data/`)** for research-critical, schema-flexible data: submissions + messages (`src/storage/` — `EventStore`, `ShardedEventStore`, `SubmissionStore`), plus per-domain JSONL stores in `src/services/*-store.ts` (users, topics/criteria, ontologies, rankings, models, folders). These classes load events on `init()` and keep in-memory caches; writes append events.
- **SQLite (`data/research.db`, schema in `src/database/schema.sql`)** for social/query-heavy data with stable schemas: selections, `selection_tags` (tag votes), comments, ratings, and the submission↔ontology / submission↔ranking attachment tables. Wrapped by `AnnotationDatabase` (`src/database/db.ts`).

Ratings are submission-level and live in **both** worlds (JSONL per-submission and a SQLite table) — see `docs/ontology.md` for why.

**Dependency injection via `AppContext`.** `src/index.ts` constructs every store once, bundles them into an `AppContext`, and passes it to route factories (`createAuthRoutes(ctx)`, `createAnnotationRoutes(ctx)`, …). Routes never instantiate stores themselves — they receive them through the context. To add a route module, write a `createXRoutes(ctx)` factory in `src/routes/` and mount it in `index.ts`.

**Auth & roles.** JWT signed with `JWT_SECRET` (`src/middleware/auth.ts`). `authenticateToken` populates `req.user`/`req.userId`; `requireRole(role)` gates endpoints. Roles: `viewer`, `contributor` (default), `rater`, `expert`, `researcher`, `agent`, `admin`. The token carries roles, so role changes require re-login to take effect.

**Types are duplicated, for now.** Zod schemas in `src/types/` define and validate the backend domain; `frontend/src/types/` hand-mirrors them as plain TS. When changing a shared shape, update both sides (consolidation tracked in issue #2).

**Frontend.** Vue 3 SPA. API client (`frontend/src/services/api.ts`) uses a relative `/api` base — no `VITE_*` env vars needed. Pinia stores in `frontend/src/stores/`, views in `frontend/src/views/`, the annotation UI in `frontend/src/components/` (see `docs/ontology.md` for the annotation component map). In production (`NODE_ENV=production`), the backend serves the built frontend from `frontend/dist` with an SPA fallback.

## Configuration

No env vars are required to boot (all have defaults). `JWT_SECRET` is the one to set anywhere real — its default is a public hardcoded string. Optional integrations degrade gracefully when unset: Discord import (`DISCORD_API_URL`/`DISCORD_API_TOKEN`) and password-reset email (`RESEND_API_KEY`) just disable their endpoints. Full variable reference is in `README.md`.

## Issues

The backlog lives in GitHub issues. When work has an order — issue B shouldn't start until issue A lands — record it with **GitHub's native issue dependencies** ("blocked by" / "blocking"), not just a sentence in the body, so the sequence is machine-readable for the agents that pick up work. An agent should confirm an issue isn't blocked before starting it. Set relations from the issue sidebar, or via the API:

```bash
# make <blocker-id> block issue <n>; issue_id must be the numeric id (gh api .../issues/<n> --jq .id), and -F (not -f) so it's sent as an integer
gh api --method POST repos/<owner>/<repo>/issues/<n>/dependencies/blocked_by -F issue_id=<blocker-id>
```

**Link every PR to its issue.** A PR that resolves an issue must put `Closes #N` (or `Fixes #N`) in its body, so merging auto-closes the issue and the issue↔PR graph stays honest. A PR that touches but doesn't fully resolve an issue should say `Refs #N` instead.

## Docs map

- `docs/ontology.md` — annotation/ranking domain model (maintained, reconciled against code). Start here for annotation work.
- `README.md` — project overview, full env-var reference, API examples.
- `REQUIREMENTS.md` — design spec + product philosophy. Aspirational; not everything described is built.
- Root `*_DEPLOY*.md` / `DEPLOYMENT.md` / `RANKING_SYSTEM_REFACTOR.md` / `TESTING.md` — older write-once snapshots; treat as historical, not authoritative.
