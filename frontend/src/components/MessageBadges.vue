<template>
  <!-- Hidden badge (for researchers/admins) - not shown in document mode -->
  <div v-if="isHidden && !documentMode" class="absolute -top-2 -left-2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
    Hidden
  </div>

  <!-- Hidden from models badge - not shown in document mode -->
  <div v-if="isHiddenFromModels && !isHidden && !documentMode" class="absolute -top-2 -left-2 bg-amber-600/80 text-white text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1" title="This message is excluded from AI model context">
    <span class="text-[9px]">🫥</span>
    Hidden from models
  </div>
</template>

<script setup lang="ts">
interface Props {
  isHidden?: boolean
  isHiddenFromModels?: boolean
  documentMode?: boolean
}

withDefaults(defineProps<Props>(), {
  isHidden: false,
  isHiddenFromModels: false,
  documentMode: false,
})
</script>
