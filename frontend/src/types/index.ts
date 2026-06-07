// Frontend-facing domain types, derived from the canonical Zod schemas in the shared
// workspace package (@anima-labs/research-commons-shared) — the single source of truth.
//
// The schemas infer Date-typed fields, but over the API those arrive as JSON strings, so we
// apply Serialized<> (Date -> string, recursively). This replaces the hand-mirrored copies
// that used to live here. See issue #2.
import type {
  Serialized,
  User as UserDTO,
  ContentBlock as ContentBlockDTO,
  ModelInfo as ModelInfoDTO,
  Message as MessageDTO,
  Submission as SubmissionDTO,
  Selection as SelectionDTO,
  Comment as CommentDTO,
  Rating as RatingDTO,
  Topic as TopicDTO,
} from '@anima-labs/research-commons-shared'

// Pure string-union types need no serialization; re-export them as-is.
export type { Visibility, SubmissionType } from '@anima-labs/research-commons-shared'

export * from './ontology'
export * from './ranking'

export type User = Serialized<UserDTO>
export type ContentBlock = Serialized<ContentBlockDTO>
export type ModelInfo = Serialized<ModelInfoDTO>
export type Message = Serialized<MessageDTO>
export type Submission = Serialized<SubmissionDTO>
export type Selection = Serialized<SelectionDTO>
export type Comment = Serialized<CommentDTO>
export type Rating = Serialized<RatingDTO>
export type Topic = Serialized<TopicDTO>
