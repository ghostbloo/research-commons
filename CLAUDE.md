# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Anima Research Commons — a platform for collecting, annotating, and rating crowd-sourced model interviews/conversations. Node + Express + TypeScript backend with a Vue 3 frontend.

## Layout

Three npm packages in one repo, wired together as an **npm workspace** (root `package.json` declares `"workspaces": ["shared", "frontend"]`):

- **Backend** lives at the repo root: source in `src/`, run with the root `package.json`. (Note: it's `src/`, not `backend/src/`.)
- **Frontend** lives in `frontend/`, its own `package.json`, Vue 3 + Vite + Pinia + Tailwind.
- **Shared** lives in `shared/` (`@anima-labs/research-commons-shared`): the single source of truth for the domain model — Zod schemas + the types inferred from them. Both other packages depend on it. It **compiles to `shared/dist`** via `npm run build:shared`, which every build/dev script runs first; the backend `tsc` build imports its `.d.ts` and the backend runtime imports its `.js`, so run a build (or `npm run build:shared`) once after cloning. (The frontend imports it type-only, so the frontend bundle never needs `shared/dist` at runtime.) See "Shared types" below.

`data/` holds all runtime state (JSONL stores + SQLite); it's created on first run and is not source. The annotation domain model (ontologies, tags, selections, ratings, ranking systems) is documented in `docs/ontology.md` — read it before touching annotation code.

## Commands

Backend (run from repo root):

```bash
npm run dev          # build:shared, then tsx watch src/index.ts — auto-reload on :3020
npm run build        # build:shared, then tsc — the typecheck/lint gate (no separate linter)
npm run build:shared # compile the shared/ package to shared/dist (both builds depend on it)
npm start            # node dist/index.js (requires build first)
npm run migrate      # tsx src/database/migrate.ts — SQLite migrations
```

Frontend (run from `frontend/`):

```bash
npm run dev          # vite dev server on :5173, proxies /api → :3020
npm run build        # vite build (no typecheck)
npm run build:check  # vue-tsc + vite build — use this to typecheck the frontend
```

Full-stack build from root: `npm run build:full` (shared + tsc + frontend build). All build/dev scripts run `build:shared` first, so the compiled `shared/dist` the other two packages import is always present.

There is no automated test suite. `test-api.sh` is a manual curl smoke script; verification is done via the typecheck builds above and by exercising the running app.

### Local-dev gotchas

- **Run the backend on the default port 3020.** The Vite dev proxy targets `http://localhost:3020` (`frontend/vite.config.ts`); changing `PORT` means also editing that proxy target, or frontend API calls break.
- **Native deps** (`better-sqlite3`, `bcrypt`, `sharp`) compile from source on this machine (no prebuilt binaries for the local Node). They need a C++ toolchain — `gcc-c++` must be installed (already fixed on this box; one-shot fallback: `nix-shell -p gcc --run "npm install"`).
- First boot seeds default ontologies/rankings/models/topic but creates **no** admin user. Use `create-admin-user.ts` / `make-admin.sh`, or register through the UI.

## Architecture

**Hybrid storage — the central design decision.** Two stores, split by data shape:

- **Event store (append-only JSONL under `data/`)** for research-critical, schema-flexible data: submissions + messages (`src/storage/` — `EventStore`, `ShardedEventStore`, `SubmissionStore`), plus per-domain JSONL stores in `src/services/*-store.ts` (users, topics/criteria, ontologies, rankings, models, folders). These classes load events on `init()` and keep in-memory caches; writes append events.
- **SQLite (`data/research.db`, schema in `src/database/schema.sql`)** for social/query-heavy data with stable schemas: selections, `selection_tags` (tag votes), comments, ratings, and the submission↔ontology / submission↔ranking attachment tables. Wrapped by `AnnotationDatabase` (`src/database/db.ts`).

Ratings are submission-level and live in **both** worlds (JSONL per-submission and a SQLite table) — see `docs/ontology.md` for why.

**Dependency injection via `AppContext`.** `src/index.ts` constructs every store once, bundles them into an `AppContext`, and passes it to route factories (`createAuthRoutes(ctx)`, `createAnnotationRoutes(ctx)`, …). Routes never instantiate stores themselves — they receive them through the context. To add a route module, write a `createXRoutes(ctx)` factory in `src/routes/` and mount it in `index.ts`.

**Auth & roles.** JWT signed with `JWT_SECRET` (`src/middleware/auth.ts`). `authenticateToken` populates `req.user`/`req.userId`; `requireRole(role)` gates endpoints. Roles: `viewer`, `contributor` (default), `rater`, `expert`, `researcher`, `agent`, `admin`. The token carries roles, so role changes require re-login to take effect.

**Shared types — single source of truth.** The domain model lives once, as Zod schemas, in the `shared/` workspace package (`shared/src/*.ts`, e.g. `submission.ts`, `annotation.ts`, `ontology.ts`, `ranking.ts`, `research.ts`, `model.ts`, `folder.ts`). The backend imports schemas + inferred (`z.infer`) types from `@anima-labs/research-commons-shared` and uses the schemas for runtime validation. The frontend imports the *same* definitions in `frontend/src/types/`, wrapping each in `Serialized<T>` (a helper in `shared/src/serialized.ts` that maps `Date → string`, since dates arrive as JSON strings over the wire). Change a shared shape in **one** place (`shared/`) and rebuild (`npm run build:shared`, or any build script, which run it first); both sides pick it up. This resolved issue #2 — there is no longer a hand-mirrored parallel copy.

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
