<template>
  <!-- Participant header (hidden in document mode) -->
  <div class="flex items-center gap-2 mb-1">

    <!-- Avatar -->
    <img
      v-if="participantAvatarUrl"
      :src="participantAvatarUrl"
      :alt="message.participant_name"
      class="w-6 h-6 rounded-full object-cover border border-gray-600"
    />
    <div
      v-else
      class="w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium"
      :class="{
        'bg-indigo-500 text-white': isUser,
        'bg-purple-500 text-white': !isUser && message.participant_type === 'model',
        'bg-gray-600 text-white': !isUser && message.participant_type !== 'model'
      }"
    >
      {{ message.participant_name.charAt(0) }}
    </div>
    <div class="flex flex-col">
      <span class="text-sm font-medium text-gray-300">
        {{ message.participant_name }}
      </span>
      <span v-if="message.metadata?.discord_username && message.metadata.discord_username !== message.participant_name" class="text-[10px] text-gray-500">
        @{{ message.metadata.discord_username }}
      </span>
    </div>
    <span v-if="message.model_info" class="text-xs text-gray-500 font-mono">
      {{ formatModelName(message.model_info.model_id) }}
    </span>
    <div class="flex items-center gap-2 ml-auto">
      <!-- Reaction counts (always visible if reactions exist) -->
      <ReactionsList :reactions="reactions" :current-user-id="currentUserId" />

      <span class="text-xs text-gray-600 hidden sm:inline">
        {{ formatTime(message.timestamp) }}
      </span>
    </div>

    <!-- Actions trigger (hover, hidden in selection mode) -->
    <button
      v-if="!selectionMode"
      class="opacity-0 group-hover:opacity-40 hover:!opacity-100 text-gray-500 hover:text-gray-300 transition-all leading-none"
      @click.stop="$emit('toggle-actions')"
    >
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Message } from '@/types'
import ReactionsList from './ReactionsList.vue'

interface Props {
  message: Message
  selectionMode?: boolean
  reactions?: Array<{ user_id: string; reaction_type: string }>
  currentUserId?: string
  participantAvatars?: Map<string, string>
}

const props = withDefaults(defineProps<Props>(), {
  selectionMode: false,
  reactions: () => [],
  currentUserId: '',
  participantAvatars: () => new Map(),
})

defineEmits<{
  'toggle-actions': []
}>()

const isUser = computed(() => props.message.participant_type === 'human')

// Get avatar URL for this message's participant
const participantAvatarUrl = computed(() => {
  // First check message metadata
  if (props.message.metadata?.avatar_url && typeof props.message.metadata.avatar_url === 'string') {
    console.log('[Message] Using avatar from metadata for', props.message.participant_name, ':', props.message.metadata.avatar_url)
    return props.message.metadata.avatar_url as string
  }

  // Fall back to participant avatars map
  if (props.participantAvatars) {
    const avatar = props.participantAvatars.get(props.message.participant_name)
    if (avatar && avatar.startsWith('http')) {
      console.log('[Message] Using avatar from map for', props.message.participant_name, ':', avatar)
      return avatar
    }
  }

  console.log('[Message] No avatar found for', props.message.participant_name, 'metadata:', props.message.metadata)
  return undefined
})

// Format model name for display - keep date suffixes (important for sonnet-3.5 versions)
function formatModelName(modelId: string): string {
  if (!modelId) return ''

  // For Claude models, strip the "claude-" prefix but keep everything else
  // claude-opus-4.5 -> opus-4.5
  // claude-3-5-sonnet-20241022 -> 3-5-sonnet-20241022
  // claude-opus-4-5-20251101 -> opus-4-5-20251101
  if (modelId.startsWith('claude-')) {
    return modelId.replace('claude-', '')
  }

  return modelId
}

function formatTime(timestamp?: string) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
</script>
