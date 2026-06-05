// Derived from the canonical Zod schemas in @anima-labs/research-commons-shared (issue #2).
import type {
  Serialized,
  AnnotationTag as AnnotationTagDTO,
  AnnotationOntology as AnnotationOntologyDTO,
  SubmissionOntology as SubmissionOntologyDTO,
} from '@anima-labs/research-commons-shared'

export type AnnotationTag = Serialized<AnnotationTagDTO>
export type AnnotationOntology = Serialized<AnnotationOntologyDTO>
export type SubmissionOntology = Serialized<SubmissionOntologyDTO>
