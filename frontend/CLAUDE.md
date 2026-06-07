# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Frontend-specific notes for `frontend/src/`. The repo-root `CLAUDE.md` is auto-loaded alongside this one and covers repo layout, dev/build commands, the `/api` proxy, and the shared-types setup — see it first; this file does not repeat it.

## Bootstrap

`src/main.ts` is minimal: install Pinia + router, mount `App.vue`, and call `theme.initTheme()` before mount. `App.vue` is a bare `<RouterView>` shell whose only job is session lifecycle — on mount it calls `authStore.restoreSession()` and `authStore.setupAuthListener()`. There is **no app-shell layout component**; each view renders its own chrome (see Navigation).

## The data-flow convention (important)

Pinia is barely used. There are only two stores (`stores/auth.ts`, `stores/submissions.ts`), and **the normal pattern is for a view to import an API group from `services/api.ts` and call it directly** — 14 of 15 views do this, holding their own `ref` state. Only `AnnotationWorkspace.vue` touches `useSubmissionsStore`, and even it calls `services/api.ts` directly for most things. So:

- Don't reach for a store when adding a feature. Add the endpoint group to `services/api.ts`, import it in your view, manage local state with `ref`. That matches the codebase.
- `stores/submissions.ts` is a thin caching layer (Maps keyed by submission id) used only by the annotation workspace. It's incomplete — e.g. `fetchComments` calls a non-existent `annotationsAPI.getComments`; prefer the per-selection/per-submission getters that work.
- Both stores are **setup-style** (`defineStore('id', () => { ... })` returning refs/functions), not options-style. Match that if you add one.

## API client (`services/api.ts`)

One shared axios instance (`baseURL: '/api'`), default-exported, with two interceptors:

- **Request:** reads `localStorage['auth_token']` and sets the `Authorization: Bearer` header. The token is attached here, not in stores — don't manually pass tokens.
- **Response:** on 401/403, if a token was present, clears `auth_token`/`auth_user` from localStorage and dispatches a `window` `CustomEvent('auth:logout')`. `auth.ts` listens for that event (wired via `App.vue`) and hard-redirects to `/login`. This is the global session-expiry path; individual calls don't need to handle auth errors.

Endpoints are grouped into exported objects by domain: `authAPI`, `submissionsAPI`, `annotationsAPI`, `ontologiesAPI`, `rankingsAPI`, `researchAPI` (topics), `modelsAPI`, `adminAPI`, `foldersAPI`, `importsAPI`, `discordPreviewAPI`. Each method returns the raw axios promise typed with `api.get<T>(...)` — callers read `response.data`. **To add an endpoint:** add a method to the relevant group (or a new `xAPI` object) here; keep the per-group object style.

Note the folder types (`Folder`, `FolderDetail`, etc.) and admin stats types (`AdminUser`, `SystemStats`) are declared inline in `api.ts`, not in `types/` — newer additions diverge from the `types/`-centralized convention.

## Types (`types/`)

`types/index.ts` (+ `ontology.ts`, `ranking.ts`, re-exported from index) no longer hand-mirror the backend types — they **derive** from the single source of truth, the `@anima-labs/research-commons-shared` workspace package (the backend Zod schemas). Each type is `Serialized<XDTO>`, where `Serialized<T>` (from the shared package) maps `Date → string` because dates arrive as JSON strings over the API. So `created_at`, `submitted_at`, `tagged_at`, etc. are `string` here, and `ContentBlock` is the schema's discriminated union (text/image/thinking/`tm_blob_file`), not a loose interface. Ontology/ranking/tag shapes are still largely typed as `any` in the API layer, so the strong types are mostly `User`, `Submission`, `Message`/`ContentBlock`, `Selection`, `Comment`, `Rating`, `Topic`. **To change a shared shape, edit the Zod schema in `shared/src/` and run `npm run build:shared`** — both sides update from the one definition (issue #2; root `CLAUDE.md`).

## Router & auth gating (`router/index.ts`)

Lazy-imported routes, `createWebHistory`. A single global `beforeEach` guard enforces two meta flags: `requiresAuth` (redirects to `/login?redirect=...` when `!authStore.isAuthenticated()`) and `requiresAdmin` (redirects to `/browse` when not `authStore.hasRole('admin')`). **Gate new protected routes by adding `meta: { requiresAuth: true }`** rather than checking auth inside the view. Note roles live in the JWT/user object client-side, so `hasRole` reflects the last login. Most read routes are intentionally public; the workspace (`/submissions/:id`) is public-viewable and gates write actions per-component via `authStore` computed permissions.

## Auth store (`stores/auth.ts`)

Session state (`user`, `token`) is duplicated between the store refs and `localStorage` (`auth_token`, `auth_user`); the localStorage copy is the source of truth the axios interceptor reads. `login`/`register` write both; `logout` and `restoreSession` keep them in sync. `hasRole(role)` and `isAuthenticated()` are the permission primitives used across views and the router guard.

## Annotation workspace

The annotation domain model and the component map (AnnotationWorkspace, SelectionCard, TagPicker, RatingForm, AnnotationMargin, etc.) are documented in `docs/ontology.md` — read it before editing annotation UI. Frontend-specific facts not in that doc:

- `views/AnnotationWorkspace.vue` is the orchestrator (~2800 lines): it owns nearly all annotation state, loads everything in `loadData()`, and passes data down + handles events up. Child components are presentational; logic lives here.
- The right-margin annotation layout (collision-avoided tag labels / comment cards, vertical selection bars, connector paths) is computed by `utils/layout-manager.ts` (`AnnotationLayoutManager`) from live DOM `getBoundingClientRect()` measurements keyed off `[data-message-id]` attributes — it is layout math, not domain logic. `AnnotationMargin.vue` consumes its `MarginAnnotation`/`VerticalBar` output.

## Navigation & UI components

`components/LeftSidebar.vue` (wrapping `SidebarContent.vue`) is the shared nav — a fixed desktop sidebar / mobile teleport overlay. It is **imported and rendered by each top-level view individually**, not by `App.vue`. Add it to new full-page views for consistent chrome. `components/ui/Base*.vue` (BaseButton/Card/Input/Modal) exist but are currently **unused** — most components hand-roll Tailwind; don't assume a design-system layer.

## Styling & markdown

- Tailwind with `darkMode: 'class'`, but the app is **dark-only**: `composables/useTheme.ts` always forces the `dark` class and its `toggleTheme`/`setTheme` are deliberate no-ops (`ThemeToggle.vue` is vestigial). New UI should still write `dark:` variants to match surrounding code, but assume dark renders.
- `tailwind.config.js` extends a `primary` (indigo) + `secondary` color scale and customizes `@tailwindcss/typography` `prose`. Custom component classes (`.message-row`, `.mention`, `.prose` overrides) live in `src/style.css` under `@layer components`.
- All user/model text is rendered through `utils/markdown.ts` `renderMarkdown()` (marked + GFM), which additionally escapes chat-artifact pseudo-tags like `<reply:@user>` and converts `@mentions`/`<@user>` into `.mention` badge spans. Use it (via `v-html`) for any markdown content rather than calling `marked` directly.

## Config

`vite.config.ts`: `@` aliases `src/`; dev server on 5173 proxies `/api` → `:3020` (root `CLAUDE.md` covers the port coupling). No env vars; the API base is a hardcoded relative `/api`.
