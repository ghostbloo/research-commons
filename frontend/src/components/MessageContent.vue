<template>
  <!-- Content -->
  <div
    class="message-text text-gray-200 leading-relaxed relative"
    :class="{ 'font-mono text-sm whitespace-pre overflow-x-auto': isMonospace }"
    @mouseup="onTextSelect"
    @click="onContentClick"
    ref="contentEl"
  >
    <template v-for="(block, idx) in blocks" :key="idx">
      <!-- Check if this is a redacted message (block characters) -->
      <div v-if="block.type === 'text' && block.text?.includes('▓')" class="relative">
        <div class="text-gray-500 select-none font-mono" style="filter: blur(1.5px); letter-spacing: 0.05em; line-height: 1.6;">
          {{ block.text }}
        </div>
        <!-- Centered overlay caption -->
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="bg-gray-900/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-700/50 flex items-center gap-2">
            <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
            <span class="text-sm text-gray-300 font-medium">Content hidden</span>
          </div>
        </div>
      </div>
      <div v-else-if="block.type === 'text'" v-html="renderTextWithHighlights(block.text || '', selections, idx)" class="prose prose-invert prose-sm max-w-none" />
      <div v-else-if="block.type === 'image'" class="mt-2">
        <img
          :src="'data:' + block.mime_type + ';base64,' + block.data"
          class="max-w-full rounded border border-gray-700"
          alt="Discord attachment"
        />
      </div>
      <ThinkingBlock
        v-else-if="block.type === 'thinking'"
        :block="block"
        :block-index="idx"
        :selections="selections"
        :open-by-default="thinkingOpenByDefault"
      />
    </template>
  </div>

  <!-- Highlight action popup -->
  <Teleport to="body">
    <div
      v-if="activeHighlightId"
      class="fixed z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1"
      :style="{ left: highlightPopupPosition.x + 'px', top: highlightPopupPosition.y + 'px' }"
    >
      <button
        @click="deleteHighlight"
        class="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-400 hover:bg-gray-700 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete Highlight
      </button>
      <button
        @click="closeHighlightPopup"
        class="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-700 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Cancel
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ContentBlock } from '@/types'
import {
  renderTextWithHighlights,
  type SelectionHighlight,
} from '@/utils/messageHighlights'
import { useMessageSelection } from '@/composables/useMessageSelection'
import ThinkingBlock from './ThinkingBlock.vue'

interface Props {
  /** Content blocks to render (already pre-processed, e.g. reply prefix stripped). */
  blocks: ContentBlock[]
  selections?: SelectionHighlight[]
  isMonospace?: boolean
  thinkingOpenByDefault?: boolean
}

withDefaults(defineProps<Props>(), {
  selections: () => [],
  isMonospace: false,
  thinkingOpenByDefault: false,
})

const emit = defineEmits<{
  'text-selected': [text: string, start: number, end: number]
  'delete-selection': [selectionId: string]
}>()

const contentEl = ref<HTMLElement>()

const {
  activeHighlightId,
  highlightPopupPosition,
  onTextSelect,
  onContentClick,
  deleteHighlight,
  closeHighlightPopup,
} = useMessageSelection(contentEl, {
  onTextSelected: (text, start, end) => emit('text-selected', text, start, end),
  onDeleteSelection: (selectionId) => emit('delete-selection', selectionId),
})

// Expose the rendered text content so the parent's copy action can read it
// (preserves the original `contentEl.textContent` copy behavior).
function getTextContent(): string {
  return contentEl.value?.textContent || ''
}

defineExpose({ getTextContent })
</script>

<style scoped>
.prose :deep(p) {
  @apply my-1;
}

.prose :deep(code) {
  @apply bg-gray-900/50 px-1 py-0.5 rounded text-gray-300;
}

.prose :deep(pre) {
  @apply bg-gray-900/50 p-3 rounded overflow-x-auto;
}

/* Selection highlights - underline only, background on hover */
.prose :deep(.selection-highlight) {
  @apply rounded-sm cursor-pointer;
  color: inherit;
  background: transparent;
  border-bottom: 3px solid rgba(255, 37, 37, 0.85); /* bright red */
  transition: background-color 0.15s ease;
}

.prose :deep(.selection-highlight:hover) {
  @apply bg-red-500/20;
}

.prose :deep(.selection-highlight.annotated) {
  border-bottom: 3px solid rgb(96 165 250 / 0.9); /* bright blue for annotated */
  color: inherit;
  background: transparent;
}

.prose :deep(.selection-highlight.annotated:hover) {
  @apply bg-blue-500/25;
}

.prose :deep(ul), .prose :deep(ol) {
  @apply my-2;
}
</style>
