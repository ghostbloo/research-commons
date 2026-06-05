<template>
  <div v-if="visible" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" @mousedown.self="$emit('close')">
    <div class="bg-gray-900 rounded-lg border border-gray-700 max-w-3xl w-full max-h-[80vh] flex flex-col" @mousedown.stop>
      <div class="p-4 border-b border-gray-700">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-100">Select Starting Message</h3>
          <button @click="$emit('close')" class="text-gray-400 hover:text-gray-200">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p class="text-sm text-gray-400 mt-1">Click a message to set it as the starting point</p>
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-2">
        <div v-if="loading" class="text-center py-8 text-gray-400">
          <div class="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500/30 border-t-indigo-500 mx-auto mb-2"></div>
          Loading messages...
        </div>

        <button
          v-for="msg in messages"
          :key="msg.id"
          @click="$emit('select', msg.message_url)"
          class="w-full text-left p-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-indigo-500/50 rounded transition-all group"
        >
                <div class="flex items-start gap-3">
                  <div class="text-xs text-gray-500 w-14 shrink-0 text-right">
                    {{ formatPreviewTime(msg.timestamp) }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-gray-300 mb-1">
                      {{ msg.author_name }}
                      <span class="text-xs text-gray-500">@{{ msg.author_username }}</span>
                    </div>
                    <div class="text-xs text-gray-400 line-clamp-2">
                      {{ msg.content || '[No text content]' }}
                    </div>
                  </div>
            <svg class="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
        </button>
      </div>

            <div class="p-4 border-t border-gray-700 flex justify-between items-center">
              <div>
                <button
                  v-if="canLoadEarlier"
                  @click="$emit('load-earlier')"
                  :disabled="loading"
                  class="px-4 py-2 border border-gray-700 text-gray-300 hover:bg-gray-800 rounded transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <svg v-if="loading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{{ loading ? 'Loading...' : '← Load Earlier' }}</span>
                </button>
              </div>
              <button
                @click="$emit('close')"
                class="px-4 py-2 border border-gray-700 text-gray-300 hover:bg-gray-800 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  visible: boolean
  messages: any[]
  loading: boolean
  canLoadEarlier: boolean
}

const props = defineProps<Props>()

defineEmits<{
  'select': [messageUrl: string]
  'load-earlier': []
  'close': []
}>()

function formatPreviewTime(timestamp: string): string {
  // Get the most recent message (LAST in the list since we sort oldest first) as reference
  if (props.messages.length === 0) return ''

  const messageDate = new Date(timestamp)
  const latestMessage = props.messages[props.messages.length - 1]  // Last = newest
  const latestDate = new Date(latestMessage.timestamp)

  const diffMs = latestDate.getTime() - messageDate.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)

  if (diffMinutes < 1) return 'now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffWeeks < 4) return `${diffWeeks}w ago`
  if (diffMonths < 12) return `${diffMonths}mo ago`

  const diffYears = Math.floor(diffMonths / 12)
  return `${diffYears}y ago`
}
</script>
