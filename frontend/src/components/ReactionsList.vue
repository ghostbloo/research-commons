<template>
  <!-- Reaction counts (always visible if reactions exist) -->
  <div v-if="hasReactions" class="flex items-center gap-1">
    <div
      v-for="reactionType in reactionTypes"
      :key="reactionType"
      v-show="getReactionCount(reactionType) > 0"
      class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] transition-all"
      :class="hasUserReacted(reactionType)
        ? 'bg-indigo-500/20 text-indigo-300'
        : 'bg-gray-700/50 text-gray-400'"
      :title="getReactionLabel(reactionType)"
    >
      <span>{{ getReactionEmoji(reactionType) }}</span>
      <span class="font-mono">{{ getReactionCount(reactionType) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  reactions?: Array<{ user_id: string; reaction_type: string }>
  currentUserId?: string
}

const props = withDefaults(defineProps<Props>(), {
  reactions: () => [],
  currentUserId: '',
})

const reactionTypes = ['star', 'laugh', 'sparkles']

const hasReactions = computed(() => {
  return props.reactions && props.reactions.length > 0
})

function getReactionEmoji(reactionType: string): string {
  const emojis = {
    star: '⭐',
    laugh: '😄',
    sparkles: '✨'
  }
  return emojis[reactionType as keyof typeof emojis] || ''
}

function getReactionCount(reactionType: string): number {
  return props.reactions?.filter(r => r.reaction_type === reactionType).length || 0
}

function hasUserReacted(reactionType: string): boolean {
  if (!props.currentUserId) return false
  return props.reactions?.some(r => r.reaction_type === reactionType && r.user_id === props.currentUserId) || false
}

function getReactionLabel(reactionType: string): string {
  const labels = { star: 'Interesting', laugh: 'Funny', sparkles: 'Beautiful' }
  const count = getReactionCount(reactionType)
  if (count > 0) {
    return `${labels[reactionType as keyof typeof labels]} (${count})`
  }
  return labels[reactionType as keyof typeof labels] || reactionType
}
</script>
