<template>
  <!-- Actions bar (floats on top, appears on hover, becomes sticky at header) -->
  <div
    ref="actionsBarEl"
    class="flex flex-col gap-1 rounded-lg shadow-xl border border-gray-700/50 px-2 py-1"
    :class="isActionsBarSticky ? 'fixed z-50 bg-gray-900' : 'absolute right-2 bg-gray-900/95 backdrop-blur-sm'"
    :style="isActionsBarSticky ? { top: '80px', left: actionsBarLeft } : { top: '-30px' }"
    data-message-actions
    @mouseenter="$emit('bar-enter')"
    @mouseleave="$emit('bar-leave')"
  >
      <!-- Row 1: Main actions -->
      <div class="flex items-center gap-1">
        <button
          v-if="currentUserId"
          @click="$emit('add-tag')"
          class="px-2 py-1 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded transition-all flex items-center gap-1.5"
          data-tooltip="Add tag"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          Tag
        </button>
        <div v-if="currentUserId" class="w-px h-4 bg-gray-700" />
        <button
          v-if="currentUserId"
          @click="$emit('add-comment')"
          class="px-2 py-1 text-xs text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded transition-all flex items-center gap-1.5"
          data-tooltip="Add comment"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          Comment
        </button>
        <div v-if="currentUserId" class="w-px h-4 bg-gray-700" />
        <button
          @click="$emit('copy')"
          class="px-2 py-1 text-xs text-gray-500 hover:text-gray-400 transition-colors"
          data-tooltip="Copy"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <div class="w-px h-4 bg-gray-700" />
        <button
          v-if="currentUserId && canPin"
          @click="$emit('toggle-pin')"
          class="px-2 py-1 text-xs transition-colors"
          :class="isPinned ? 'text-amber-400 hover:text-amber-300' : 'text-gray-500 hover:text-gray-400'"
          :data-tooltip="isPinned ? 'Unpin' : 'Pin'"
        >
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path v-if="isPinned" d="M16 12V4h1a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h1v8l-4.5 4.5A1 1 0 0 0 3 16v2a1 1 0 0 0 1 1h6v5l1 1 1-1v-5h6a1 1 0 0 0 1-1v-2a1 1 0 0 0-.5-.87L16 12z" />
            <path v-else d="M16 12V4h1a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h1v8l-4.5 4.5A1 1 0 0 0 3 16v2a1 1 0 0 0 1 1h6v5l1 1 1-1v-5h6a1 1 0 0 0 1-1v-2a1 1 0 0 0-.5-.87L16 12z" fill-opacity="0.4" />
          </svg>
        </button>
        <div v-if="canHideMessage" class="w-px h-4 bg-gray-700" />
        <button
          v-if="canHideMessage"
          @click="$emit('toggle-hide')"
          class="px-2 py-1 text-xs transition-colors"
          :class="isHidden ? 'text-red-400 hover:text-red-300' : 'text-gray-500 hover:text-gray-400'"
          :data-tooltip="isHidden ? 'Unhide' : 'Hide'"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path v-if="isHidden" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path v-if="isHidden" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        </button>
        <button
          v-if="canHideMessage && !isHidden"
          @click="$emit('hide-all-previous')"
          class="px-2 py-1 text-xs text-gray-500 hover:text-gray-400 transition-colors"
          data-tooltip="Hide all previous"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 11l7-7 7 7M5 19l7-7 7 7" />
          </svg>
        </button>
        <div v-if="canToggleHiddenFromModels" class="w-px h-4 bg-gray-700" />
        <button
          v-if="canToggleHiddenFromModels"
          @click="$emit('toggle-hidden-from-models')"
          class="px-2 py-1 text-xs transition-colors flex items-center gap-1"
          :class="isHiddenFromModels ? 'text-amber-400 hover:text-amber-300' : 'text-gray-500 hover:text-gray-400'"
          :data-tooltip="isHiddenFromModels ? 'Show to models' : 'Hide from models'"
        >
          <span class="text-[10px]">🫥</span>
        </button>
        <div class="w-px h-4 bg-gray-700" />
        <button
          @click="$emit('toggle-monospace')"
          class="px-2 py-1 text-xs transition-colors"
          :class="isMonospace ? 'text-indigo-400 hover:text-indigo-300' : 'text-gray-500 hover:text-gray-400'"
          :data-tooltip="isMonospace ? 'Proportional font' : 'Monospace font'"
        >
          <span class="font-mono text-[10px] font-bold">𝙼</span>
        </button>
      </div>

      <!-- Row 2: Reactions -->
      <div v-if="currentUserId" class="flex items-center gap-1 pt-1 border-t border-gray-700/50">
        <button
          v-for="reactionType in reactionTypes"
          :key="reactionType"
          @click="$emit('toggle-reaction', reactionType as 'star' | 'laugh' | 'sparkles')"
          class="px-2 py-1 rounded-full text-xs transition-all flex items-center gap-1"
          :class="hasUserReacted(reactionType)
            ? 'bg-indigo-500/30 border border-indigo-500/60 text-indigo-300'
            : 'text-gray-400 hover:bg-gray-700/50'"
          :data-tooltip="getReactionLabel(reactionType)"
        >
          <span>{{ getReactionEmoji(reactionType) }}</span>
          <span v-if="getReactionCount(reactionType) > 0" class="font-mono text-[10px]">{{ getReactionCount(reactionType) }}</span>
        </button>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  isActionsBarSticky?: boolean
  actionsBarLeft?: string
  currentUserId?: string
  canPin?: boolean
  isPinned?: boolean
  canHideMessage?: boolean
  isHidden?: boolean
  canToggleHiddenFromModels?: boolean
  isHiddenFromModels?: boolean
  isMonospace?: boolean
  reactions?: Array<{ user_id: string; reaction_type: string }>
}

const props = withDefaults(defineProps<Props>(), {
  isActionsBarSticky: false,
  actionsBarLeft: '0px',
  currentUserId: '',
  canPin: false,
  isPinned: false,
  canHideMessage: false,
  isHidden: false,
  canToggleHiddenFromModels: false,
  isHiddenFromModels: false,
  isMonospace: false,
  reactions: () => [],
})

defineEmits<{
  'add-tag': []
  'add-comment': []
  'copy': []
  'toggle-pin': []
  'toggle-hide': []
  'hide-all-previous': []
  'toggle-hidden-from-models': []
  'toggle-monospace': []
  'toggle-reaction': [reactionType: 'star' | 'laugh' | 'sparkles']
  'bar-enter': []
  'bar-leave': []
}>()

const reactionTypes = ['star', 'laugh', 'sparkles']

// Root element exposed so the parent's sticky-positioning composable can
// measure it and locate the enclosing `.message-card`.
const actionsBarEl = ref<HTMLElement>()
defineExpose({ actionsBarEl })

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

<style scoped>
/* Fast CSS tooltips */
[data-tooltip] {
  position: relative;
}

[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-4px);
  padding: 4px 8px;
  background: rgba(17, 24, 39, 0.95);
  color: #e5e7eb;
  font-size: 11px;
  white-space: nowrap;
  border-radius: 4px;
  border: 1px solid rgba(75, 85, 99, 0.5);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
  z-index: 100;
}

[data-tooltip]:hover::after {
  opacity: 1;
  transition-delay: 0.1s;
}
</style>
