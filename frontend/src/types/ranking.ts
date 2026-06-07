// Derived from the canonical Zod schemas in @anima-labs/research-commons-shared (issue #2).
import type {
  Serialized,
  Criterion as CriterionDTO,
  RankingSystem as RankingSystemDTO,
  SubmissionRankingSystem as SubmissionRankingSystemDTO,
} from '@anima-labs/research-commons-shared'

export type Criterion = Serialized<CriterionDTO>
export type RankingSystem = Serialized<RankingSystemDTO>
export type SubmissionRankingSystem = Serialized<SubmissionRankingSystemDTO>
