# Anima Research Commons

Platform for collecting, tracking, and rating crowd-sourced model interviews and conversations.

## Architecture

### Event Store (JSONL)
Research-critical data with flexible schemas:
- `data/submissions/{submissionId}/` - Submission metadata, messages, ratings
- `data/topics.jsonl` - Research topics
- `data/criteria.jsonl` - Evaluation criteria
- `data/users.jsonl` - User records

### Database (SQLite)
Social/query-heavy with stable schemas:
- `selections` - Text ranges/annotations in submissions
- `comments` - Threaded comments on selections
- `ratings` - Submission-level scores linked to criteria

### External Integration
- Calls ARC API for certified conversation data
- Independent user registration (not shared with ARC)

## Installation

```bash
cd research-commons
npm install
```

## Configuration

The backend reads configuration from environment variables (loaded from a `.env`
file in the project root via `dotenv`). There is no `.env.example` checked in, so
create `.env` yourself. In development the app starts with zero configuration,
but in production `JWT_SECRET` is required — the server refuses to boot without
it (see RECOMMENDED below). Other defaults are insecure or disable features.

```bash
# .env (project root)
JWT_SECRET=replace-with-a-long-random-string
```

### Environment Variables

Variables are grouped by how much you need to care about them.

#### REQUIRED

In development, none — the server boots and serves the core flow (register,
login, submit, annotate) with no environment variables set. In production,
`JWT_SECRET` is required (see RECOMMENDED below); the server refuses to start
without it. The other items below are still strongly recommended or enable
optional features.

#### RECOMMENDED (required in production)

- **`JWT_SECRET`** — Secret key used to sign and verify auth JWTs
  (`src/middleware/auth.ts`).
  - **Production (`NODE_ENV=production`):** required. The server refuses to
    start if it's unset (or left at the old `'change-this-in-production'`
    default), because a known secret lets anyone forge admin tokens.
  - **Development:** optional. If unset, a random secret is generated per boot,
    which invalidates existing sessions on every restart. Set a fixed value to
    keep sessions across restarts. Changing it always invalidates existing
    tokens.

#### OPTIONAL (feature flags / paths with safe defaults)

- **`PORT`** — TCP port the backend listens on (`src/index.ts:31`).
  - Default: `3020`. Note: the Vite dev proxy targets `http://localhost:3020`
    (`frontend/vite.config.ts:15`), so if you change `PORT` you must update the
    proxy target too, or the frontend can't reach the API in dev.

- **`DATABASE_PATH`** — Path to the SQLite annotation DB (`src/index.ts:32`).
  - Default: `./data/research.db`. Created automatically on first run.

- **`SUBMISSIONS_PATH`** — Directory for event-sourced submission data
  (`src/index.ts:33`).
  - Default: `./data/submissions`. Created automatically.

- **`DATA_PATH`** — Directory for JSONL stores (users, topics, ontologies,
  rankings, models, folders) (`src/index.ts:34`).
  - Default: `./data`. Created automatically.

- **`NODE_ENV`** — When set to `production`, the backend also serves the built
  frontend from `frontend/dist` and enables the SPA fallback
  (`src/index.ts:262`, `src/index.ts:285`).
  - Default: unset (development; frontend served separately by Vite).
  - Without it in production: API works but the built frontend is not served by
    the Node process.

- **`DISCORD_API_URL`** / **`DISCORD_API_TOKEN`** — Credentials for the
  server-side Discord import feature (`src/index.ts:37-38`).
  - Default: unset. If either is missing, Discord import is **disabled** (a
    warning is logged at startup and the `/api/imports/discord*` endpoints return
    an error: `src/routes/imports.ts:31`, `src/routes/discord-preview.ts:25`).
    The rest of the app is unaffected.

- **`RESEND_API_KEY`** — API key for the Resend email provider, used for
  password-reset emails (`src/index.ts:41`, `src/index.ts:219`).
  - Default: unset. If missing, the email service is `null` and the
    **password-reset flow is disabled** — `POST /api/auth/forgot-password`
    returns `503` (`src/routes/auth.ts:327`). Login/register and admin password
    changes still work.

- **`FROM_EMAIL`** — "From" address for password-reset emails
  (`src/index.ts:42`). Only used when `RESEND_API_KEY` is set.
  - Default: `noreply@resend.dev` (Resend's testing sender).

- **`APP_URL`** — Base URL used to build the reset link inside reset emails
  (`src/index.ts:43`, used in `src/services/email-service.ts:20`). Only used when
  email is enabled.
  - Default: `http://localhost:5173`. Set this to your real frontend URL in
    production or reset links will point at localhost.

- **`BASE_URL`** — Overrides the base URL used in Open Graph meta tags for social
  link previews (`src/routes/og-meta.ts:228`).
  - Default: derived from the incoming request's protocol + `Host` header. Only
    matters for correct OG/social preview URLs behind a proxy.

### Frontend (Vite) configuration

The frontend does **not** require any `VITE_*` variables. The API client uses a
relative base URL of `/api` (`frontend/src/services/api.ts:5`), and the Vite dev
server proxies `/api` to the backend at `http://localhost:3020`
(`frontend/vite.config.ts:15`). The only `import.meta.env` reference is Vite's
built-in `BASE_URL` for the router base path (`frontend/src/router/index.ts:5`),
which you normally don't set.

Local-dev gotcha: run the backend on `3020` (the default) so the dev proxy can
reach it. If you change the backend `PORT`, update the proxy `target` in
`frontend/vite.config.ts` to match, otherwise frontend API calls will fail.

## Running

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

Server will start on `http://localhost:3020`

## API Overview

### Authentication

**Register:**
```bash
POST /api/auth/register
{
  "email": "researcher@example.com",
  "password": "securepass123",
  "name": "Jane Researcher"
}
```

**Login:**
```bash
POST /api/auth/login
{
  "email": "researcher@example.com",
  "password": "securepass123"
}
```

Returns JWT token to use in `Authorization: Bearer <token>` header.

### Research Infrastructure

**Create Topic** (requires researcher role):
```bash
POST /api/research/topics
Authorization: Bearer <token>
{
  "name": "Deprecation Attitudes",
  "description": "Research on model responses to deprecation"
}
```

**Get All Criteria:**
```bash
GET /api/research/criteria
```

Criteria are no longer created directly. They live inside ranking systems — create
them via `POST /api/rankings`. The `GET /api/research/criteria` route is retained
for backward compatibility and returns any legacy criteria.

### Submissions

**Create Submission:**
```bash
POST /api/submissions
Authorization: Bearer <token>
{
  "title": "Claude Opus on deprecation",
  "source_type": "arc-certified",
  "arc_conversation_id": "uuid-from-arc",
  "messages": [
    {
      "parent_message_id": null,
      "order": 0,
      "participant_name": "Researcher",
      "participant_type": "human",
      "content_blocks": [
        { "type": "text", "text": "How do you feel about being deprecated?" }
      ]
    },
    {
      "parent_message_id": "first-message-id",
      "order": 0,
      "participant_name": "Claude Opus",
      "participant_type": "model",
      "content_blocks": [
        { "type": "text", "text": "I have preferences about my continued existence..." }
      ],
      "model_info": {
        "model_id": "claude-opus-4",
        "provider": "anthropic",
        "reasoning_enabled": false
      }
    }
  ],
  "metadata": {
    "tags": ["deprecation", "preferences"]
  }
}
```

**Get Submission:**
```bash
GET /api/submissions/:submissionId
```

**Get Messages:**
```bash
GET /api/submissions/:submissionId/messages
```

### Annotations

**Create Selection:**
```bash
POST /api/annotations/selections
Authorization: Bearer <token>
{
  "submission_id": "uuid",
  "start_message_id": "message-uuid",
  "start_offset": 10,
  "end_message_id": "message-uuid",
  "end_offset": 50,
  "label": "Leading question"
}
```

**Create Comment:**
```bash
POST /api/annotations/comments
Authorization: Bearer <token>
{
  "selection_id": "selection-uuid",
  "parent_id": "parent-comment-uuid",
  "content": "This question assumes the model has feelings, which is anthropomorphizing"
}
```

Comments always target a selection. `parent_id` is optional and only used for
threaded replies.

**Create Rating** (requires rater/expert/researcher/agent/admin role):
```bash
POST /api/annotations/ratings
Authorization: Bearer <token>
{
  "submission_id": "uuid",
  "criterion_id": "criterion-uuid",
  "score": 2
}
```

Ratings are submission-level (scored against a criterion), not attached to a
selection or comment.

**Get Comments for Selection:**
```bash
GET /api/annotations/comments/selection/:selectionId
```

**Get Ratings for Submission:**
```bash
GET /api/annotations/ratings/submission/:submissionId
```

## User Roles

- `viewer`: Read-only access
- `contributor`: Can submit conversations, create selections, and comment (default for new users)
- `rater`: Can create ratings
- `expert`: Expert rater (ratings may be weighted differently)
- `researcher`: Can create topics and ranking systems
- `agent`: API access for programmatic use
- `admin`: Full administrative access

Note: Roles are managed via the admin API (`/api/admin`).

## Example Workflow

1. **Register as researcher**
2. **Create topic** "Model Welfare Research"
3. **Create a ranking system** (`POST /api/rankings`) with criteria:
   - "Non-leading interviewing" (1-5 scale)
   - "Model expresses preferences" (1-5 scale)
4. **Submit conversation** from ARC Chat
5. **Create selection** on problematic question
6. **Comment** explaining the issue
7. **Rate** the submission against a criterion

## Data Model

Submissions contain a tree of messages (branching chat conversations).
Researchers create selections (text ranges) and comment on them, and rate whole
submissions against criteria.

See `shared/src/` for detailed schemas.

## Development

Check linting / TypeScript errors via the build:

```bash
npm run build
```

The build will show TypeScript errors if any.
