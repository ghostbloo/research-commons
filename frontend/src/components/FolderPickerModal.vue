<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
    @click.self="$emit('close')"
  >
    <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-sm w-full border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Folders</h3>
      </div>

      <div v-if="loading" class="px-5 py-8 text-center text-sm text-gray-500">Loading...</div>

      <template v-else>
        <!-- Current folders -->
        <div v-if="currentFolders.length > 0">
          <div class="px-5 pt-3 pb-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">In folders</div>
          <div class="max-h-32 overflow-y-auto">
            <div
              v-for="folder in currentFolders"
              :key="folder.id"
              class="px-5 py-2.5 flex items-center gap-3 group"
            >
              <svg class="w-4 h-4 text-indigo-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
              </svg>
              <router-link
                :to="`/folders/${folder.id}`"
                @click="$emit('close')"
                class="flex-1 min-w-0 text-sm text-gray-900 dark:text-gray-100 hover:text-indigo-500 dark:hover:text-indigo-400 truncate transition-colors"
              >
                {{ folder.name }}
              </router-link>
              <button
                @click="$emit('remove-from-folder', folder.id)"
                class="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-red-400 transition-all shrink-0"
                title="Remove from folder"
              >
                &times;
              </button>
            </div>
          </div>
        </div>

        <!-- Available folders to add -->
        <div v-if="availableFolders.length > 0">
          <div class="px-5 pt-3 pb-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-t border-gray-100 dark:border-gray-800">Add to folder</div>
          <div class="max-h-32 overflow-y-auto">
            <button
              v-for="folder in availableFolders"
              :key="folder.id"
              @click="$emit('add-to-folder', folder.id)"
              class="w-full px-5 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3"
            >
              <svg class="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span class="text-sm text-gray-600 dark:text-gray-400 truncate">{{ folder.name }}</span>
            </button>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="allFolders.length === 0" class="px-5 py-8 text-center text-sm text-gray-500">
          No folders yet.
          <router-link to="/folders" @click="$emit('close')" class="text-indigo-500 hover:underline block mt-2">Create one</router-link>
        </div>
      </template>

      <div class="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
        <button
          @click="$emit('close')"
          class="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Folder } from '@/services/api'

interface Props {
  show: boolean
  loading: boolean
  currentFolders: Folder[]
  availableFolders: Folder[]
  allFolders: Folder[]
}

defineProps<Props>()

defineEmits<{
  'close': []
  'add-to-folder': [folderId: string]
  'remove-from-folder': [folderId: string]
}>()
</script>
