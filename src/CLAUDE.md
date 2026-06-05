# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Backend package (`src/`). See the root `CLAUDE.md` for repo layout, commands, the JSONL/SQLite storage split, the `AppContext` DI pattern, JWT/roles, and config — this file covers the backend-specific conventions you need before editing here.

## Boot sequence (`index.ts`)

`main()` runs a fixed order: construct all stores → `await store.init()` on each → `initializeDefaults(...)` → build the `AppContext` object → mount routes → conditional prod static serving → `app.listen`. Things to respect when changing it:

- **Every store must be `init()`-ed before it goes in the context.** Stores load their JSONL events and build in-memory caches in `init()`; using one before init gives empty/wrong data. `AnnotationDatabase` is the exception — it migrates synchronously in its constructor (see below), so it has no `init()`.
- **`initializeDefaults` seeds only domain data** (ontologies, ranking systems, models, and one research topic) and only when each store is empty. It does **not** create an admin user — first boot has no admin. The default-topic seed runs last because it references the ontology/ranking IDs created just before it.
- **Middleware order is load-bearing.** `express.json({ limit: '50mb' })` is large on purpose (submissions embed base64 images). The OG-meta middleware (`createOgMiddleware`) must stay mounted after all `/api` routers and before the prod SPA fallback. The SPA fallback (`app.get('*')`) only triggers under `NODE_ENV=production` and explicitly skips `/api` and `/health`.
- Graceful shutdown closes stores on `SIGINT`; if you add a store that holds an open file/db handle, add it to the shutdown list too.

## Adding a domain store

The JSONL-backed stores in `services/*-store.ts` all share one shape (see `ontology-store.ts`, `folder-store.ts`, `user-store.ts` as canonical examples). To add one, follow it exactly:

- Constructor takes `dataPath` and creates one `EventStore` per `*.jsonl` file (from `storage/event-store.js`). A store may own several event files (e.g. `OntologyStore` keeps ontologies and tags in separate files).
- `init()` calls `EventStore.init()` then `loadEvents()` and **replays** events into `Map`-based in-memory caches keyed by id. Past events are the source of truth; the caches are derived.
- Convention: event `type` strings are `noun_verb` past-tense (`ontology_created`, `folder_updated`, `tag_deleted`). Mutations append an event **and** update the cache in the same method, so reads never hit disk after init.
- `Date` fields are stored as ISO strings (the `EventStore` serializes `event.timestamp`), so replay must re-wrap them with `new Date(...)` — every store does this and it's easy to forget.
- Reads are synchronous lookups against the cache (but still `async` for signature uniformity). `getAll*()` returns `Array.from(map.values())`.
- Wire a new store into `index.ts`: construct it, `await .init()`, add it to the `AppContext` interface and object, and add it to the `SIGINT` close list.

`participant-mapping-store.ts` is the odd one out: it uses raw `fs.appendFile` rather than `EventStore`, and `deleteMapping` rewrites the whole file (`rebuildFile`) instead of appending a delete event. Don't copy it as a template; prefer the `EventStore` pattern.

## Submissions, messages, and the event-store layer

`storage/event-store.ts` is the low-level append-only JSONL primitive. `EventStore` = one file; `ShardedEventStore` = many files under `<base>/<first-2-chars-of-id>/<id>/<filename>`, with per-shard `EventStore` instances cached in a `Map`. `appendEvent` does `fsync` on every write (durable, not batched).

`storage/submission-store.ts` is the only consumer of `ShardedEventStore`. Per submission it keeps three JSONL files — `metadata.jsonl`, `messages.jsonl`, `ratings.jsonl` — plus a single global `index.jsonl` of submission IDs (the only way to enumerate submissions; there is no directory scan). Notable behaviors:

- **Lazy load + LRU-ish unload.** `getSubmission`/`getMessages` load and cache on first access and bump `lastAccessed`; `unloadInactive(maxAge)` evicts stale entries. (Nothing currently calls `unloadInactive` on a timer — caches grow until restart.)
- **State is reconstructed by replaying events.** A submission = the `submission_created` event with all later `submission_updated` events merged over it (`metadata` merged separately so it isn't clobbered). Messages = `message_added` events with `message_updated` patches applied. So a partial update like `updateMessage(id, {hidden_from_models: true})` is an event, not a rewrite.
- **The message tree is validated on create** (`validateMessageTree` / `detectCycles`): exactly one root (`parent_message_id === null`), no dangling parents, no cycles, and `participant_type === 'model'` requires `model_info`. Branching conversations ("loom" submission type) are expressed purely as the parent-pointer tree of messages — there is no separate branch entity.
- **Ratings live in SQLite, not here.** The `ratings.jsonl` file and the rating methods in `SubmissionStore` are dead/deprecated; the comment in the file claiming ratings are dual-written is stale. New rating code goes through `AnnotationDatabase` only (`annotations.ts` creates ratings solely via `annotationDb.createRating`).

## SQLite vs JSONL — which store does data go in?

The decision is by data shape, not by domain (see root `CLAUDE.md` for the rationale):

- **JSONL event stores** hold the canonical domain entities: submissions, messages, users, topics/criteria, ontologies+tags, ranking systems, models, folders (the folder *record* itself). Anything you'd reconstruct by replay and rarely query across rows.
- **SQLite** (`database/db.ts`, schema in `database/schema.sql`) holds the high-fan-out, cross-entity, query-heavy relations: `selections` + `selection_tags` (per-user tag votes), `comments`, `ratings`, the `submission_ontologies` / `submission_ranking_systems` attachment tables, `message_reactions`, `hidden_messages`, and folder↔member / folder↔submission join tables. A folder demonstrates the split deliberately: the folder entity is JSONL, its membership and contents are SQLite.

`AnnotationDatabase` is a thin hand-written wrapper over `better-sqlite3` (synchronous API — no `await`). It enables WAL + `foreign_keys = ON`, and `ON DELETE CASCADE` is relied on (e.g. deleting a selection cleans up its tags/comments). To add SQLite state: add the `CREATE TABLE IF NOT EXISTS` to `schema.sql` and the typed accessor methods to `db.ts`.

**Migrations are run-on-construct, not a separate step.** `AnnotationDatabase`'s constructor `exec`s the entire `schema.sql` every boot, which is why every statement is `IF NOT EXISTS`. There is no incremental migration framework — `package.json`'s `npm run migrate` points at `src/database/migrate.ts`, **which does not exist**; don't rely on that script. Schema changes that aren't additive (altering a column, backfilling) currently have no home and must be handled manually.

## Route modules

Every file in `routes/` exports a `createXRoutes(context: AppContext): Router` factory; it builds a local `express.Router()`, closes over `context` to reach stores, and returns it. `index.ts` mounts it under an `/api/...` prefix. No route ever constructs a store. To add a module: write the factory, import and mount it in `index.ts`.

Conventions inside routes:

- **Validation:** request bodies are parsed with the Zod request schemas from `@anima-labs/research-commons-shared` (`Schema.parse(req.body)` — the throwing form, never `safeParse`). The `catch` block checks `error.name === 'ZodError'` and returns `400 { error, details: error.errors }`, else logs and returns `500`. Match this shape.
- **Auth middleware** (from `middleware/auth.ts`) is applied per-route, not globally: `authenticateToken` (populates `req.user`/`req.userId` from the JWT, 401/403 on failure), `requireRole(role)` / `requireAnyRole([...])` for gating, and `optionalAuth` for endpoints that behave differently when logged in. Several public-read endpoints (e.g. `GET /submissions`) skip the middleware and instead **manually `jwt.verify`** the `Authorization` header inline to decide visibility — that's intentional, so guests still get a response.
- **Visibility/permission filtering lives in the route, not the store.** Stores return everything; routes filter by the submission/folder `visibility` enum and the caller's roles (the `canAccess*` helpers in `folders.ts` and the inline filters in `submissions.ts` are the reference implementations). The JWT carries roles, but for authoritative role checks routes re-fetch the user via `userStore.getUserById` rather than trusting the token's role array.
- Topic-derived vs explicitly-attached ontologies/rankings are merged at read time in `submission-systems.ts` (topic attachments are dynamic lookups; explicit ones come from the SQLite attachment tables and can be detached unless `is_from_topic`).

## Types

The domain shapes are defined once in the `shared/` workspace package (`@anima-labs/research-commons-shared`) and imported here as schemas + `z.infer` types. Each `shared/src/*.ts` file defines Zod schemas and derives the TS type with `z.infer`. Request DTOs are separate `*RequestSchema`s (e.g. server fills `id`/`submission_id`, so create-request schemas omit them). The role enum lives in `UserSchema` in `shared/src/research.ts`. The frontend derives its types from the same package (issue #2) — edit a schema once in `shared/src/`, run `npm run build:shared`, and both sides update.

## Importers

`importers/base-importer.ts` defines the `BaseImporter` abstract class and the `ImportedConversation` interface that every importer must produce (title + validated `Message[]` tree + metadata + `source_type`). `discord-importer.ts` is the only concrete implementation; it maps Discord's export JSON into that shape and resolves authors against `ParticipantMappingStore`. A new importer subclasses `BaseImporter`, implements `importConversation` to return an `ImportedConversation`, and the resulting messages flow through `SubmissionStore.createSubmission` (and thus its tree validation) like any other submission.
