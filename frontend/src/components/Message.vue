<template>
  <div
    class="message-wrapper flex"
    :class="{
      'mb-3': !documentMode,
      'justify-end': isUser && !documentMode,
      'justify-start': !isUser && !documentMode
    }"
    :data-message-id="message.id"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <!-- Message card (document mode: clean reading layout, no chrome) -->
    <div
      class="message-card group relative transition-all"
      :class="documentMode ? 'document-mode' : {
        'bg-indigo-500/10 border-indigo-500/20': isUser && !hasReactions && !isHidden && !isHiddenFromModels,
        'bg-indigo-500/15 border-indigo-400 border-2': isUser && hasReactions && !isHidden && !isHiddenFromModels,
        'bg-gray-800/40 border-gray-700/40': !isUser && !hasReactions && !isHidden && !isHiddenFromModels,
        'bg-gray-800/60 border-gray-500 border-2': !isUser && hasReactions && !isHidden && !isHiddenFromModels,
        'bg-red-900/20 border-red-600/50 border-2': isHidden,
        'bg-amber-900/10 border-amber-600/30 border-dashed border-2': isHiddenFromModels && !isHidden,
        'ring-2 ring-indigo-400/50': hasAnnotation && !isHidden && !isHiddenFromModels
      }"
      :style="{ maxWidth: documentMode ? '100%' : (isUser ? (isMobile ? '95%' : '80%') : '100%') }"
    >
      <!-- Hidden / hidden-from-models badges (not shown in document mode) -->
      <MessageBadges
        :is-hidden="isHidden"
        :is-hidden-from-models="isHiddenFromModels"
        :document-mode="documentMode"
      />

      <!-- Reply indicator (shown above header if this is a reply) -->
      <ReplyIndicator
        :username="replyInfo?.username"
        :document-mode="documentMode"
      />

      <!-- Participant header (hidden in document mode) -->
      <MessageHeader
        v-if="!documentMode"
        :message="message"
        :selection-mode="selectionMode"
        :reactions="reactions"
        :current-user-id="currentUserId"
        :participant-avatars="participantAvatars"
        @toggle-actions="toggleActions"
      />

      <!-- Content -->
      <MessageContent
        :blocks="processedContentBlocks"
        :selections="selections"
        :is-monospace="isMonospace"
        :thinking-open-by-default="thinkingOpenByDefault"
        @text-selected="onTextSelected"
        @delete-selection="(id) => emit('delete-selection', id)"
        ref="contentComp"
      />

      <!-- Actions bar (floats on top, appears on hover, becomes sticky at header) -->
      <MessageActionsBar
        v-if="showActions || actionsExpanded"
        ref="actionsBarComp"
        :is-actions-bar-sticky="isActionsBarSticky"
        :actions-bar-left="actionsBarLeft"
        :current-user-id="currentUserId"
        :can-pin="canPin"
        :is-pinned="isPinned"
        :can-hide-message="canHideMessage"
        :is-hidden="isHidden"
        :can-toggle-hidden-from-models="canToggleHiddenFromModels"
        :is-hidden-from-models="isHiddenFromModels"
        :is-monospace="isMonospace"
        :reactions="reactions"
        @add-tag="addTag"
        @add-comment="addComment"
        @copy="copyMessage"
        @toggle-pin="togglePin"
        @toggle-hide="toggleHide"
        @hide-all-previous="hideAllPrevious"
        @toggle-hidden-from-models="toggleHiddenFromModels"
        @toggle-monospace="toggleMonospace"
        @toggle-reaction="toggleReaction"
        @bar-enter="handleActionsBarEnter"
        @bar-leave="handleActionsBarLeave"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Message } from '@/types'
import { useActionsBarSticky } from '@/composables/useActionsBarSticky'
import MessageBadges from './MessageBadges.vue'
import ReplyIndicator from './ReplyIndicator.vue'
import MessageHeader from './MessageHeader.vue'
import MessageContent from './MessageContent.vue'
import MessageActionsBar from './MessageActionsBar.vue'

interface SelectionHighlight {
  id: string
  start_offset: number
  end_offset: number
  label?: string
  hasComments?: boolean
  hasTags?: boolean
}

interface Props {
  message: Message
  documentMode?: boolean // Document view: hide message chrome, full-width reading layout
  hasAnnotation?: boolean
  hasBranches?: boolean
  branchIndex?: number
  branchCount?: number
  selectionMode?: boolean
  isSelected?: boolean
  isPinned?: boolean
  isHidden?: boolean
  isHiddenFromModels?: boolean
  canHideMessage?: boolean
  canToggleHiddenFromModels?: boolean
  canPin?: boolean
  reactions?: Array<{ user_id: string; reaction_type: string }>
  currentUserId?: string
  participantAvatars?: Map<string, string>
  selections?: SelectionHighlight[]
}

const props = withDefaults(defineProps<Props>(), {
  documentMode: false,
  hasAnnotation: false,
  hasBranches: false,
  branchIndex: 0,
  isPinned: false,
  isHidden: false,
  isHiddenFromModels: false,
  canHideMessage: false,
  canToggleHiddenFromModels: false,
  canPin: false,
  branchCount: 1,
  selectionMode: false,
  isSelected: false,
  reactions: () => [],
  currentUserId: '',
  participantAvatars: () => new Map(),
  selections: () => []
})

const emit = defineEmits<{
  'text-selected': [messageId: string, text: string, start: number, end: number]
  'add-tag-to-message': [messageId: string]
  'add-comment-to-message': [messageId: string]
  'copy-message': [messageId: string]
  'toggle-pin': [messageId: string]
  'toggle-hide': [messageId: string]
  'toggle-hidden-from-models': [messageId: string]
  'toggle-monospace': [messageId: string]
  'hide-all-previous': [messageId: string]
  'toggle-reaction': [messageId: string, reactionType: 'star' | 'laugh' | 'sparkles']
  'delete-selection': [selectionId: string]
  'prev-branch': []
  'next-branch': []
}>()

// Child component refs
const contentComp = ref<InstanceType<typeof MessageContent>>()
const actionsBarComp = ref<InstanceType<typeof MessageActionsBar>>()

// Element ref to the actions bar (exposed by MessageActionsBar) for the sticky
// composable to measure. Available only while the bar is rendered.
const actionsBarEl = computed(() => actionsBarComp.value?.actionsBarEl)

// Sticky actions-bar positioning + hover/visibility bookkeeping
const {
  showActions,
  actionsExpanded,
  isMobile,
  isActionsBarSticky,
  actionsBarLeft,
  handleMouseEnter,
  handleMouseLeave,
  handleActionsBarEnter,
  handleActionsBarLeave,
  toggleActions,
} = useActionsBarSticky(actionsBarEl)

// Check if this message should be displayed in monospace (from message metadata)
const isMonospace = computed(() => {
  return props.message.metadata?.monospace === true
})

const isUser = computed(() => props.message.participant_type === 'human')

// Reaction helpers
const hasReactions = computed(() => {
  return props.reactions && props.reactions.length > 0
})

// Thinking blocks should be open by default if message is pinned, has reactions, or has annotations
const thinkingOpenByDefault = computed(() => {
  return props.isPinned || props.hasAnnotation || (props.reactions && props.reactions.length > 0)
})

// Extract reply mention from message content (for header display)
const replyInfo = computed(() => {
  const firstBlock = props.message.content_blocks[0]
  if (firstBlock?.type !== 'text' || !firstBlock.text) return null

  const text = firstBlock.text

  // Match <reply:@username> or reply:@username at the start
  const bracketMatch = text.match(/^<reply:@([^>]+)>\s*/)
  if (bracketMatch) {
    return {
      username: bracketMatch[1],
      remainingText: text.slice(bracketMatch[0].length)
    }
  }

  const plainMatch = text.match(/^reply:@(\S+)\s*/)
  if (plainMatch) {
    return {
      username: plainMatch[1],
      remainingText: text.slice(plainMatch[0].length)
    }
  }

  return null
})

// Get content blocks with reply prefix stripped from first block
const processedContentBlocks = computed(() => {
  if (!replyInfo.value) return props.message.content_blocks

  const blocks = [...props.message.content_blocks]
  if (blocks[0]?.type === 'text') {
    blocks[0] = {
      ...blocks[0],
      text: replyInfo.value.remainingText
    }
  }
  return blocks
})

// Forward in-content text selection, prepending the message id
function onTextSelected(text: string, start: number, end: number) {
  emit('text-selected', props.message.id, text, start, end)
}

function addTag() {
  actionsExpanded.value = false
  emit('add-tag-to-message', props.message.id)
}

function addComment() {
  actionsExpanded.value = false
  emit('add-comment-to-message', props.message.id)
}

function copyMessage() {
  // Copy message content to clipboard
  const content = contentComp.value?.getTextContent() || ''
  navigator.clipboard.writeText(content)
  emit('copy-message', props.message.id)
}

function togglePin() {
  actionsExpanded.value = false
  emit('toggle-pin', props.message.id)
}

function toggleHide() {
  actionsExpanded.value = false
  emit('toggle-hide', props.message.id)
}

function toggleHiddenFromModels() {
  actionsExpanded.value = false
  emit('toggle-hidden-from-models', props.message.id)
}

function toggleMonospace() {
  actionsExpanded.value = false
  emit('toggle-monospace', props.message.id)
}

function hideAllPrevious() {
  actionsExpanded.value = false
  emit('hide-all-previous', props.message.id)
}

function toggleReaction(reactionType: 'star' | 'laugh' | 'sparkles') {
  emit('toggle-reaction', props.message.id, reactionType)
}
</script>

<style scoped>
.message-card {
  @apply px-3 py-2 rounded-lg border;
}

/* Document mode: clean reading layout without conversation chrome */
.message-card.document-mode {
  @apply bg-transparent border-none px-0 py-0 rounded-none;
  max-width: 100% !important;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
