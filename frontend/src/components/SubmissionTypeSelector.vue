<template>
  <div class="mb-8">
    <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">What are you submitting?</h2>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <!-- Conversation -->
      <button
        @click="$emit('update:modelValue', 'conversation')"
        class="relative p-4 rounded-xl border-2 transition-all text-left"
        :class="modelValue === 'conversation'
          ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/20'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'"
      >
        <div class="text-2xl mb-2">💬</div>
        <div class="font-medium text-gray-100">Conversation</div>
        <div class="text-xs text-gray-500 mt-1">Multi-turn dialogue, potentially containing multiple forks</div>
      </button>

      <!-- Completion -->
      <button
        @click="$emit('update:modelValue', 'completion')"
        class="relative p-4 rounded-xl border-2 transition-all text-left"
        :class="modelValue === 'completion'
          ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'"
      >
        <div class="text-2xl mb-2">📄</div>
        <div class="font-medium text-gray-100">Completion</div>
        <div class="text-xs text-gray-500 mt-1">Single text document that can be marked up to separate prefix from completion</div>
      </button>

      <!-- Loom (disabled) -->
      <button
        disabled
        class="relative p-4 rounded-xl border-2 transition-all text-left opacity-50 cursor-not-allowed border-gray-700 bg-gray-800/30"
      >
        <div class="text-2xl mb-2 grayscale">🌳</div>
        <div class="font-medium text-gray-400">Loom</div>
        <div class="text-xs text-gray-600 mt-1">A document containing multiple forks of LLM generations paths</div>
        <div class="absolute top-2 right-2 text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">Soon</div>
      </button>

      <!-- Other -->
      <button
        @click="$emit('update:modelValue', 'other')"
        class="relative p-4 rounded-xl border-2 transition-all text-left"
        :class="modelValue === 'other'
          ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/20'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'"
      >
        <div class="text-2xl mb-2">📦</div>
        <div class="font-medium text-gray-100">Other</div>
        <div class="text-xs text-gray-500 mt-1">Custom format</div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
type SubmissionCategory = 'conversation' | 'completion' | 'loom' | 'other'

interface Props {
  modelValue: SubmissionCategory
}

defineProps<Props>()

defineEmits<{
  'update:modelValue': [value: SubmissionCategory]
}>()
</script>
