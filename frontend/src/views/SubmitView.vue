<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <LeftSidebar :show="showMobileSidebar" @navigate="handleNavigate" @close="showMobileSidebar = false" />

    <!-- Mobile hamburger -->
    <button
      v-if="isMobile"
      @click="showMobileSidebar = true"
      class="fixed top-4 left-4 z-30 p-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 lg:hidden"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
    </button>

    <div class="lg:ml-64">
      <header class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 transition-colors">
        <h1 class="text-xl font-bold text-gray-900 dark:text-gray-100">✨ New Submission</h1>
      </header>

      <div class="max-w-4xl mx-auto p-8">
      <div class="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 p-6 transition-colors">

        <!-- Step 1: Upload -->
        <div v-if="step === 'upload'">
          <!-- Submission Type Selector -->
          <SubmissionTypeSelector v-model="submissionCategory" />

          <!-- Source Type (for conversation category) -->
          <div v-if="submissionCategory === 'conversation'" class="mb-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Import Source
            </label>
            <select
              v-model="sourceType"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <option value="json-upload">JSON Upload</option>
              <option value="arc-certified">ARC Certified</option>
              <option value="discord">Discord</option>
            </select>
          </div>

          <!-- Source Type (for other category) -->
          <div v-if="submissionCategory === 'other'" class="mb-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Format
            </label>
            <select
              v-model="sourceType"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <option value="json-upload">JSON Upload</option>
              <option value="other">Other Format</option>
            </select>
          </div>

          <!-- Discord Import -->
          <div v-if="submissionCategory === 'conversation' && sourceType === 'discord'" class="space-y-4 mb-6">
            <div class="p-3 bg-blue-900/20 border border-blue-700/50 rounded text-sm text-blue-200">
              <svg class="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
              <strong>Discord Bridge Required:</strong> This feature only works with Discord servers that have the export bridge bot installed.
              Imports are authenticated server-side and message history is fetched securely.
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Last Message URL <span class="text-red-400">*</span>
              </label>
              <div class="relative">
                <input
                  v-model="discordLastMessageUrl"
                  @blur="validateDiscordUrl"
                  @change="discordUrlValidated = false; discordUrlError = ''"
                  type="text"
                  placeholder="https://discord.com/channels/GUILD_ID/CHANNEL_ID/MESSAGE_ID"
                  :class="{
                    'border-red-500 focus:ring-red-500': discordLastMessageUrl && (discordUrlError || !isValidDiscordUrl(discordLastMessageUrl)),
                    'border-green-500 focus:ring-green-500': discordUrlValidated && !discordUrlError,
                    'border-gray-700 focus:ring-indigo-500': !discordLastMessageUrl || (!discordUrlError && !discordUrlValidated)
                  }"
                  class="w-full px-3 py-2 rounded bg-gray-800 text-gray-100 placeholder-gray-500 focus:ring-2 focus:border-transparent pr-10"
                />
                <!-- Loading spinner while validating -->
                <div v-if="discordUrlValidating" class="absolute right-3 top-1/2 -translate-y-1/2">
                  <div class="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                </div>
                <!-- Success checkmark -->
                <div v-else-if="discordUrlValidated && !discordUrlError" class="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
              <p v-if="discordUrlError" class="mt-1 text-xs text-red-400">
                {{ discordUrlError }}
              </p>
              <p v-else-if="discordUrlValidated" class="mt-1 text-xs text-green-400">
                ✓ URL validated - ready to browse messages
              </p>
              <p v-else-if="discordLastMessageUrl && !isValidDiscordUrl(discordLastMessageUrl)" class="mt-1 text-xs text-red-400">
                Invalid Discord message URL format
              </p>
              <p v-else class="mt-1 text-xs text-gray-500">The ending message URL (most recent)</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                First Message URL <span class="text-gray-500">(optional)</span>
              </label>
              <div class="flex gap-2">
                <input
                  v-model="discordFirstMessageUrl"
                  type="text"
                  placeholder="https://discord.com/channels/GUILD_ID/CHANNEL_ID/MESSAGE_ID"
                  class="flex-1 px-3 py-2 border border-gray-700 rounded bg-gray-800 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  @click="openMessageSelector"
                  :disabled="!discordUrlValidated || discordUrlValidating || !!discordUrlError"
                  class="px-3 py-2 border border-indigo-500/50 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  :title="discordUrlValidated ? 'Browse messages to select starting point' : 'Validate URL first (blur input or press Tab)'"
                >
                  Browse
                </button>
              </div>
              <p class="mt-1 text-xs text-gray-500">The starting message URL (oldest) - or click Browse to select</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Max Messages
              </label>
              <input
                v-model.number="discordMaxMessages"
                type="number"
                min="1"
                placeholder="50"
                class="w-full px-3 py-2 border border-gray-700 rounded bg-gray-800 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p class="mt-1 text-xs text-gray-500">Maximum number of messages to import (default: 50)</p>
            </div>
          </div>

          <!-- JSON Upload (for conversation and other categories) -->
          <div v-if="(submissionCategory === 'conversation' || submissionCategory === 'other') && (sourceType === 'json-upload' || sourceType === 'arc-certified' || sourceType === 'other')" class="mb-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload JSON File
            </label>

            <!-- Supported formats info -->
            <div class="mb-3 p-3 bg-purple-900/20 border border-purple-700/50 rounded text-sm text-purple-200">
              <svg class="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
              <strong>Supported formats:</strong> ARC conversation exports or Anthropic API format. For Claude.ai, use the
              <a
                href="https://github.com/socketteer/Claude-Conversation-Exporter"
                target="_blank"
                rel="noopener noreferrer"
                class="underline hover:text-purple-100 transition-colors"
              >
                Claude Conversation Exporter</a> Chrome extension.
            </div>

            <div class="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center bg-gray-50 dark:bg-gray-800 transition-colors hover:border-indigo-400 dark:hover:border-indigo-600">
              <input
                type="file"
                accept=".json,.txt"
                @change="handleFileUpload"
                class="hidden"
                ref="fileInput"
              />
              <button
                type="button"
                @click="($refs.fileInput as any)?.click()"
                class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                📁 Choose JSON File
              </button>
              <p v-if="uploadedFile" class="mt-3 text-sm text-gray-900 dark:text-gray-100 font-medium">
                ✓ {{ uploadedFile.name }}
              </p>
              <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                ARC exports or Anthropic API message format
              </p>
            </div>
          </div>

          <!-- Completion/Document Upload -->
          <div v-if="submissionCategory === 'completion'" class="mb-6">
            <div class="mb-3 p-3 bg-emerald-900/20 border border-emerald-700/50 rounded text-sm text-emerald-200">
              <svg class="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
              </svg>
              <strong>Completion:</strong> Submit a model output, essay, or any text for annotation. Supports Markdown.
              You can add highlights, comments, and tags to sections of the text.
            </div>

            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title
            </label>
            <input
              v-model="documentTitle"
              type="text"
              placeholder="e.g., Claude on consciousness..."
              class="w-full px-3 py-2 mb-4 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 transition-colors"
            />

            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content <span class="font-normal text-gray-500">(Markdown supported)</span>
            </label>
            <textarea
              v-model="documentContent"
              placeholder="Paste the model output or text here...

Supports Markdown formatting:
# Headings
**bold**, *italic*
- Lists
- Code blocks"
              rows="16"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 transition-colors font-mono text-sm"
            ></textarea>
            <p class="mt-1 text-xs text-gray-500">{{ documentContent.length.toLocaleString() }} characters</p>

            <!-- Or upload file -->
            <div class="mt-4 text-center text-gray-500 text-sm">— or —</div>
            <div class="mt-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center bg-gray-50 dark:bg-gray-800 transition-colors hover:border-indigo-400 dark:hover:border-indigo-600">
              <input
                type="file"
                accept=".md,.txt,.markdown"
                @change="handleDocumentFileUpload"
                class="hidden"
                ref="docFileInput"
              />
              <button
                type="button"
                @click="($refs.docFileInput as any)?.click()"
                class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors text-sm"
              >
                📄 Upload .md or .txt file
              </button>
            </div>

            <!-- Display options -->
            <div class="mt-6 pt-4 border-t border-gray-700/50">
              <label class="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  v-model="useMonospace"
                  class="w-4 h-4 rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-900"
                />
                <div>
                  <span class="text-sm text-gray-300 group-hover:text-gray-100">Display in monospace font</span>
                  <p class="text-xs text-gray-500">Enable for ASCII art, formatted tables, or code-heavy content</p>
                </div>
              </label>
            </div>
          </div>

          <div v-if="error" class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm transition-colors">
            {{ error }}
          </div>

          <div class="flex justify-end">
            <button
              v-if="submissionCategory === 'conversation' && sourceType === 'discord'"
              @click="fetchDiscordMessages"
              :disabled="!discordLastMessageUrl || submitting"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ submitting ? 'Fetching...' : 'Fetch Messages →' }}
            </button>
            <button
              v-else-if="submissionCategory === 'completion'"
              @click="prepareDocument"
              :disabled="!documentContent || !documentTitle"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue →
            </button>
            <button
              v-else
              @click="parseJSON"
              :disabled="!uploadedFile"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Parse & Continue →
            </button>
          </div>
        </div>

        <!-- Step 2: Configure -->
        <div v-if="step === 'configure'">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Configure Submission</h2>
            <button
              @click="resetToUpload"
              class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              ← Back to Upload
            </button>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </label>
            <input
              v-model="title"
              type="text"
              placeholder="e.g., Claude on Non-duality"
              required
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              v-model="description"
              rows="3"
              placeholder="What makes this conversation interesting or noteworthy?"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 transition-colors"
            />
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Research Topics
            </label>
            <div class="space-y-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded p-3 bg-gray-50 dark:bg-gray-800 transition-colors">
              <label
                v-for="topic in availableTopics"
                :key="topic.id"
                class="flex items-start gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded transition-colors"
              >
                <input
                  type="checkbox"
                  :value="topic.name"
                  v-model="selectedTopics"
                  class="w-4 h-4 mt-0.5"
                />
                <div class="flex-1">
                  <div class="text-sm text-gray-900 dark:text-gray-100">{{ topic.name }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">{{ topic.description }}</div>
                </div>
              </label>
              <div v-if="availableTopics.length === 0" class="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                No topics available
              </div>
            </div>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Visibility
            </label>
            <select
              v-model="visibility"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <option value="researcher">🔬 Researchers Only — visible to verified researchers</option>
              <option value="public">🌐 Public — visible to everyone</option>
              <option value="unlisted">🔗 Unlisted — accessible via direct link only</option>
              <option value="private">🔒 Private — only you and admins</option>
            </select>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span v-if="visibility === 'researcher'">
                Recommended for sensitive conversations. You can make it public later.
              </span>
              <span v-else-if="visibility === 'public'">
                Anyone can find and view this conversation.
              </span>
              <span v-else-if="visibility === 'unlisted'">
                Won't appear in browse listings, but anyone with the link can view it.
              </span>
              <span v-else-if="visibility === 'private'">
                Only you and platform admins can see this conversation.
              </span>
            </p>
          </div>

          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Identify Participants
              <span class="text-xs text-gray-500 dark:text-gray-400 font-normal ml-2">
                (Map each participant to a model or mark as human)
              </span>
            </label>
            <ParticipantMapper
              :participant-names="participantNames"
              v-model:participant-mapping="participantMapping"
              :available-models="availableModels"
              :discord-participants="discordParticipantsWithIds"
              :can-create-model="!!(authStore.user?.roles.includes('admin') || authStore.user?.roles.includes('researcher'))"
              @update-avatar="updateModelAvatar"
              @create-model="openCreateModelForParticipant"
            />
          </div>

          <!-- Create Model Modal -->
          <ModelCreationModal
            :visible="showCreateModel"
            :participant-name="creatingModelForParticipant"
            :discord-participants="discordParticipantsWithIds"
            @created="onModelCreated"
            @cancel="cancelCreateModel"
            @error="(msg) => error = msg"
          />

          <!-- Discord Fetch Statistics -->
          <div v-if="fetchStats && sourceType === 'discord'" class="mb-6 p-4 rounded border transition-colors"
            :class="{
              'bg-green-900/20 border-green-700/50': fetchStats.firstMessageReached,
              'bg-amber-900/20 border-amber-700/50': !fetchStats.firstMessageReached
            }">
            <div class="flex items-center gap-3 mb-2">
              <div class="text-lg font-semibold" :class="fetchStats.firstMessageReached ? 'text-green-300' : 'text-amber-300'">
                {{ fetchStats.messageCount }} messages fetched
              </div>
              <div v-if="fetchStats.firstMessageReached" class="flex items-center gap-1 text-sm text-green-400">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                {{ fetchStats.requestedFirstUrl ? 'First message reached' : 'Complete fetch' }}
              </div>
              <div v-else class="flex items-center gap-1 text-sm text-amber-400">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                {{ fetchStats.requestedFirstUrl ? 'First message NOT reached' : 'Truncated (more messages exist)' }}
              </div>
            </div>
            <div class="text-xs text-gray-400">
              <span v-if="fetchStats.requestedFirstUrl">
                Requested range: first message URL was {{ fetchStats.firstMessageReached ? 'found' : 'not reached (may need more messages)' }}
              </span>
              <span v-else-if="fetchStats.truncated">
                Only the most recent {{ fetchStats.messageCount }} messages were fetched. Set a "First Message URL" or increase "Max Messages" to get more.
              </span>
              <span v-else>
                All available messages in range were fetched.
              </span>
            </div>
          </div>

          <div v-if="previewMessages.length > 0" class="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            <div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              📝 Preview: {{ previewMessages.length }} messages
            </div>
            <div class="space-y-2 text-xs text-gray-400">
              <!-- Head: First 3 messages -->
              <div class="text-[10px] uppercase tracking-wide text-gray-500 mb-1">← First (oldest)</div>
              <div v-for="(msg, idx) in previewMessages.slice(0, 3)" :key="'head-' + idx" class="flex items-start gap-2">
                <div class="shrink-0">
                  <img
                    v-if="msg.metadata?.avatar_url"
                    :src="msg.metadata.avatar_url"
                    class="w-6 h-6 rounded-full"
                    :alt="msg.participant_name"
                  />
                  <div v-else-if="participantMapping[msg.participant_name] && participantMapping[msg.participant_name] !== 'human'" class="text-lg">
                    {{ getModelAvatar(participantMapping[msg.participant_name]) && !getModelAvatar(participantMapping[msg.participant_name]).startsWith('http') ? getModelAvatar(participantMapping[msg.participant_name]) : '🤖' }}
                  </div>
                  <span v-else>👤</span>
                </div>
                <span class="flex-1 min-w-0">
                  <span class="font-medium text-gray-100">{{ msg.participant_name }}</span>:
                  {{ truncate(getMessageText(msg), 50) }}
                </span>
              </div>

              <!-- Middle indicator -->
              <div v-if="previewMessages.length > 6" class="text-center text-gray-500 py-2 border-y border-gray-700/50 my-2">
                ⋮ {{ previewMessages.length - 6 }} messages ⋮
              </div>

              <!-- Tail: Last 3 messages -->
              <div v-if="previewMessages.length > 3" class="text-[10px] uppercase tracking-wide text-gray-500 mb-1 mt-3">Last (newest) →</div>
              <div v-for="(msg, idx) in previewMessages.slice(-3)" :key="'tail-' + idx" class="flex items-start gap-2"
                   v-show="previewMessages.length > 3 && !previewMessages.slice(0, 3).includes(msg)">
                <div class="shrink-0">
                  <img
                    v-if="msg.metadata?.avatar_url"
                    :src="msg.metadata.avatar_url"
                    class="w-6 h-6 rounded-full"
                    :alt="msg.participant_name"
                  />
                  <div v-else-if="participantMapping[msg.participant_name] && participantMapping[msg.participant_name] !== 'human'" class="text-lg">
                    {{ getModelAvatar(participantMapping[msg.participant_name]) && !getModelAvatar(participantMapping[msg.participant_name]).startsWith('http') ? getModelAvatar(participantMapping[msg.participant_name]) : '🤖' }}
                  </div>
                  <span v-else>👤</span>
                </div>
                <span class="flex-1 min-w-0">
                  <span class="font-medium text-gray-100">{{ msg.participant_name }}</span>:
                  {{ truncate(getMessageText(msg), 50) }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="error" class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm transition-colors">
            {{ error }}
          </div>

          <div class="flex gap-3">
            <button
              @click="resetToUpload"
              class="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              @click="submit"
              :disabled="!title || !allParticipantsMapped || submitting"
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ submitting ? 'Uploading...' : 'Upload Conversation' }}
            </button>
          </div>
        </div>

      </div>
      </div>
    </div>

    <!-- Message Selector Modal (outside step sections) -->
    <DiscordMessageSelector
      :visible="showMessageSelector"
      :messages="selectorPreviewMessages"
      :loading="loadingPreview"
      :can-load-earlier="canLoadEarlier"
      @select="selectFirstMessage"
      @load-earlier="loadEarlierMessages"
      @close="showMessageSelector = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { submissionsAPI, researchAPI, modelsAPI, importsAPI } from '@/services/api'
import type { Message } from '@/types'
import LeftSidebar from '@/components/LeftSidebar.vue'
import SubmissionTypeSelector from '@/components/SubmissionTypeSelector.vue'
import ParticipantMapper from '@/components/ParticipantMapper.vue'
import ModelCreationModal from '@/components/ModelCreationModal.vue'
import DiscordMessageSelector from '@/components/DiscordMessageSelector.vue'
import { useDiscordImport } from '@/composables/useDiscordImport'
import { parseConversationJSON } from '@/utils/conversationParsers'

const router = useRouter()
const authStore = useAuthStore()

const fileInput = ref<HTMLInputElement>()

const showMobileSidebar = ref(false)
const isMobile = ref(window.innerWidth < 1024)

const title = ref('')
const description = ref('')
const submissionCategory = ref<'conversation' | 'completion' | 'loom' | 'other'>('conversation')
const sourceType = ref<'json-upload' | 'arc-certified' | 'discord' | 'other'>('json-upload')

// Document/Completion upload state
const documentTitle = ref('')
const documentContent = ref('')
const useMonospace = ref(false) // Display content in monospace font
const visibility = ref<'public' | 'unlisted' | 'researcher' | 'private'>('researcher')
const selectedTopics = ref<string[]>([])
const availableTopics = ref<any[]>([])
const availableModels = ref<any[]>([])
const uploadedFile = ref<File | null>(null)
const previewMessages = ref<Message[]>([])
const participantNames = ref<string[]>([])
const participantMapping = ref<Record<string, string>>({}) // participantName -> modelId or 'human'
const error = ref('')
const submitting = ref(false)
const step = ref<'upload' | 'configure'>('upload')

// Model creation modal
const showCreateModel = ref(false)
const creatingModelForParticipant = ref<string | null>(null)

// Discord import cluster (URL validation, message selector, fetch + auto-mapping)
const {
  discordLastMessageUrl,
  discordFirstMessageUrl,
  discordMaxMessages,
  discordUrlValidated,
  discordUrlValidating,
  discordUrlError,
  discordParticipantsWithIds,
  fetchStats,
  showMessageSelector,
  selectorPreviewMessages,
  loadingPreview,
  canLoadEarlier,
  isValidDiscordUrl,
  validateDiscordUrl,
  openMessageSelector,
  loadEarlierMessages,
  selectFirstMessage,
  fetchDiscordMessages
} = useDiscordImport({
  availableModels,
  previewMessages,
  participantNames,
  participantMapping,
  title,
  error,
  submitting,
  step,
  isAuthenticated: () => authStore.isAuthenticated(),
  onUnauthenticated: () => router.push('/login')
})

onMounted(async () => {
  window.addEventListener('resize', checkMobile)
  await Promise.all([
    loadTopics(),
    loadModels()
  ])
})

function checkMobile() {
  isMobile.value = window.innerWidth < 1024
}

function handleNavigate(route: string) {
  router.push(route)
}

async function loadTopics() {
  try {
    const response = await researchAPI.getTopics()
    availableTopics.value = response.data.topics

    // Auto-select first topic if none selected
    if (selectedTopics.value.length === 0 && response.data.topics.length > 0) {
      selectedTopics.value = [response.data.topics[0].id]
      console.log('[Submit] Auto-selected default topic:', response.data.topics[0].name)
    }
  } catch (err) {
    console.error('Failed to load topics:', err)
  }
}

async function loadModels() {
  try {
    const response = await modelsAPI.list()
    availableModels.value = response.data.models
  } catch (err) {
    console.error('Failed to load models:', err)
  }
}

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploadedFile.value = file
  error.value = ''
}

async function handleDocumentFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    documentContent.value = text
    // Use filename (without extension) as title if not set
    if (!documentTitle.value) {
      documentTitle.value = file.name.replace(/\.(md|txt|markdown)$/i, '')
    }
    error.value = ''
  } catch (err) {
    error.value = 'Failed to read file'
    console.error('Document file read error:', err)
  }
}

// Prepare a document for submission - creates a single-message submission
function prepareDocument() {
  if (!documentContent.value || !documentTitle.value) {
    error.value = 'Please provide a title and content'
    return
  }

  error.value = ''
  title.value = documentTitle.value

  // Create a single message for the document
  const documentMessage: Message = {
    id: crypto.randomUUID(),
    submission_id: '', // Will be filled by server
    parent_message_id: null,
    order: 0,
    participant_name: 'Document',
    participant_type: 'system',
    content_blocks: [{
      type: 'text',
      text: documentContent.value
    }],
    metadata: useMonospace.value ? { monospace: true } : undefined
  }

  previewMessages.value = [documentMessage]
  participantNames.value = ['Document']
  // Auto-map Document as system (skips the mapping step)
  participantMapping.value = { 'Document': 'human' } // Treat as human to skip model selection

  // Skip straight to configure step
  step.value = 'configure'
}

function resetToUpload() {
  step.value = 'upload'
  title.value = ''
  description.value = ''
  visibility.value = 'researcher'
  selectedTopics.value = []
  participantMapping.value = {}
  previewMessages.value = []
  participantNames.value = []
  error.value = ''
  fetchStats.value = null
}

const allParticipantsMapped = computed(() => {
  return participantNames.value.every(name => participantMapping.value[name])
})

function getModelAvatar(modelId: string): string {
  const model = availableModels.value.find(m => m.id === modelId)
  return model?.avatar || '🤖'
}

async function updateModelAvatar(participantName: string, modelId: string) {
  const participant = discordParticipantsWithIds.value.find(p => p.name === participantName)
  if (!participant?.avatar_url) {
    console.error('[Model] No avatar URL for participant:', participantName)
    return
  }

  const model = availableModels.value.find(m => m.id === modelId)
  if (!model) {
    console.error('[Model] Model not found:', modelId)
    return
  }

  try {
    // Update the model's avatar - send full model data
    await modelsAPI.update(modelId, {
      name: model.name,
      description: model.description,
      provider: model.provider,
      model_id: model.model_id,
      avatar: participant.avatar_url,
      color: model.color
    })

    // Update in local models list
    const modelIndex = availableModels.value.findIndex(m => m.id === modelId)
    if (modelIndex !== -1) {
      availableModels.value[modelIndex].avatar = participant.avatar_url
    }

    console.log('[Model] Updated avatar for model:', modelId, 'from Discord user:', participantName)
  } catch (err: any) {
    console.error('[Model] Failed to update avatar:', err)
    error.value = 'Failed to update model avatar: ' + (err.response?.data?.error || err.message)
  }
}

function openCreateModelForParticipant(participantName: string) {
  creatingModelForParticipant.value = participantName
  showCreateModel.value = true
}

function cancelCreateModel() {
  showCreateModel.value = false
  creatingModelForParticipant.value = null
}

function onModelCreated(model: any, participantName: string | null) {
  // Add to available models
  availableModels.value.push(model)

  // Auto-map to the participant we're creating this for
  if (participantName) {
    participantMapping.value[participantName] = model.id
  }

  creatingModelForParticipant.value = null
  showCreateModel.value = false
}

async function parseJSON() {
  if (!uploadedFile.value) {
    error.value = 'Please select a file first'
    return
  }

  error.value = ''
  previewMessages.value = []

  try {
    const text = await uploadedFile.value.text()
    const result = parseConversationJSON(text, availableModels.value)

    // Set title from conversation metadata (ARC), preserving any existing title
    if (result.detectedTitle && !title.value) {
      title.value = result.detectedTitle
    }

    previewMessages.value = result.messages
    participantNames.value = result.participantNames

    // Auto-detect source type based on conversation format
    if (result.isArcFormat && sourceType.value === 'json-upload') {
      sourceType.value = 'arc-certified'
    }

    participantMapping.value = result.autoMapping

    step.value = 'configure'
  } catch (err: any) {
    error.value = err.message
    console.error('[Submit] Parse error:', err)
  }
}

async function submit() {
  if (!authStore.isAuthenticated()) {
    router.push('/login')
    return
  }

  if (!title.value) {
    error.value = 'Title is required'
    return
  }

  // Check all participants are mapped
  const unmapped = participantNames.value.filter(name => !participantMapping.value[name])
  if (unmapped.length > 0) {
    error.value = `Please identify all participants: ${unmapped.join(', ')}`
    return
  }

  submitting.value = true
  error.value = ''

  try {
    // Update messages with correct participant types and model info
    const updatedMessages = previewMessages.value.map(msg => {
      const mapping = participantMapping.value[msg.participant_name]
      const isHuman = mapping === 'human'
      const modelData = isHuman ? null : availableModels.value.find(m => m.id === mapping)

      return {
        ...msg,
        participant_type: isHuman ? 'human' : 'model',
        model_info: modelData ? {
          model_id: modelData.model_id,
          provider: modelData.provider,
          reasoning_enabled: false
        } : undefined
      }
    })

    // Map submissionCategory to submission_type
    const submissionTypeMap: Record<string, 'conversation' | 'document' | 'loom'> = {
      'conversation': 'conversation',
      'completion': 'document',
      'loom': 'loom',
      'other': 'conversation'
    }

    const response = await submissionsAPI.create({
      title: title.value,
      submission_type: submissionTypeMap[submissionCategory.value] || 'conversation',
      source_type: submissionCategory.value === 'completion' ? 'other' : sourceType.value,
      visibility: visibility.value,
      messages: updatedMessages,
      metadata: {
        tags: selectedTopics.value,
        description: description.value || undefined
      }
    })

    // Save participant mappings if this was a Discord import
    if (sourceType.value === 'discord' && discordParticipantsWithIds.value.length > 0) {
      try {
        const mappingsToSave = discordParticipantsWithIds.value.map(participant => {
          const mapping = participantMapping.value[participant.name]
          return {
            source_user_id: participant.discord_user_id,
            source_username: participant.username,
            source_display_name: participant.display_name,
            avatar_url: participant.avatar_url,
            model_id: mapping === 'human' ? undefined : mapping,
            is_human: mapping === 'human'
          }
        }).filter(m => m.model_id || m.is_human) // Only save if mapped

        if (mappingsToSave.length > 0) {
          await importsAPI.saveMappings('discord', mappingsToSave)
          console.log('[Discord Import] Saved', mappingsToSave.length, 'participant mappings')
        }
      } catch (err) {
        console.error('[Discord Import] Failed to save mappings:', err)
        // Don't block submission on mapping save failure
      }
    }

    // Navigate to the new submission
    router.push(`/submissions/${response.data.id}`)
  } catch (err: any) {
    error.value = err.response?.data?.error || 'Failed to submit'
    console.error('Submit error:', err)
  } finally {
    submitting.value = false
  }
}

function getMessageText(msg: Message): string {
  const textBlock = msg.content_blocks.find(b => b.type === 'text')
  return textBlock?.text || ''
}

function truncate(text: string, length: number) {
  return text.length > length ? text.substring(0, length) + '...' : text
}
</script>
