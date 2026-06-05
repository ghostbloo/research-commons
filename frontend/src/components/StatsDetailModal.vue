<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50"
    @click.self="$emit('close')"
  >
    <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col transition-colors">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Annotation Statistics</h2>
        <button
          @click="$emit('close')"
          class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <!-- Rating Stats Detail -->
        <div v-if="ratingStats.length > 0">
          <h3 class="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">⭐ Rating Breakdown</h3>
          <div class="space-y-4">
            <div
              v-for="stat in ratingStats"
              :key="stat.criterion_id"
              class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 transition-colors"
            >
              <div class="flex items-baseline justify-between mb-2">
                <span class="font-medium text-gray-900 dark:text-gray-100">{{ stat.criterion_name }}</span>
                <span class="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {{ stat.avg.toFixed(1) }}/{{ stat.max }}
                </span>
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {{ stat.count }} rating(s) • Range: {{ Math.min(...stat.scores) }}–{{ Math.max(...stat.scores) }}
              </div>
              <!-- Simple histogram -->
              <div class="flex gap-1 h-12 items-end">
                <div
                  v-for="score in Array.from({ length: stat.max + 1 }, (_, i) => i)"
                  :key="score"
                  class="flex-1 bg-indigo-200 dark:bg-indigo-700 rounded-t transition-colors"
                  :style="{
                    height: (stat.scores.filter(s => s === score).length / stat.count * 100) + '%',
                    minHeight: stat.scores.filter(s => s === score).length > 0 ? '4px' : '0'
                  }"
                  :title="`${score}: ${stat.scores.filter(s => s === score).length} rating(s)`"
                ></div>
              </div>
              <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span>0</span>
                <span>{{ stat.max }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tag Stats Detail -->
        <div v-if="tagStats.length > 0">
          <h3 class="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">🏷️ Tag Usage</h3>
          <div class="grid grid-cols-2 gap-3">
            <div
              v-for="stat in tagStats"
              :key="stat.tag_id"
              class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between border border-gray-200 dark:border-gray-700 transition-colors"
            >
              <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ stat.tag_name }}</span>
              <span class="text-lg font-bold text-gray-600 dark:text-gray-400">{{ stat.count }}</span>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="ratingStats.length === 0 && tagStats.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
          No statistics available yet.
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
        <button
          @click="$emit('close')"
          class="px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface RatingStat {
  criterion_id: string
  criterion_name: string
  avg: number
  count: number
  max: number
  scores: number[]
}

interface TagStat {
  tag_id: string
  tag_name: string
  count: number
}

interface Props {
  show: boolean
  ratingStats: RatingStat[]
  tagStats: TagStat[]
}

defineProps<Props>()

defineEmits<{
  'close': []
}>()
</script>
