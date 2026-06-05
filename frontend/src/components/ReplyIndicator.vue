<template>
  <!-- Reply indicator (shown above header if this is a reply) -->
  <div v-if="username && !documentMode" class="flex items-center gap-1.5 mb-1 text-xs text-gray-500">
    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
    <span>Replying to</span>
    <span class="text-indigo-400 font-medium">@{{ username }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  /** Username being replied to; when empty/undefined the indicator is hidden. */
  username?: string
  documentMode?: boolean
}

withDefaults(defineProps<Props>(), {
  username: '',
  documentMode: false,
})
</script>
