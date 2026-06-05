<template>
  <div v-if="visible" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" @mousedown.self="$emit('cancel')">
    <div class="bg-gray-900 rounded-lg border border-gray-700 p-6 max-w-md w-full mx-4" @mousedown.stop>
      <h3 class="text-lg font-semibold text-gray-100 mb-4">
        Create Model{{ participantName ? ` for "${participantName}"` : '' }}
      </h3>

      <!-- Avatar Preview -->
      <div v-if="newModel.avatar" class="mb-4 flex items-center gap-3 p-3 bg-gray-800 rounded border border-gray-700">
        <img :src="newModel.avatar" class="w-12 h-12 rounded-full" alt="Model avatar" />
        <div class="text-sm text-gray-400">Avatar from Discord profile</div>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Model Name</label>
          <input
            v-model="newModel.name"
            type="text"
            placeholder="GPT-4, Claude 3.5, etc."
            class="w-full px-3 py-2 border border-gray-700 rounded bg-gray-800 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Description</label>
          <input
            v-model="newModel.description"
            type="text"
            placeholder="Brief description"
            class="w-full px-3 py-2 border border-gray-700 rounded bg-gray-800 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Provider</label>
          <select
            v-model="newModel.provider"
            class="w-full px-3 py-2 border border-gray-700 rounded bg-gray-800 text-gray-100 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="anthropic">Anthropic</option>
            <option value="openai">OpenAI</option>
            <option value="google">Google</option>
            <option value="meta">Meta</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Model ID</label>
          <input
            v-model="newModel.model_id"
            type="text"
            placeholder="e.g., gpt-4, claude-3-5-sonnet"
            class="w-full px-3 py-2 border border-gray-700 rounded bg-gray-800 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Color</label>
          <input
            v-model="newModel.color"
            type="color"
            class="w-full h-10 border border-gray-700 rounded bg-gray-800 cursor-pointer"
          />
        </div>
      </div>

      <div class="flex gap-3 mt-6">
        <button
          @click="$emit('cancel')"
          class="flex-1 px-4 py-2 border border-gray-700 text-gray-300 hover:bg-gray-800 rounded transition-colors"
        >
          Cancel
        </button>
        <button
          @click="createNewModel"
          :disabled="!newModel.name || !newModel.provider || !newModel.model_id"
          class="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Create Model
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { modelsAPI } from '@/services/api'
import type { DiscordParticipant } from '@/composables/useDiscordImport'

interface Props {
  visible: boolean
  participantName: string | null
  discordParticipants: DiscordParticipant[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  // Emits the newly-created model plus the participant it was created for.
  'created': [model: any, participantName: string | null]
  'cancel': []
  'error': [message: string]
}>()

// Color palette for models - curated for variety and visual distinction
const MODEL_COLOR_PALETTE = [
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Green
  '#f59e0b', // Amber
  '#f97316', // Orange
  '#ef4444', // Red
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#84cc16', // Lime
  '#f43f5e', // Rose
  '#a855f7', // Violet
  '#0ea5e9', // Sky
  '#22c55e', // Emerald
  '#eab308'  // Yellow
]

function getRandomColor(): string {
  return MODEL_COLOR_PALETTE[Math.floor(Math.random() * MODEL_COLOR_PALETTE.length)]
}

function detectProvider(participantName: string): 'anthropic' | 'openai' | 'google' | 'meta' | 'other' {
  const nameLower = participantName.toLowerCase()

  // Anthropic heuristics
  if (nameLower.includes('claude') || nameLower.includes('opus') ||
      nameLower.includes('sonnet') || nameLower.includes('haiku')) {
    return 'anthropic'
  }

  // OpenAI heuristics
  if (nameLower.includes('gpt') || nameLower.includes('o3') ||
      nameLower.includes('4o') || nameLower.includes('chatgpt')) {
    return 'openai'
  }

  // Google heuristics
  if (nameLower.includes('gemini') || nameLower.includes('gem') ||
      nameLower.includes('bard') || nameLower.includes('palm')) {
    return 'google'
  }

  // Meta heuristics
  if (nameLower.includes('llama') || nameLower.includes('meta')) {
    return 'meta'
  }

  return 'other'
}

const newModel = ref({
  name: '',
  description: '',
  provider: 'other' as 'anthropic' | 'openai' | 'google' | 'meta' | 'other',
  model_id: '',
  avatar: '',
  color: '#8b5cf6' // Will be randomized on open
})

// Pre-populate the form whenever the modal opens, matching the original
// openCreateModelForParticipant behavior.
watch(() => props.visible, (visible) => {
  if (!visible) return

  if (props.participantName) {
    const participantName = props.participantName

    // Smart provider detection
    const detectedProvider = detectProvider(participantName)

    // Get participant info including avatar
    const participantInfo = props.discordParticipants.find(p => p.name === participantName)

    // Pre-populate with participant name, random color, and Discord avatar
    newModel.value = {
      name: participantName,
      description: '',
      provider: detectedProvider,
      model_id: participantName.toLowerCase().replace(/\s+/g, '-'),
      avatar: participantInfo?.avatar_url || '',
      color: getRandomColor()
    }
  } else {
    newModel.value = {
      name: '',
      description: '',
      provider: 'other',
      model_id: '',
      avatar: '',
      color: getRandomColor()
    }
  }
})

async function createNewModel() {
  if (!newModel.value.name || !newModel.value.provider || !newModel.value.model_id) {
    return
  }

  try {
    const response = await modelsAPI.create({
      name: newModel.value.name,
      description: newModel.value.description,
      provider: newModel.value.provider,
      model_id: newModel.value.model_id,
      avatar: newModel.value.avatar,
      color: newModel.value.color
    })

    const participantName = props.participantName

    // Reset form
    newModel.value = {
      name: '',
      description: '',
      provider: 'other',
      model_id: '',
      avatar: '',
      color: getRandomColor()
    }

    console.log('[Model] Created new model:', response.data)
    emit('created', response.data, participantName)
  } catch (err: any) {
    console.error('[Model] Failed to create model:', err)
    emit('error', 'Failed to create model: ' + (err.response?.data?.error || err.message))
  }
}
</script>
