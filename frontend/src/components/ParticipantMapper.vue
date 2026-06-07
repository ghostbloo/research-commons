<template>
  <div class="space-y-2">
    <div
      v-for="name in participantNames"
      :key="name"
      class="p-3 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 transition-colors"
    >
      <div class="flex items-center gap-2 mb-2">
        <!-- Avatar -->
        <img
          v-if="getParticipantAvatar(name)"
          :src="getParticipantAvatar(name)"
          class="w-8 h-8 rounded-full border border-gray-600"
          :alt="name"
        />
        <div v-else class="w-8 h-8 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center text-sm font-medium text-gray-300">
          {{ name.charAt(0).toUpperCase() }}
        </div>

        <!-- Names -->
        <div class="flex-1 min-w-0">
          <div class="font-medium text-sm text-gray-100">
            {{ getParticipantDisplayName(name) }}
          </div>
          <div class="text-xs text-gray-400">
            @{{ getParticipantUsername(name) }}
          </div>
        </div>
      </div>
      <div class="flex gap-2">
        <div class="flex-1 flex gap-2">
          <select
            :value="participantMapping[name] || ''"
            @change="updateMapping(name, ($event.target as HTMLSelectElement).value)"
            class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 text-sm transition-colors"
          >
            <option value="">-- Select Type --</option>
            <option value="human">👤 Human</option>
            <optgroup label="AI Models" class="text-gray-900 dark:text-gray-100">
              <option
                v-for="model in availableModels"
                :key="model.id"
                :value="model.id"
              >
                {{ model.avatar && !model.avatar.startsWith('http') ? model.avatar + ' ' : '' }}{{ model.name }}
              </option>
            </optgroup>
          </select>
          <button
            v-if="participantMapping[name] && participantMapping[name] !== 'human' && getParticipantAvatar(name)"
            @click="$emit('update-avatar', name, participantMapping[name])"
            class="px-3 py-2 border border-purple-500/50 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded text-xs transition-all flex items-center gap-1 shrink-0"
            title="Update model avatar from Discord"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Update Avatar
          </button>
        </div>
        <button
          v-if="canCreateModel"
          @click="$emit('create-model', name)"
          class="px-3 py-2 border border-indigo-500/50 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded text-xs transition-all flex items-center gap-1 shrink-0"
          title="Create new model for this participant"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DiscordParticipant } from '@/composables/useDiscordImport'

interface Props {
  participantNames: string[]
  participantMapping: Record<string, string> // participantName -> modelId or 'human'
  availableModels: any[]
  discordParticipants: DiscordParticipant[]
  canCreateModel: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:participantMapping': [mapping: Record<string, string>]
  'update-avatar': [participantName: string, modelId: string]
  'create-model': [participantName: string]
}>()

function updateMapping(name: string, value: string) {
  emit('update:participantMapping', { ...props.participantMapping, [name]: value })
}

function getParticipantAvatar(participantName: string): string | undefined {
  const participant = props.discordParticipants.find(p => p.name === participantName)
  return participant?.avatar_url
}

function getParticipantUsername(participantName: string): string {
  const participant = props.discordParticipants.find(p => p.name === participantName)
  return participant?.username || participantName
}

function getParticipantDisplayName(participantName: string): string {
  const participant = props.discordParticipants.find(p => p.name === participantName)
  return participant?.display_name || participantName
}
</script>
