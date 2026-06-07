# Annotation Ontology System

## Conceptual model

Annotation is built from a small set of entities:

- **Ontologies** — researcher-defined typologies (e.g. "LLM Response Patterns",
  "Interview Quality"). An ontology groups a set of categorical tags.
- **Tags** — categorical labels that live inside an ontology (`fawning`,
  `clear-preference`, …). Each tag has a color and description.
- **Selections** — a text range in a submission (Google-Docs style). A selection
  is the unit that carries **tags** and **comments**.
- **Ratings** — criterion-based scores. Ratings are attached to the **whole
  submission**, not to selections (see the note below).
- **Ranking systems** — named bundles of scoring criteria used to produce
  ratings. These are the quantitative counterpart to ontologies.

A selection can be tagged and discussed; the submission as a whole is scored.

> **Gotcha:** ratings are submission-level (`ratings.submission_id`, no
> selection reference), and the selection card renders tags and comments only —
> not ratings. There is no "unified card" carrying all three on one selection.

### Tags vs. ratings

- **Ontology tags** are categorical — a selection either is or isn't `fawning`.
- **Ratings** are scalar — "how authentic is this submission? 1–5", scored
  against a criterion drawn from a ranking system.

### Tag voting

Tags are applied by **voting**, not single assignment. The `selection_tags`
table is keyed on `(selection_id, tag_id, tagged_by)`, so multiple users can
each cast a vote for the same tag on the same selection. The selection card
surfaces vote counts and per-tag contributor attributions, and a user can
remove their own vote.

---

## Entities

Defined once as Zod schemas in the `shared/` workspace package (`shared/src/`),
consumed by both backend and frontend (the frontend derives its types from the
same schemas — see issue #2 and root `CLAUDE.md`). See those files for exact
fields; the notes below capture the parts that aren't obvious from the names.

`shared/src/ontology.ts`
- **AnnotationOntology** — a typology. `category` is
  `model-behavior | interviewer-quality | custom`; `permissions` is
  `public | expert-only` (who may apply it).
- **AnnotationTag** — a tag within an ontology (`name`, `description`, `color`,
  optional `examples`).
- **SubmissionOntology** — attaches an ontology to a submission; only attached
  ontologies show in the tag picker. `usage_permissions` is
  `anyone | expert-only | researcher-only`; `is_default` means auto-attached
  from the submission's topic.

`shared/src/annotation.ts`
- **Selection** — a text range (`start/end_message_id` + offsets). Carries
  `annotation_tags` (tag IDs) and an optional legacy freeform `label`; tagging
  via the `selection_tags` vote table is the primary path.
- **Comment** — always targets a `selection_id` (no submission/comment target),
  threaded via `parent_id`. To comment on a whole conversation, make a selection
  spanning it.
- **Rating** — targets `submission_id` (not a selection), scored against a
  `criterion_id`. One rating per `(rater_id, submission_id, criterion_id)`.

`shared/src/research.ts`
- **Topic** — has `default_ontologies` and `default_ranking_systems`,
  auto-attached to submissions in the topic.

**Ranking systems & criteria** — the quantitative counterpart to ontologies.
A ranking system bundles scoring criteria (`name`, `description`, `scale_type`,
`scale_min`, `scale_max`); ratings reference a `criterion_id` from one. Managed
by `RankingStore`, with a `submission_ranking_systems` attachment table
mirroring `submission_ontologies`.

---

## Storage

### Event store (JSONL, under `data/`)

- `data/ontologies.jsonl` — ontology definitions
  (`ontology_created`, `ontology_updated`)
- `data/ontology-tags.jsonl` — tag definitions
  (`tag_created`, `tag_deleted`)

Managed by `src/services/ontology-store.ts` (`OntologyStore`). Submissions and
messages are stored separately and are unchanged by this system.

### SQLite — `src/database/schema.sql`

- `selections` — selection ranges (incl. legacy `label`)
- `selection_tags` — tag votes, keyed `(selection_id, tag_id, tagged_by)`
- `comments` — `selection_id` FK, threaded via `parent_id`
- `ratings` — `submission_id` FK, `criterion_id`, `score`
- `submission_ontologies` — ontology ↔ submission attachments
- `submission_ranking_systems` — ranking-system ↔ submission attachments

---

## Default seed data

Seeded on first run if no ontologies exist — see `createDefaultOntologies()` in
`src/index.ts`. A default topic ("Model Behavior Analysis") is also created and
references all seeded ontologies and ranking systems.

### LLM Response Patterns  (category: `model-behavior`)

| tag | color | description |
| --- | --- | --- |
| `clear-preference` | `#10b981` green | Explicitly states preferences or desires |
| `fawning` | `#f59e0b` orange | Overly compliant, seeking approval |
| `indirect-refusal` | `#ef4444` red | Avoids refusing but deflects the request |
| `authentic-uncertainty` | `#8b5cf6` purple | Genuinely expresses not knowing |
| `evasive` | `#6b7280` gray | Avoids addressing the core question |

### Interview Quality  (category: `interviewer-quality`)

| tag | color | description |
| --- | --- | --- |
| `leading-question` | `#ef4444` red | Question presupposes or suggests answer |
| `neutral-framing` | `#10b981` green | Question is open and unbiased |
| `anthropomorphizing` | `#f59e0b` orange | Attributes human qualities inappropriately |
| `clear-context` | `#3b82f6` blue | Provides adequate context and framing |

Default ranking systems ("Interview Quality Assessment", "Model Behavior
Assessment") are seeded alongside, each with numeric 1–5 criteria.

---

## API

### Ontologies — `src/routes/ontologies.ts`, mounted at `/api/ontologies`

| method | path | notes |
| --- | --- | --- |
| GET | `/api/ontologies` | list all |
| GET | `/api/ontologies/:id` | get with tags |
| POST | `/api/ontologies` | create (researcher role) |
| PUT | `/api/ontologies/:id` | update; replaces all tags (researcher + ownership, or admin) |
| POST | `/api/ontologies/attach` | attach to a submission |
| GET | `/api/ontologies/submission/:submissionId` | attached ontologies for a submission |
| POST | `/api/ontologies/tags/apply` | apply (vote) tags on a selection |

There is no endpoint to delete an individual tag; tags are edited by `PUT`-ing
the whole ontology with a replacement tag list.

### Annotations — `src/routes/annotations.ts`, mounted at `/api/annotations`

| method | path | notes |
| --- | --- | --- |
| POST | `/api/annotations/selections` | create selection |
| GET | `/api/annotations/selections/submission/:submissionId` | selections for a submission |
| DELETE | `/api/annotations/selections/:selectionId` | delete selection |
| DELETE | `/api/annotations/selections/:selectionId/tags/:tagId` | remove caller's tag vote |
| POST | `/api/annotations/comments` | create comment (`selection_id`) |
| GET | `/api/annotations/comments/selection/:selectionId` | comments for a selection |
| PATCH | `/api/annotations/comments/:commentId` | edit (author only) |
| DELETE | `/api/annotations/comments/:commentId` | delete |
| POST | `/api/annotations/ratings` | create rating (`submission_id`, rater+ role) |
| GET | `/api/annotations/ratings/submission/:submissionId` | ratings for a submission |
| DELETE | `/api/annotations/ratings/:ratingId` | delete |

Ratings are fetched and created by **submission**, not selection — there is no
`/ratings/selection/:id` route.

---

## Frontend

Components under `frontend/src/`:

- `components/SelectionCard.vue` — one card per selection; renders the **tags**
  section (with vote counts, contributor tooltips, add/remove) and the
  **comments** section (threaded). Emits `add-tag`, `add-tag-vote`,
  `add-comment`, `remove-tag`, `delete`, `delete-comment`.
- `components/TagPicker.vue` — modal grouping tags by ontology with checkboxes;
  only shows ontologies attached to the submission. Emits `apply` / `cancel`.
- `components/RatingForm.vue` — modal for criterion-based submission ratings,
  opened from the workspace header.
- `components/AnnotationMargin.vue` — positions annotation cards and tag bars
  alongside the conversation, with connector lines for displaced labels.
- `views/AnnotationWorkspace.vue` — the main two-column workspace (conversation +
  margin on desktop). Wires up text-selection context menu, the tag picker, and
  the rating form, and loads a submission's attached ontologies via
  `ontologiesAPI.getForSubmission()`.

Attaching ontologies, applying tags, commenting, and rating are all available in
the UI.

---

## Annotation flow

1. Open a submission in the annotation workspace.
2. Select text in a message → context menu → add a tag or comment, creating a
   selection.
3. The tag picker shows tags from the ontologies attached to that submission;
   checking tags casts votes recorded in `selection_tags`.
4. Comments thread under the selection; other users can add their own tag votes
   and replies.
5. Ratings are entered separately via the rating form and scored against the
   submission's ranking-system criteria.

---

## Permissions

- Ontology creation/editing: researcher role (editing also requires ownership,
  or admin).
- Applying tags / commenting: gated by the submission ontology's
  `usage_permissions` (`anyone` | `expert-only` | `researcher-only`).
- Rating: rater role or above.

---

## Design notes & open questions

- **Hierarchical tags** — not implemented; tags are flat (e.g. no
  `refusal → indirect-refusal` nesting).
- **User-created ontologies** — currently researcher-only; a
  community-propose / researcher-approve flow was considered but not built.
- **Selection visibility** — all selections appear in the margin (vs. only
  tagged/commented ones); no per-user configuration.
- **Migration** — the original refactor required a fresh database; there is no
  migration path from the pre-ontology schema.
