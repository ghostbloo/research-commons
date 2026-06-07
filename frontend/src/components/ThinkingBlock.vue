<template>
  <div class="mt-2 mb-2">
    <details class="group thinking-block" :open="openByDefault">
      <summary class="cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
        <!-- Collapsed state: full preview box -->
        <div class="group-open:hidden flex items-start gap-2 p-2 rounded-lg bg-gray-800/40 border border-gray-600/30 hover:bg-gray-800/50 transition-colors">
          <svg class="w-3 h-3 mt-0.5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          <div class="flex-1 min-w-0">
            <span class="text-[10px] uppercase tracking-wide font-medium text-gray-500">Thinking</span>
            <div class="text-[11px] text-gray-400/80 leading-relaxed mt-0.5 line-clamp-4">{{ getThinkingPreview(block, 4) }}</div>
          </div>
        </div>
        <!-- Expanded state: minimal inline header -->
        <div class="hidden group-open:flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-400 py-0.5">
          <svg class="w-2.5 h-2.5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
          <span class="uppercase tracking-wide font-medium">Thinking</span>
          <span class="text-gray-600">· click to collapse</span>
        </div>
      </summary>
      <div class="p-2 bg-gray-800/30 border border-gray-600/20 rounded-lg mt-0.5">
        <div class="text-[11px] text-gray-300/80 leading-relaxed thinking-content" v-html="renderTextWithHighlights(getThinkingContent(block), selections, blockIndex)" />
      </div>
    </details>
  </div>
</template>

<script setup lang="ts">
import type { ContentBlock } from '@/types'
import {
  renderTextWithHighlights,
  type SelectionHighlight,
} from '@/utils/messageHighlights'

interface Props {
  block: ContentBlock
  blockIndex: number
  selections?: SelectionHighlight[]
  openByDefault?: boolean
}

withDefaults(defineProps<Props>(), {
  selections: () => [],
  openByDefault: false,
})

// Get thinking content from various formats
function getThinkingContent(block: any): string {
  // Handle nested object format: { thinking: { content: "..." } }
  if (block.thinking?.content) {
    return block.thinking.content
  }
  // Handle direct string format: { thinking: "..." }
  if (typeof block.thinking === 'string') {
    return block.thinking
  }
  return ''
}

// Get preview of thinking for collapsed view
function getThinkingPreview(block: any, lines: number = 4): string {
  const content = getThinkingContent(block)
  if (!content) return ''

  // Get first N non-empty lines
  const allLines = content.split('\n').filter((l: string) => l.trim())
  const previewLines = allLines.slice(0, lines)
  const preview = previewLines.join('\n')

  // Add ellipsis if there's more content
  if (allLines.length > lines) {
    return preview + '...'
  }
  return preview
}
</script>

<style scoped>
/* Thinking block styles - muted gray appearance */
.thinking-content :deep(p) {
  @apply my-1 text-[11px] leading-relaxed;
}

.thinking-content :deep(ul), .thinking-content :deep(ol) {
  @apply my-1 text-[11px];
}

.thinking-content :deep(li) {
  @apply my-0.5;
}

.thinking-content :deep(strong) {
  @apply text-gray-300/90;
}

.thinking-content :deep(code) {
  @apply bg-gray-700/40 px-1 py-0.5 rounded text-gray-300/80 text-[10px];
}

.thinking-content :deep(pre) {
  @apply bg-gray-700/30 p-2 rounded text-[10px];
}

/* Highlights in thinking blocks */
.thinking-content :deep(.selection-highlight) {
  @apply rounded-sm cursor-pointer;
  color: inherit;
  background: transparent;
  border-bottom: 2px solid rgb(239 68 68 / 0.7);
}

.thinking-content :deep(.selection-highlight:hover) {
  @apply bg-red-500/20;
}

.thinking-content :deep(.selection-highlight.annotated) {
  border-bottom: 2px solid rgb(96 165 250 / 0.8);
  color: inherit;
  background: transparent;
}

.thinking-content :deep(.selection-highlight.annotated:hover) {
  @apply bg-blue-500/25;
}
</style>
