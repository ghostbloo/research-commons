import { ref, computed, type Ref } from 'vue'
import type { Rating } from '@/types'
import type { useAuthStore } from '@/stores/auth'
import type { useSubmissionsStore } from '@/stores/submissions'

type AuthStore = ReturnType<typeof useAuthStore>
type SubmissionsStore = ReturnType<typeof useSubmissionsStore>

/**
 * Owns submission-level ratings: the `submissionRatings` cache, the derived
 * aggregate computeds (per-system averages, per-criterion stats/aggregates,
 * current-user ratings) and the rating-submission handler.
 *
 * `allCriteria` and `rankingSystemDetails` are passed in as refs because they are
 * loaded by the view alongside the rest of the submission data.
 */
export function useRatingState(
  submissionId: string,
  authStore: AuthStore,
  submissionsStore: SubmissionsStore,
  allCriteria: Ref<Map<string, any>>,
  rankingSystemDetails: Ref<Map<string, any>>
) {
  const submissionRatings = ref<Rating[]>([])

  // Per-system rating averages
  const systemRatingAverages = computed(() => {
    const systemStats = new Map<string, { system_id: string; system_name: string; scores: number[]; max: number }>()

    for (const rating of submissionRatings.value) {
      const criterion = allCriteria.value.get(rating.criterion_id)
      if (!criterion) continue

      const systemId = criterion.ranking_system_id
      if (!systemStats.has(systemId)) {
        const systemDetail = rankingSystemDetails.value.get(systemId)
        systemStats.set(systemId, {
          system_id: systemId,
          system_name: systemDetail?.data.ranking_system?.name || 'System',
          scores: [],
          max: criterion.scale_max || 5
        })
      }
      systemStats.get(systemId)!.scores.push(rating.score)
    }

    return Array.from(systemStats.values()).map(stat => ({
      system_id: stat.system_id,
      system_name: stat.system_name,
      avg: stat.scores.reduce((a, b) => a + b, 0) / stat.scores.length,
      count: stat.scores.length,
      max: stat.max
    }))
  })

  // Rating statistics
  const ratingStats = computed(() => {
    const stats = new Map<string, { criterion_id: string; criterion_name: string; scores: number[]; max: number }>()

    for (const rating of submissionRatings.value) {
      const criterion = allCriteria.value.get(rating.criterion_id)
      if (!criterion) continue

      if (!stats.has(rating.criterion_id)) {
        stats.set(rating.criterion_id, {
          criterion_id: rating.criterion_id,
          criterion_name: criterion.name,
          scores: [],
          max: criterion.scale_max
        })
      }
      stats.get(rating.criterion_id)!.scores.push(rating.score)
    }

    return Array.from(stats.values()).map(stat => ({
      criterion_id: stat.criterion_id,
      criterion_name: stat.criterion_name,
      avg: stat.scores.reduce((a, b) => a + b, 0) / stat.scores.length,
      count: stat.scores.length,
      max: stat.max,
      scores: stat.scores
    })).sort((a, b) => b.count - a.count)
  })

  // Filter ratings to only current user's ratings
  const currentUserRatings = computed(() => {
    const currentUserId = authStore.user?.id
    if (!currentUserId) return []
    return submissionRatings.value.filter(r => r.rater_id === currentUserId)
  })

  // Compute aggregates per criterion for display
  const criterionAggregates = computed(() => {
    const aggregates = new Map<string, { avg: number; count: number; max: number }>()

    for (const rating of submissionRatings.value) {
      const criterion = allCriteria.value.get(rating.criterion_id)
      if (!criterion) continue

      if (!aggregates.has(rating.criterion_id)) {
        aggregates.set(rating.criterion_id, {
          avg: 0,
          count: 0,
          max: criterion.scale_max
        })
      }
      const agg = aggregates.get(rating.criterion_id)!
      agg.avg = ((agg.avg * agg.count) + rating.score) / (agg.count + 1)
      agg.count++
    }

    return aggregates
  })

  async function loadRatings() {
    submissionRatings.value = await submissionsStore.getRatingsBySubmission(submissionId)
  }

  async function submitRatings(ratings: Array<{ criterion_id: string; score: number }>) {
    try {
      // Submit all ratings at submission level
      for (const rating of ratings) {
        await submissionsStore.createRating({
          submission_id: submissionId,
          criterion_id: rating.criterion_id,
          score: rating.score
        })
      }

      // Refresh submission ratings (but keep form open for auto-save workflow)
      submissionRatings.value = await submissionsStore.getRatingsBySubmission(submissionId)
    } catch (err) {
      console.error('Failed to submit ratings:', err)
    }
  }

  return {
    submissionRatings,
    systemRatingAverages,
    ratingStats,
    currentUserRatings,
    criterionAggregates,
    loadRatings,
    submitRatings
  }
}
