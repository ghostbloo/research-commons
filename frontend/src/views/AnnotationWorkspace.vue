<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 transition-colors">
    <!-- Compact Header -->
    <div class="fixed top-0 left-0 right-0 bg-gray-900/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-700/50 dark:border-gray-800/50 z-30 transition-all" ref="headerEl">
      <div class="px-4 md:px-6 py-2 md:py-3">
        <!-- Mobile layout: stacked rows -->
        <div class="flex flex-col gap-1.5 md:hidden">
          <!-- Row 1: Back + Title -->
          <div class="flex items-center gap-2">
            <button 
              @click="router.push('/browse')" 
              class="text-gray-400 hover:text-white transition-colors text-sm shrink-0"
            >
              ←
            </button>
            <div v-if="!editingTitle" class="flex items-center gap-1 min-w-0 flex-1">
              <h1 
                class="text-base font-medium text-white truncate"
                :class="{ 'cursor-pointer': canEditSubmission }"
                @click="canEditSubmission && startEditTitle()"
              >
                {{ submission?.title || 'Loading...' }}
              </h1>
              <button
                v-if="canEditSubmission"
                @click.stop="startEditTitle"
                class="text-xs text-gray-500 shrink-0"
              >
                ✏️
              </button>
            </div>
            <div v-else class="flex-1 min-w-0">
              <input
                v-model="titleEdit"
                ref="titleInput"
                type="text"
                @keyup.enter="saveTitle"
                @keyup.esc="cancelEditTitle"
                @blur="saveTitle"
                class="w-full px-2 py-1 text-base bg-gray-800/50 border border-gray-600/50 text-white rounded"
                placeholder="Title..."
              />
            </div>
            <!-- Mobile actions -->
            <div class="flex items-center gap-1 shrink-0">
              <button
                v-if="authStore.isAuthenticated()"
                @click="showRatingForm = true"
                class="px-2 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] rounded"
              >
                Rate
              </button>
              <button
                v-if="authStore.isAuthenticated()"
                @click="openFolderPicker"
                class="px-2 py-1 bg-gray-700/50 border border-gray-600/30 text-gray-300 text-[10px] rounded hover:bg-gray-600/50"
                title="Manage folders"
              >
                📁<template v-if="submissionFolderCount > 0"> {{ submissionFolderCount }}</template>
              </button>
              <button
                v-if="canDeleteSubmission"
                @click="handleDeleteSubmission"
                class="p-1 text-gray-500 hover:text-red-400"
              >
                🗑️
              </button>
              <!-- More menu -->
              <div class="relative" v-if="canExport">
                <button
                  @click.stop="showMoreMenu = !showMoreMenu"
                  class="p-1 text-gray-400 hover:text-white"
                >
                  ⋮
                </button>
                <div
                  v-if="showMoreMenu"
                  class="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1"
                  @click.stop
                >
                  <div class="px-3 py-1.5 text-xs text-gray-500 uppercase tracking-wider">Export</div>
                  <button
                    @click="exportAsMarkdown"
                    class="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    📄 Markdown
                  </button>
                  <button
                    @click="exportAsStandardJson"
                    class="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    📋 Standard JSON
                  </button>
                  <button
                    @click="exportAsMultiuserJson"
                    class="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    👥 Multiuser JSON
                  </button>
                </div>
              </div>
            </div>
          </div>
          <!-- Row 2: Meta + Stats -->
          <div class="flex items-center gap-2 text-[10px] flex-wrap">
            <span class="text-gray-500">{{ submitterName }}</span>
            <span class="text-gray-600">•</span>
            <span class="text-gray-500">{{ formatDate(submission?.submitted_at) }}</span>
            <template v-if="displayTags.length > 0">
              <span class="text-gray-600">•</span>
              <button
                v-for="tag in displayTags.slice(0, 1)"
                :key="tag"
                @click="router.push(`/topics?tag=${tag}`)"
                class="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded"
              >
                #{{ tag }}
              </button>
              <span v-if="displayTags.length > 1" class="text-gray-500">+{{ displayTags.length - 1 }}</span>
            </template>
            <template v-if="totalCommentCount > 0">
              <span class="text-gray-600">•</span>
              <span class="text-blue-400">💬{{ totalCommentCount }}</span>
            </template>
          </div>
        </div>

        <!-- Desktop layout: single row -->
        <div class="hidden md:flex items-center gap-4">
          <!-- Back button -->
          <button 
            @click="router.push('/browse')" 
            class="text-gray-400 hover:text-white transition-colors text-sm opacity-70 hover:opacity-100"
          >
            ← Back
          </button>
          
          <!-- Title + metadata inline -->
          <div class="flex-1 flex items-baseline gap-3 min-w-0">
            <!-- Editable title -->
            <div v-if="!editingTitle" class="flex items-center gap-2 group min-w-0">
              <h1 
                class="text-lg font-medium text-white truncate"
                :class="{ 'cursor-pointer hover:text-indigo-300 transition-colors': canEditSubmission }"
                @click="canEditSubmission && startEditTitle()"
              >
              {{ submission?.title || 'Loading...' }}
            </h1>
              <button
                v-if="canEditSubmission"
                @click.stop="startEditTitle"
                class="text-xs text-gray-500 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                title="Edit title"
              >
                ✏️
              </button>
            </div>
            <!-- Title edit input -->
            <div v-else class="flex items-center gap-2 flex-1 min-w-0">
              <input
                v-model="titleEdit"
                ref="titleInput"
                type="text"
                @keyup.enter="saveTitle"
                @keyup.esc="cancelEditTitle"
                @blur="saveTitle"
                class="flex-1 px-2 py-1 text-lg font-medium bg-gray-800/50 border border-gray-600/50 text-white rounded focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 min-w-0"
                placeholder="Conversation title..."
              />
            </div>
            <span class="text-xs text-gray-400 opacity-60">by {{ submitterName }}</span>
            <span class="text-xs text-gray-500 opacity-50">•</span>
            <span class="text-xs text-gray-400 opacity-60">{{ formatDate(submission?.submitted_at) }}</span>
          </div>
          
          <!-- Topic tags inline -->
          <div class="flex gap-1.5" v-if="displayTags.length > 0">
            <button
              v-for="tag in displayTags"
              :key="tag"
              @click="router.push(`/topics?tag=${tag}`)"
              class="px-2 py-0.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 text-xs rounded transition-all"
            >
              #{{ tag }}
            </button>
          </div>
          
          <!-- Stats pills (clickable to see charts) -->
          <div 
            v-if="systemRatingAverages.length > 0 || tagStats.length > 0"
            class="flex items-center gap-2 cursor-pointer group"
            @click="showStatsDetail = true"
            title="Click to see detailed charts"
          >
            <!-- Per-system rating averages -->
            <div
              v-for="sysRating in systemRatingAverages"
              :key="sysRating.system_id"
              class="px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded-full font-mono flex items-center gap-1 group-hover:bg-amber-500/20 transition-colors"
            >
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span class="uppercase">{{ abbreviate(sysRating.system_name) }}</span>
              <span class="font-semibold">{{ sysRating.avg.toFixed(1) }}</span>
            </div>
            <div v-if="tagStats.length > 0" class="px-2 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs rounded-full font-mono flex items-center gap-1 group-hover:bg-purple-500/20 transition-colors">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
              </svg>
              {{ tagStats.length }}
            </div>
            <!-- Hint text -->
            <span class="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">click for charts</span>
          </div>
          <!-- Comment count (not part of stats modal) -->
            <div v-if="totalCommentCount > 0" class="px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs rounded-full font-mono flex items-center gap-1">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clip-rule="evenodd" />
              </svg>
              {{ totalCommentCount }}
          </div>
          
          <!-- Actions -->
          <button
            v-if="authStore.isAuthenticated()"
            @click="showRatingForm = true"
            class="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 text-xs rounded font-medium transition-all"
          >
            Rate
          </button>
          <router-link
            v-else
            to="/login"
            class="px-3 py-1.5 bg-gray-800/50 border border-gray-700/50 text-gray-400 text-xs rounded font-medium transition-all hover:text-gray-300 hover:border-gray-600/50"
          >
            Login to Rate
          </router-link>
          
          <button
            v-if="authStore.isAuthenticated()"
            @click="openFolderPicker"
            class="px-3 py-1.5 bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600/30 text-gray-300 text-xs rounded font-medium transition-all"
            title="Manage folders"
          >
            📁 Folder<template v-if="submissionFolderCount > 0"> ({{ submissionFolderCount }})</template>
          </button>
          <button
            v-if="canDeleteSubmission"
            @click="handleDeleteSubmission"
            class="px-2 py-1 text-red-400/70 hover:text-red-400 text-xs transition-colors"
          >
            🗑️
          </button>

          <!-- More menu (desktop) -->
          <div class="relative" v-if="canExport">
            <button
              @click.stop="showMoreMenu = !showMoreMenu"
              class="px-2 py-1 text-gray-400 hover:text-white text-sm transition-colors"
            >
              ⋮
            </button>
            <div
              v-if="showMoreMenu"
              class="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1"
              @click.stop
            >
              <div class="px-3 py-1.5 text-xs text-gray-500 uppercase tracking-wider">Export</div>
              <button
                @click="exportAsMarkdown"
                class="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                📄 Markdown
              </button>
              <button
                @click="exportAsStandardJson"
                class="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                📋 Standard JSON
              </button>
              <button
                @click="exportAsMultiuserJson"
                class="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                👥 Multiuser JSON
          </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Description row (expandable) -->
      <div class="px-6 py-2 border-t border-gray-700/30">
        <div v-if="!editingDescription" class="group">
          <div class="flex items-start gap-3">
            <span class="text-xs text-gray-500 uppercase tracking-wider pt-1">Context</span>
            <div 
              v-if="submission?.metadata.description"
              class="flex-1 text-sm text-gray-400 cursor-pointer hover:text-gray-300 transition-colors leading-relaxed"
              @click="canEditSubmission && startEditDescription()"
              v-html="renderMarkdown(submission.metadata.description)"
            ></div>
            <button
              v-else-if="canEditSubmission"
              @click="startEditDescription"
              class="flex-1 text-sm text-gray-500 hover:text-gray-400 italic text-left transition-colors"
            >
              + Add context...
            </button>
            <span v-else class="flex-1 text-sm text-gray-600 italic">No context provided</span>
            <button
              v-if="canEditSubmission && submission?.metadata.description"
              @click.stop="startEditDescription"
              class="text-xs text-gray-500 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✏️
            </button>
          </div>
        </div>
        <div v-else class="flex flex-col gap-2">
          <textarea
            v-model="descriptionEdit"
            ref="descriptionTextarea"
            @keyup.ctrl.enter="saveDescription"
            @keyup.meta.enter="saveDescription"
            @keyup.esc="cancelEditDescription"
            rows="3"
            class="w-full px-3 py-2 text-sm bg-gray-800/50 border border-gray-700/50 text-gray-300 rounded focus:ring-1 focus:ring-indigo-500/50 placeholder-gray-600 resize-y"
            placeholder="Describe the research context: methodology, interesting aspects, what to look for..."
          />
          <div class="flex justify-end gap-2">
            <button @click="cancelEditDescription" class="px-3 py-1 text-xs text-gray-500 hover:text-gray-400 transition-colors">Cancel</button>
            <button @click="saveDescription" class="px-3 py-1 text-xs bg-indigo-500/30 hover:bg-indigo-500/40 text-indigo-300 rounded transition-colors">Save</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading overlay for pinned message -->
    <div
      v-if="loadingPinnedMessage"
      class="fixed inset-0 z-40 flex items-center justify-center bg-gray-950/50 backdrop-blur-sm"
      :style="{ paddingTop: contentPaddingTop }"
    >
      <div class="flex flex-col items-center gap-3">
        <div class="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500/30 border-t-indigo-500"></div>
        <div class="text-sm text-gray-400">Loading pinned message...</div>
      </div>
    </div>

    <!-- Main Content (below fixed header - dynamic padding) -->
    <div :style="{ paddingTop: contentPaddingTop }" class="min-h-screen">
      <!-- Two-column layout for desktop, single column for mobile -->
      <div class="flex flex-col lg:flex-row">
        <!-- Conversation (full width mobile, 60% desktop) -->
        <div class="w-full lg:w-[60%] px-6 py-8 pb-20 lg:pb-8" ref="conversationContainerEl">
          <MessageList
            v-if="messages.length > 0"
            :messages="messages"
            :document-mode="isDocumentMode"
            :annotated-message-ids="annotatedMessageIds"
            :inline-comments="inlineComments"
            :user-names="userNames"
            :current-user-id="authStore.user?.id"
            :can-moderate="canHideMessages"
            :can-view-hidden="canViewHiddenMessages"
            :can-toggle-hidden-from-models="canToggleHiddenFromModels"
            :can-pin="canPin"
            :pinned-message-id="pinnedMessageId"
            :hidden-message-ids="hiddenMessageIds"
            :message-reactions="messageReactions"
            :participant-avatars="participantAvatars"
            :message-selections="messageSelections"
            @add-tag-to-message="handleAddTagToMessage"
            @add-comment-to-message="handleAddCommentToMessage"
            @copy-message="handleCopyMessage"
            @toggle-pin="handleTogglePin"
            @toggle-hide="handleToggleHide"
            @toggle-hidden-from-models="handleToggleHiddenFromModels"
            @toggle-monospace="handleToggleMonospace"
            @hide-all-previous="handleHideAllPrevious"
            @toggle-reaction="handleToggleReaction"
            @text-selected="handleTextSelected"
            @add-tag="handleAddTag"
            @add-tag-vote="handleAddTagVote"
            @add-comment="handleAddCommentToSelection"
            @delete-selection="handleDeleteSelection"
            @delete-comment="handleDeleteComment"
            @remove-tag="handleRemoveTag"
            @reply-to-comment="handleReplyToComment"
          />
          <div v-else class="p-8 text-center text-gray-500 dark:text-gray-400">
            <div v-if="loading">Loading conversation...</div>
            <div v-else>No messages found</div>
          </div>
        </div>

        <!-- Annotation Margin (desktop only - mobile uses inline comments) -->
        <div class="hidden lg:block lg:w-[40%] relative">
          <AnnotationMargin
            :annotations="marginAnnotations"
            :vertical-bars="verticalBars"
            :conversation-el="conversationContainerEl"
            :user-names="userNames"
            :current-user-id="authStore.user?.id"
            :can-moderate="canHideMessages"
            @add-tag-vote="handleAddTagVote"
            @delete-comment="handleDeleteComment"
            @edit-comment="handleEditComment"
            @remove-tag="handleRemoveTag"
            @reply-to-comment="handleReplyToComment"
            @expand-replies="handleExpandReplies"
            @expand-top-level="handleExpandTopLevel"
          />
        </div>
      </div>
    </div>

    <!-- Tag Picker Modal -->
    <TagPicker
      :show="showTagPicker"
      :ontologies-with-tags="ontologiesForPicker"
      :existing-tag-ids="activeSelectionId ? (selections.find(s => s.id === activeSelectionId)?.annotation_tags || []) : []"
      @apply="applyTags"
      @cancel="showTagPicker = false"
    />

    <!-- Topic Selector Modal -->
    <TopicSelector
      :show="showTopicSelector"
      :topics="availableTopics"
      :selected-topic-names="submission?.metadata.tags || []"
      @apply="applyTopics"
      @cancel="showTopicSelector = false"
    />

    <!-- Rating Form Modal -->
    <RatingForm
      :show="showRatingForm"
      :ranking-systems-with-criteria="rankingSystemsForPicker"
      :existing-ratings="currentUserRatings"
      :criterion-aggregates="criterionAggregates"
      @submit="submitRatings"
      @cancel="showRatingForm = false"
    />

    <!-- Comment Form Modal -->
    <CommentForm
      :show="showCommentForm"
      :selected-text="commentContext?.text"
      :is-reply="!!replyToCommentId"
      @submit="submitComment"
      @cancel="cancelCommentForm"
    />

    <!-- Stats Detail Modal -->
    <StatsDetailModal
      :show="showStatsDetail"
      :rating-stats="ratingStats"
      :tag-stats="tagStats"
      @close="showStatsDetail = false"
    />

    <!-- Folder Picker Modal -->
    <FolderPickerModal
      :show="showFolderPicker"
      :loading="folderPickerLoading"
      :current-folders="folderPickerCurrentFolders"
      :available-folders="folderPickerAvailable"
      :all-folders="folderPickerFolders"
      @close="showFolderPicker = false"
      @add-to-folder="addToFolder"
      @remove-from-folder="removeFromFolder"
    />

    <!-- Tag Popover (inline tag selection) -->
    <TagPopover
      :show="showTagPopover"
      :position="tagPopoverPosition"
      :ontologies="ontologiesForPicker"
      :existing-tag-ids="currentPopoverTagIds"
      @tag-toggled="handleTagToggled"
      @cancel="closeTagPopover"
    />

    <!-- Comment Input (inline comment form) -->
    <CommentInput
      :show="showCommentInput"
      :position="commentInputPosition"
      @submit="submitCommentToMessage"
      @cancel="showCommentInput = false"
    />

    <!-- Text Selection Context Menu -->
    <div
      v-if="showTextSelectionMenu && authStore.isAuthenticated()"
      class="text-selection-menu fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 transition-colors"
      :style="{ left: textSelectionMenuPosition.x + 'px', top: textSelectionMenuPosition.y + 'px' }"
      @click.stop
    >
      <button
        @click="handleHighlightSelection"
        class="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 transition-colors rounded-t-lg"
      >
        <svg class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 3.5l1.526 4.694h4.934l-3.993 2.902 1.526 4.694L10 12.888l-3.993 2.902 1.526-4.694L3.54 8.194h4.934L10 3.5z" />
        </svg>
        Highlight
      </button>
      <button
        @click="handleAddTagToSelection"
        class="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        Add Tag
      </button>
      <button
        @click="handleAddCommentToTextSelection"
        class="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-b-lg"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
        Add Comment
      </button>
    </div>

    <!-- Highlight Navigator -->
    <HighlightNavigator
      :messages="messages"
      :pinned-message-id="pinnedMessageId"
      :message-reactions="messageReactions"
      :messages-with-comments="messagesWithComments"
      :messages-with-tags="messagesWithTags"
      :header-height="headerHeight"
      @navigate-to="scrollToMessage"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSubmissionsStore } from '@/stores/submissions'
import MessageList from '@/components/MessageList.vue'
import AnnotationMargin from '@/components/AnnotationMargin.vue'
import CommentForm from '@/components/CommentForm.vue'
import TagPicker from '@/components/TagPicker.vue'
import HighlightNavigator from '@/components/HighlightNavigator.vue'
import TagPopover from '@/components/TagPopover.vue'
import CommentInput from '@/components/CommentInput.vue'
import TopicSelector from '@/components/TopicSelector.vue'
import RatingForm from '@/components/RatingForm.vue'
import StatsDetailModal from '@/components/StatsDetailModal.vue'
import FolderPickerModal from '@/components/FolderPickerModal.vue'
import type { Message, Selection, Comment } from '@/types'
import { ontologiesAPI, submissionsAPI, annotationsAPI, researchAPI, rankingsAPI, authAPI } from '@/services/api'
import { renderMarkdown } from '@/utils/markdown'
import { useExport } from '@/composables/useExport'
import { usePermissions } from '@/composables/usePermissions'
import { useSubmissionMetadata } from '@/composables/useSubmissionMetadata'
import { useFolderManager } from '@/composables/useFolderManager'
import { useSelectionState } from '@/composables/useSelectionState'
import { useRatingState } from '@/composables/useRatingState'
import { useMessageActions } from '@/composables/useMessageActions'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const submissionsStore = useSubmissionsStore()

const submissionId = route.params.id as string
const loading = ref(true)
const isMobile = ref(window.innerWidth < 1024)

const submission = ref()
const messages = ref<Message[]>([])

// Submission-scoped lookup maps (loaded in loadData, consumed by composables/computeds)
const attachedOntologies = ref<any[]>([])
const allOntologies = ref<Map<string, any>>(new Map())
const allTags = ref<Map<string, any>>(new Map())
const attachedRankingSystems = ref<any[]>([])
const allCriteria = ref<Map<string, any>>(new Map())
const rankingSystemDetails = ref<Map<string, any>>(new Map())
const submitterName = ref('User')
const userNames = ref<Map<string, string>>(new Map())

// Header measurement (used by scroll helpers + content padding)
const headerEl = ref<HTMLElement | null>(null)
const headerHeight = ref(0)

// Submission metadata inline editing (title / description / topics)
const {
  editingTitle,
  titleEdit,
  titleInput,
  editingDescription,
  descriptionEdit,
  descriptionTextarea,
  showTopicSelector,
  availableTopics,
  startEditTitle,
  saveTitle,
  cancelEditTitle,
  startEditDescription,
  saveDescription,
  cancelEditDescription,
  applyTopics
} = useSubmissionMetadata(submission, submissionId)

// Build participant avatars map from message metadata
const participantAvatars = computed(() => {
  const avatars = new Map<string, string>()
  for (const msg of messages.value) {
    if (msg.metadata?.avatar_url && typeof msg.metadata.avatar_url === 'string') {
      avatars.set(msg.participant_name, msg.metadata.avatar_url as string)
    }
  }
  console.log('[AnnotationWorkspace] Participant avatars map:', Array.from(avatars.entries()))
  return avatars
})

// Resolve tag IDs to names, filter out raw UUIDs that can't be resolved, deduplicate
const displayTags = computed(() => {
  const tags = submission.value?.metadata.tags || []
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  const resolved = tags
    .map(tag => {
      // If it's a UUID, try to find the topic name
      if (uuidPattern.test(tag)) {
        const topic = availableTopics.value.find(t => t.id === tag)
        return topic?.name || null // Return null if we can't resolve
      }
      // Otherwise return as-is (it's already a name)
      return tag
    })
    .filter((tag): tag is string => tag !== null) // Filter out unresolved UUIDs

  // Deduplicate (case-insensitive)
  const seen = new Set<string>()
  return resolved.filter(tag => {
    const lower = tag.toLowerCase()
    if (seen.has(lower)) return false
    seen.add(lower)
    return true
  })
})

// Permission computeds (owner / role based)
const {
  canEditSubmission,
  canDeleteSubmission,
  canExport,
  canHideMessages,
  canViewHiddenMessages,
  canToggleHiddenFromModels,
  canPin
} = usePermissions(authStore, submission)

// Document mode: single-message submissions displayed as readable documents
const isDocumentMode = computed(() => {
  return submission.value?.submission_type === 'document'
})

// Selection hub: selections + per-selection data cache + derived annotation computeds
const {
  selections,
  selectionData,
  messageSelections,
  annotatedMessageIds,
  totalCommentCount,
  messagesWithComments,
  messagesWithTags,
  inlineComments,
  tagStats,
  verticalBars,
  marginAnnotations,
  handleExpandReplies,
  handleExpandTopLevel,
  handleDeleteSelection,
  handleDeleteComment,
  handleEditComment
} = useSelectionState(messages, allTags)

// Submission-level ratings + aggregates
const {
  systemRatingAverages,
  ratingStats,
  currentUserRatings,
  criterionAggregates,
  loadRatings,
  submitRatings
} = useRatingState(submissionId, authStore, submissionsStore, allCriteria, rankingSystemDetails)

// Message-level actions (pin / hide / reactions / monospace / scroll)
const {
  pinnedMessageId,
  hiddenMessageIds,
  messageReactions,
  loadingPinnedMessage,
  handleTogglePin,
  handleToggleHide,
  handleHideAllPrevious,
  handleToggleHiddenFromModels,
  handleToggleMonospace,
  scrollToMessage,
  scrollToPinnedMessage,
  handleToggleReaction
} = useMessageActions(submissionId, authStore, submissionsStore, messages, submission, headerHeight)

// Folder picker (add/remove submission to folders)
const {
  showFolderPicker,
  folderPickerLoading,
  folderPickerFolders,
  submissionFolderCount,
  folderPickerCurrentFolders,
  folderPickerAvailable,
  loadSubmissionFolderCount,
  openFolderPicker,
  addToFolder,
  removeFromFolder
} = useFolderManager(submissionId, authStore)

const contentPaddingTop = computed(() => {
  const base = headerHeight.value + 20 // 20px extra spacing
  const toolbar = showSelectionToolbar.value ? 60 : 0
  return `${base + toolbar}px`
})


onMounted(async () => {
  window.addEventListener('resize', checkMobile)
  document.addEventListener('click', handleDocumentClick)
  await loadData()
  await loadSubmissionFolderCount()
  
  // Use ResizeObserver to track header height changes
  const updateHeaderHeight = () => {
    if (headerEl.value) {
      headerHeight.value = headerEl.value.offsetHeight
    }
  }
  
  // Initial measurement
  setTimeout(updateHeaderHeight, 100)
  
  // Watch for any changes that might affect header height
  watch([editingDescription], () => {
    setTimeout(updateHeaderHeight, 50)
  })
  
  // Use ResizeObserver for continuous tracking
  if (headerEl.value) {
    const resizeObserver = new ResizeObserver(() => {
      updateHeaderHeight()
    })
    resizeObserver.observe(headerEl.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  document.removeEventListener('click', handleDocumentClick)
})

function checkMobile() {
  isMobile.value = window.innerWidth < 1024
}

// Abbreviate ranking system names to first letters
function abbreviate(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
}

async function loadData() {
  loading.value = true
  try {
    // Load submission metadata FIRST (lightweight, fast) to check for pinned message
    submission.value = await submissionsStore.fetchSubmission(submissionId)
    
    // Check for pinned message and show overlay immediately
    pinnedMessageId.value = (submission.value.metadata as any)?.pinned_message_id || null
    if (pinnedMessageId.value) {
      loadingPinnedMessage.value = true
    }
    
    // Now load messages and other data in parallel
    const [messagesData, selectionsData, topicsData] = await Promise.all([
      submissionsStore.fetchMessages(submissionId),
      submissionsStore.fetchSelections(submissionId),
      researchAPI.getTopics()
    ])
    
    messages.value = messagesData
    selections.value = selectionsData
    availableTopics.value = topicsData.data.topics
    
    // Build user names map - collect all user IDs from all sources
    userNames.value.clear()
    const allUserIds = new Set<string>()
    
    // Add current user first
    if (authStore.user) {
      userNames.value.set(authStore.user.id, authStore.user.name)
      allUserIds.add(authStore.user.id)
    }
    
    // Add submission creator
    allUserIds.add(submission.value.submitter_id)
    
    // Add all selection creators
    selections.value.forEach(sel => allUserIds.add(sel.created_by))
    
    // Add all tag contributors (from tag_attributions)
    selections.value.forEach(sel => {
      if (sel.tag_attributions) {
        sel.tag_attributions.forEach(attr => allUserIds.add(attr.tagged_by))
      }
    })
    
    // We'll add comment authors after loading comments below
    
    // Add current user
    if (authStore.user) {
      allUserIds.add(authStore.user.id)
    }
    
    // Fetch all user names from API
    if (allUserIds.size > 0) {
      try {
        const response = await authAPI.getUserNames(Array.from(allUserIds))
        Object.entries(response.data.user_names).forEach(([userId, name]) => {
          userNames.value.set(userId, name)
        })
      } catch (err) {
        console.error('Failed to load user names:', err)
      }
    }
    
    // Set submitter name
    if (submission.value.submitter_id) {
      // If it's the current user, use their name
      if (authStore.user && submission.value.submitter_id === authStore.user.id) {
        submitterName.value = authStore.user.name
      } else {
        submitterName.value = userNames.value.get(submission.value.submitter_id) || 'Loading...'
        
        // If not in cache, fetch it
        if (!userNames.value.has(submission.value.submitter_id)) {
          try {
            const response = await authAPI.getUserNames([submission.value.submitter_id])
            Object.entries(response.data.user_names).forEach(([userId, name]) => {
              userNames.value.set(userId, name)
            })
            submitterName.value = userNames.value.get(submission.value.submitter_id) || 'Unknown User'
          } catch (err) {
            console.error('Failed to load submitter name:', err)
            submitterName.value = 'Unknown User'
          }
        }
      }
    }
    
    // Load ontologies and tags (combines topic-derived + explicit)
    const ontoResponse = await ontologiesAPI.getForSubmission(submissionId)
    attachedOntologies.value = ontoResponse.data.ontologies
    
    // Build ontology and tag maps
    allOntologies.value.clear()
    allTags.value.clear()
    for (const onto of attachedOntologies.value) {
      const ontoDetail = await ontologiesAPI.get(onto.ontology_id)
      // Store the actual ontology object, not the API response wrapper
      allOntologies.value.set(onto.ontology_id, ontoDetail.data.ontology)
      ontoDetail.data.tags.forEach((tag: any) => {
        allTags.value.set(tag.id, tag)
      })
    }
    
    // Load ranking systems and criteria (combines topic-derived + explicit)
    const rankingsResponse = await rankingsAPI.getForSubmission(submissionId)
    attachedRankingSystems.value = rankingsResponse.data.ranking_systems
    
    // Build criteria map and store system details
    allCriteria.value.clear()
    rankingSystemDetails.value.clear()
    for (const rankingSystem of attachedRankingSystems.value) {
      const systemDetail = await rankingsAPI.get(rankingSystem.ranking_system_id)
      rankingSystemDetails.value.set(rankingSystem.ranking_system_id, systemDetail)
      systemDetail.data.criteria.forEach((criterion: any) => {
        allCriteria.value.set(criterion.id, criterion)
      })
    }
    
    // Load comments and tags for each selection
    selectionData.value.clear()
    for (const sel of selections.value) {
      const comments = await submissionsStore.getCommentsBySelection(sel.id)
      
      // Add comment authors to user IDs set
      comments.forEach(c => allUserIds.add(c.author_id))
      
      // Use tag_attributions if available (new), fallback to annotation_tags (old)
      const tagIds = sel.tag_attributions 
        ? sel.tag_attributions.map(a => a.tag_id)
        : sel.annotation_tags
      const tags = tagIds.map(tagId => allTags.value.get(tagId)).filter(t => t)
      
      selectionData.value.set(sel.id, { comments, tags, tagAttributions: sel.tag_attributions || [] })
    }
    
    // Now fetch user names for comment authors too
    if (allUserIds.size > userNames.value.size) {
      try {
        const newUserIds = Array.from(allUserIds).filter(id => !userNames.value.has(id))
        if (newUserIds.length > 0) {
          const response = await authAPI.getUserNames(newUserIds)
          Object.entries(response.data.user_names).forEach(([userId, name]) => {
            userNames.value.set(userId, name)
          })
        }
      } catch (err) {
        console.error('Failed to load additional user names:', err)
      }
    }
    
    // Load submission-level ratings
    await loadRatings()

    // Load hidden messages (for researchers/admins/owners who can see individual badges)
    if (canViewHiddenMessages.value) {
      try {
        const hiddenResponse = await submissionsAPI.getHiddenMessages(submissionId)
        hiddenMessageIds.value = new Set(hiddenResponse.data.hidden_message_ids)
      } catch (err) {
        console.error('Failed to load hidden messages:', err)
      }
    } else {
      // For regular users, detect hidden messages from the _isHidden flag
      const hiddenIds = messages.value
        .filter(msg => (msg as any)._isHidden === true)
        .map(msg => msg.id)
      hiddenMessageIds.value = new Set(hiddenIds)
    }
    
    // Auto-scroll to pinned message FIRST (before loading reactions)
    // This prevents blocking the UI on slow connections
    if (pinnedMessageId.value) {
      nextTick(() => {
        scrollToPinnedMessage()
      })
    }
    
    // Load reactions for all messages in parallel (background, non-blocking)
    // Don't await - let them load after UI is ready
    messageReactions.value.clear()
    Promise.all(
      messages.value.map(msg => 
        submissionsAPI.getReactions(submissionId, msg.id)
          .then(response => {
            if (response.data.reactions.length > 0) {
              messageReactions.value.set(msg.id, response.data.reactions)
            }
          })
          .catch(err => {
            console.error('Failed to load reactions for message:', msg.id, err)
          })
      )
    ).then(() => {
      console.log('[Reactions] All reactions loaded')
    })
    
  } catch (err) {
    console.error('Failed to load submission:', err)
  } finally {
    loading.value = false
    
    // Safety: if we're still showing the pinned message overlay after data loads,
    // clear it (in case the pinned message doesn't exist)
    setTimeout(() => {
      if (loadingPinnedMessage.value) {
        console.warn('[Pinned] Safety timeout: clearing overlay after data load')
        loadingPinnedMessage.value = false
      }
    }, 2000)
  }
}

function handleAddTagToMessage(messageId: string) {
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement | null
  if (!messageEl) return

  const actionsBar = messageEl.querySelector('[data-message-actions]') as HTMLElement | null
  const fallbackRect = messageEl.getBoundingClientRect()
  let posX = fallbackRect.left
  let posY = fallbackRect.bottom + 6

  if (actionsBar) {
    const rect = actionsBar.getBoundingClientRect()
    posX = rect.left
    posY = rect.bottom + 4
  }

  const viewportWidth = window.innerWidth
  if (posX + TAG_POPOVER_WIDTH + 8 > viewportWidth) {
    posX = viewportWidth - TAG_POPOVER_WIDTH - 8
  }
  if (posX < 8) {
    posX = 8
  }

  tagPopoverPosition.value = { x: posX, y: posY }

  const existingSelection = selections.value.find(
    s =>
      s.start_message_id === messageId &&
      s.end_message_id === messageId &&
      s.start_offset == null &&
      s.end_offset == null
  )

  currentPopoverSelectionId.value = existingSelection?.id || null

  if (existingSelection?.id) {
    const currentUserId = authStore.user?.id
    const existingData = selectionData.value.get(existingSelection.id)
    
    // Only show tags that the current user has voted for
    if (currentUserId) {
      const myTagAttributions = (existingData?.tagAttributions || existingSelection.tag_attributions || [])
        .filter((attr: any) => attr.tagged_by === currentUserId)
      currentPopoverTagIds.value = myTagAttributions.map((attr: any) => attr.tag_id)
    } else {
      currentPopoverTagIds.value = []
    }
  } else {
    currentPopoverTagIds.value = []
  }

  activeMessageId.value = messageId
  showTagPopover.value = true
}

function closeTagPopover() {
  showTagPopover.value = false
  activeMessageId.value = null
  currentPopoverSelectionId.value = null
  currentPopoverTagIds.value = []
}

function handleAddCommentToMessage(messageId: string) {
  // Get message position to anchor input
  const messageEl = document.querySelector(`[data-message-id="${messageId}"]`)
  if (!messageEl) return
  
  const rect = messageEl.getBoundingClientRect()
  const isMobile = window.innerWidth < 1024 // lg breakpoint
  
  if (isMobile) {
    // On mobile, position below the message
    commentInputPosition.value = {
      x: rect.left + 32, // Indented like inline comments
      y: rect.bottom + 8
    }
  } else {
    // On desktop, position to the right
  commentInputPosition.value = {
    x: rect.right + 10,
    y: rect.top
    }
  }
  
  activeMessageId.value = messageId
  showCommentInput.value = true
}

function handleTextSelected(messageId: string, text: string, start: number, end: number) {
  // Store the selection data
  pendingTextSelection.value = { messageId, text, start, end }
  
  // Get cursor position from current selection
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return
  
  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()
  
  // Position menu near the end of selection, but keep it on screen
  const menuWidth = 160 // approximate menu width
  const menuHeight = 120 // approximate menu height
  const padding = 10
  
  let x = rect.right + padding
  let y = rect.top
  
  // Keep menu on screen horizontally
  if (x + menuWidth > window.innerWidth - padding) {
    x = rect.left - menuWidth - padding
    if (x < padding) {
      x = padding
    }
  }
  
  // Keep menu on screen vertically
  if (y + menuHeight > window.innerHeight - padding) {
    y = window.innerHeight - menuHeight - padding
  }
  if (y < padding) {
    y = padding
  }
  
  textSelectionMenuPosition.value = { x, y }
  
  showTextSelectionMenu.value = true
}

async function handleHighlightSelection() {
  if (!pendingTextSelection.value) return
  
  // Create a highlight-only selection (no tags, no comments)
  try {
    const selection = await submissionsStore.createSelection({
      submission_id: submissionId,
      start_message_id: pendingTextSelection.value.messageId,
      end_message_id: pendingTextSelection.value.messageId,
      start_offset: pendingTextSelection.value.start,
      end_offset: pendingTextSelection.value.end,
      label: pendingTextSelection.value.text.substring(0, 100),
      annotation_tags: []
    })
    
    selections.value.push(selection)
    selectionData.value.set(selection.id, { comments: [], tags: [], tagAttributions: [] })
    
    showTextSelectionMenu.value = false
    pendingTextSelection.value = null
    
    // Clear browser selection
    window.getSelection()?.removeAllRanges()
  } catch (err) {
    console.error('Failed to create highlight:', err)
  }
}

async function handleAddTagToSelection() {
  if (!pendingTextSelection.value) return
  
  // Create a selection for the text
  try {
    const selection = await submissionsStore.createSelection({
      submission_id: submissionId,
      start_message_id: pendingTextSelection.value.messageId,
      end_message_id: pendingTextSelection.value.messageId,
      start_offset: pendingTextSelection.value.start,
      end_offset: pendingTextSelection.value.end,
      label: pendingTextSelection.value.text.substring(0, 50),
      annotation_tags: []
    })
    
    selections.value.push(selection)
    selectionData.value.set(selection.id, { comments: [], tags: [], tagAttributions: [] })
    
    // Open tag picker for this new selection
    activeSelectionId.value = selection.id
    showTextSelectionMenu.value = false
    showTagPicker.value = true
    
    pendingTextSelection.value = null
  } catch (err) {
    console.error('Failed to create selection:', err)
  }
}

async function handleAddCommentToTextSelection() {
  if (!pendingTextSelection.value) return
  
  // Create a selection for the text
  try {
    const selection = await submissionsStore.createSelection({
      submission_id: submissionId,
      start_message_id: pendingTextSelection.value.messageId,
      end_message_id: pendingTextSelection.value.messageId,
      start_offset: pendingTextSelection.value.start,
      end_offset: pendingTextSelection.value.end,
      label: pendingTextSelection.value.text.substring(0, 50),
      annotation_tags: []
    })
    
    selections.value.push(selection)
    selectionData.value.set(selection.id, { comments: [], tags: [], tagAttributions: [] })
    
    // Open comment form for this new selection
    activeSelectionId.value = selection.id
    commentContext.value = {
      messageId: pendingTextSelection.value.messageId,
      text: pendingTextSelection.value.text,
      selectionId: selection.id
    }
    showTextSelectionMenu.value = false
    showCommentForm.value = true
    
    pendingTextSelection.value = null
  } catch (err) {
    console.error('Failed to create selection:', err)
  }
}

async function handleTagToggled(tagId: string, shouldSelect: boolean) {
  if (!activeMessageId.value) return
  const currentUserId = authStore.user?.id
  let previousTagIdsSnapshot: Set<string> | null = null
  let previousRecordSnapshot: { comments: Comment[]; tags: any[]; tagAttributions: Array<{ tag_id: string; tagged_by: string; tagged_at: Date }> } | null = null
  let targetSelectionId: string | null = null

  try {
    let selection: Selection | undefined

    if (currentPopoverSelectionId.value) {
      selection = selections.value.find(s => s.id === currentPopoverSelectionId.value)
    }

    if (!selection) {
      selection = await submissionsStore.createSelection({
        submission_id: submissionId,
        start_message_id: activeMessageId.value,
        end_message_id: activeMessageId.value,
        start_offset: undefined,
        end_offset: undefined,
        label: undefined,
        annotation_tags: []
      })

      selections.value.push(selection)
      selectionData.value.set(selection.id, { comments: [], tags: [], tagAttributions: [] })
      currentPopoverSelectionId.value = selection.id
    }

    targetSelectionId = selection.id

    previousTagIdsSnapshot = new Set(currentPopoverTagIds.value)
    const selectionRecord = selectionData.value.get(selection.id) || { comments: [], tags: [], tagAttributions: [] }
    previousRecordSnapshot = {
      comments: selectionRecord.comments ? [...selectionRecord.comments] : [],
      tags: selectionRecord.tags ? [...selectionRecord.tags] : [],
      tagAttributions: selectionRecord.tagAttributions ? [...selectionRecord.tagAttributions] : []
    }

    const tagSet = new Set(previousTagIdsSnapshot)

    if (shouldSelect) {
      tagSet.add(tagId)
    } else {
      const hasMyVote = previousRecordSnapshot.tagAttributions.some(a => a.tag_id === tagId && a.tagged_by === currentUserId)
      if (!hasMyVote) {
        console.warn('Cannot remove tag vote you do not own.')
        return
      }
      tagSet.delete(tagId)
    }

    currentPopoverTagIds.value = Array.from(tagSet)

    if (shouldSelect) {
      await ontologiesAPI.applyTags(selection.id, [tagId])
    } else {
      await annotationsAPI.removeTag(selection.id, tagId)
    }

    const response = await annotationsAPI.getSelections(submissionId)
    const updatedSelection = response.data.selections.find(s => s.id === selection!.id)

    let selTags: string[]
    let selAttributions: Array<{ tag_id: string; tagged_by: string; tagged_at: Date }>

    if (updatedSelection) {
      selTags = updatedSelection.annotation_tags || []
      selAttributions = (updatedSelection.tag_attributions || []).map(attr => ({
        tag_id: attr.tag_id,
        tagged_by: attr.tagged_by,
        tagged_at: new Date(attr.tagged_at)
      }))
    } else {
      selTags = Array.from(tagSet)
      const existingAttrs = previousRecordSnapshot.tagAttributions ? [...previousRecordSnapshot.tagAttributions] : []
      if (currentUserId) {
        if (shouldSelect) {
          existingAttrs.push({
            tag_id: tagId,
            tagged_by: currentUserId,
            tagged_at: new Date()
          })
        } else {
          const idx = existingAttrs.findIndex(a => a.tag_id === tagId && a.tagged_by === currentUserId)
          if (idx !== -1) {
            existingAttrs.splice(idx, 1)
          }
        }
      }
      selAttributions = existingAttrs
    }

    // Only show tags that the current user has voted for in the popover
    if (currentUserId) {
      const myTagIds = selAttributions
        .filter(attr => attr.tagged_by === currentUserId)
        .map(attr => attr.tag_id)
      currentPopoverTagIds.value = myTagIds
    } else {
      currentPopoverTagIds.value = []
    }

    const existing = selectionData.value.get(selection!.id) || { comments: [], tags: [], tagAttributions: [] }
    const tagObjs = selTags
      .map((id: string) => allTags.value.get(id))
      .filter((t: any) => t)

    selectionData.value.set(selection!.id, {
      comments: existing.comments || [],
      tags: tagObjs,
      tagAttributions: selAttributions
    })

    const selectionIndex = selections.value.findIndex(s => s.id === selection!.id)
    if (selectionIndex !== -1) {
      selections.value[selectionIndex] = {
        ...selections.value[selectionIndex],
        annotation_tags: selTags,
        tag_attributions: selAttributions
      }
    }
  } catch (err) {
    console.error('Failed to toggle tag:', err)
    if (targetSelectionId) {
      if (previousTagIdsSnapshot) {
        currentPopoverTagIds.value = Array.from(previousTagIdsSnapshot)
      }
      if (previousRecordSnapshot) {
        selectionData.value.set(targetSelectionId, {
          comments: previousRecordSnapshot.comments,
          tags: previousRecordSnapshot.tags,
          tagAttributions: previousRecordSnapshot.tagAttributions
        })
      }
    }
  }
}

function handleDocumentClick(event: MouseEvent) {
  const target = event.target as HTMLElement

  if (
    showTagPopover.value &&
    !target.closest('.tag-popover') &&
    !target.closest('[data-message-actions]')
  ) {
    closeTagPopover()
  }
  
  // Close text selection menu when clicking outside
  // But don't close if clicking inside message content (where text selection happens)
  if (
    showTextSelectionMenu.value &&
    !target.closest('.text-selection-menu') &&
    !target.closest('.message-text')
  ) {
    showTextSelectionMenu.value = false
    pendingTextSelection.value = null
  }
  
  // Close more menu when clicking outside
  if (showMoreMenu.value) {
    showMoreMenu.value = false
  }
}

async function submitCommentToMessage(text: string) {
  if (!activeMessageId.value) return
  
  // Create a selection for the message
  try {
    const selection = await submissionsStore.createSelection({
      submission_id: submissionId,
      start_message_id: activeMessageId.value,
      end_message_id: activeMessageId.value,
      start_offset: undefined,
      end_offset: undefined,
      label: undefined,
      annotation_tags: []
    })
    
    selections.value.push(selection)
    selectionData.value.set(selection.id, { comments: [], tags: [], tagAttributions: [] })
    
    // Add comment to the selection
    const commentResponse = await annotationsAPI.createComment({
      selection_id: selection.id,
      content: text
    })
    const comment = commentResponse.data
    const data = selectionData.value.get(selection.id)
    if (data) {
      data.comments.push(comment)
    }
    
    showCommentInput.value = false
    activeMessageId.value = null
  } catch (err) {
    console.error('Failed to submit comment:', err)
  }
}

const showCommentForm = ref(false)
const showTagPicker = ref(false)
const showRatingForm = ref(false)
const showStatsDetail = ref(false)
const showMoreMenu = ref(false)
const activeSelectionId = ref<string | null>(null)
const replyToCommentId = ref<string | null>(null)
const commentContext = ref<{ messageId: string; text?: string; selectionId?: string } | null>(null)
const conversationContainerEl = ref<HTMLElement | null>(null)
const showSelectionToolbar = ref(false)

// New inline popover state
const showTagPopover = ref(false)
const tagPopoverPosition = ref({ x: 0, y: 0 })
const activeMessageId = ref<string | null>(null)
const currentPopoverSelectionId = ref<string | null>(null)
const currentPopoverTagIds = ref<string[]>([])
const showCommentInput = ref(false)
const commentInputPosition = ref({ x: 0, y: 0 })
const showTextSelectionMenu = ref(false)
const textSelectionMenuPosition = ref({ x: 0, y: 0 })
const pendingTextSelection = ref<{ messageId: string; text: string; start: number; end: number } | null>(null)
const TAG_POPOVER_WIDTH = 224

// Markdown / JSON export + copy helpers
const {
  exportAsMarkdown,
  exportAsStandardJson,
  exportAsMultiuserJson,
  handleCopyMessage
} = useExport({ submission, messages, submitterName, displayTags, showMoreMenu })

// Ontologies for tag picker
const ontologiesForPicker = computed(() => {
  return attachedOntologies.value
    .map(subOnto => {
      const ontologyDetail = allOntologies.value.get(subOnto.ontology_id)
      if (!ontologyDetail) return null
      
      const tags = Array.from(allTags.value.values()).filter(t => t.ontology_id === subOnto.ontology_id)
      
      return {
        ontology: ontologyDetail,
        tags
      }
    })
    .filter((item): item is { ontology: any; tags: any[] } => item !== null)
})

// Ranking systems for rating picker
const rankingSystemsForPicker = computed(() => {
  return attachedRankingSystems.value.map(subRanking => {
    const systemDetail = rankingSystemDetails.value.get(subRanking.ranking_system_id)
    const criteria = Array.from(allCriteria.value.values()).filter(c => c.ranking_system_id === subRanking.ranking_system_id)
    return {
      system: systemDetail?.data.ranking_system || { name: 'Ranking System', id: subRanking.ranking_system_id },
      criteria,
      isFromTopic: subRanking.source === 'topic'  // From dynamic lookup
    }
  })
})

// Build inline annotations for mobile (grouped by message)
// Removed inlineAnnotations - now using margin annotations on all screen sizes

// Annotations are now created directly, no form needed

function cancelCommentForm() {
  showCommentForm.value = false
  commentContext.value = null
  activeSelectionId.value = null
  replyToCommentId.value = null
}

async function submitComment(text: string) {
  try {
    let targetSelectionId: string
    
    // If activeSelectionId is set (from unified card), use it
    if (activeSelectionId.value) {
      targetSelectionId = activeSelectionId.value
    } else if (commentContext.value) {
      // Otherwise auto-create selection for message
      const selection = await submissionsStore.createSelection({
        submission_id: submissionId,
        start_message_id: commentContext.value.messageId,
        end_message_id: commentContext.value.messageId,
        start_offset: undefined,
        end_offset: undefined,
        label: undefined,
        annotation_tags: []
      })
      
      targetSelectionId = selection.id
      selections.value.push(selection)
      selectionData.value.set(selection.id, { comments: [], tags: [], tagAttributions: [] })
    } else {
      showCommentForm.value = false
      return
    }
    
    // Create comment (with parent_id if this is a reply)
    const commentData: { selection_id: string; content: string; parent_id?: string } = {
      selection_id: targetSelectionId,
      content: text
    }
    
    if (replyToCommentId.value) {
      commentData.parent_id = replyToCommentId.value
    }
    
    const comment = await submissionsStore.createComment(commentData)
    
    // Update just this selection's comments
    const data = selectionData.value.get(targetSelectionId)
    if (data) {
      data.comments.push(comment)
    }
    
    showCommentForm.value = false
    commentContext.value = null
    activeSelectionId.value = null
    replyToCommentId.value = null
  } catch (err) {
    console.error('Failed to create comment:', err)
    showCommentForm.value = false
    commentContext.value = null
    activeSelectionId.value = null
    replyToCommentId.value = null
  }
}


function handleAddTag(selectionId: string) {
  activeSelectionId.value = selectionId
  showTagPicker.value = true
}

async function handleAddTagVote(selectionId: string, tagId: string) {
  try {
    // Add vote by applying just this one tag (will add to existing)
    await ontologiesAPI.applyTags(selectionId, [tagId])
    
    // Refresh selection to get updated attributions
    const updatedSelections = await annotationsAPI.getSelections(submissionId)
    const updatedSel = updatedSelections.data.selections.find(s => s.id === selectionId)
    
    if (updatedSel) {
      // Update selection in main list
      const idx = selections.value.findIndex(s => s.id === selectionId)
      if (idx !== -1) {
        selections.value[idx] = updatedSel
      }
      
      // Update selection data
      const data = selectionData.value.get(selectionId)
      if (data) {
        const tagIds = updatedSel.tag_attributions 
          ? updatedSel.tag_attributions.map(a => a.tag_id)
          : updatedSel.annotation_tags
        data.tags = tagIds.map(tagId => allTags.value.get(tagId)).filter(t => t) as any[]
      }
      
      // Update user names for any new contributors
      if (updatedSel.tag_attributions) {
        // Ensure current user's name is in the map
        if (authStore.user && !userNames.value.has(authStore.user.id)) {
          userNames.value.set(authStore.user.id, authStore.user.name)
        }
        
        const newUserIds = updatedSel.tag_attributions
          .map(a => a.tagged_by)
          .filter(id => !userNames.value.has(id))
        
        if (newUserIds.length > 0) {
          try {
            const response = await authAPI.getUserNames(newUserIds)
            Object.entries(response.data.user_names).forEach(([userId, name]) => {
              userNames.value.set(userId, name)
            })
          } catch (err) {
            console.error('Failed to load user names:', err)
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to add tag vote:', err)
  }
}

function handleAddCommentToSelection(selectionId: string) {
  activeSelectionId.value = selectionId
  showCommentForm.value = true
}

function handleReplyToComment(selectionId: string, parentCommentId: string) {
  // Open comment form for reply
  activeSelectionId.value = selectionId
  replyToCommentId.value = parentCommentId
  
  // Find the parent comment to show context
  const data = selectionData.value.get(selectionId)
  const parentComment = data?.comments.find(c => c.id === parentCommentId)
  
  commentContext.value = {
    messageId: '',
    text: parentComment?.content ? `Replying to: "${parentComment.content.substring(0, 100)}..."` : undefined,
    selectionId
  }
  showCommentForm.value = true
}

async function handleRemoveTag(selectionId: string, tagId: string) {
  try {
    await annotationsAPI.removeTag(selectionId, tagId)
    
    // Refresh selection to get updated vote counts
    const updatedSelections = await annotationsAPI.getSelections(submissionId)
    const updatedSel = updatedSelections.data.selections.find(s => s.id === selectionId)
    
    if (updatedSel) {
      // Update selection in main list
      const idx = selections.value.findIndex(s => s.id === selectionId)
      if (idx !== -1) {
        selections.value[idx] = updatedSel
      }
      
      // Update selection data using tag_attributions
      const data = selectionData.value.get(selectionId)
      if (data) {
        const tagIds = updatedSel.tag_attributions 
          ? updatedSel.tag_attributions.map(a => a.tag_id)
          : updatedSel.annotation_tags
        // Get unique tag IDs for display
        const uniqueTagIds = [...new Set(tagIds)]
        data.tags = uniqueTagIds.map(tagId => allTags.value.get(tagId)).filter(t => t) as any[]
      }
    }
  } catch (err) {
    console.error('Failed to remove tag:', err)
  }
}


async function handleDeleteSubmission() {
  const confirmed = confirm(
    'Delete this submission?\n\n' +
    'This will mark it as deleted and remove it from browse listings. ' +
    'The data will be preserved for archival purposes.\n\n' +
    'This action cannot be undone.'
  )
  
  if (!confirmed) return
  
  try {
    await submissionsAPI.delete(submissionId)
    // Navigate back to browse
    router.push('/browse')
  } catch (err: any) {
    console.error('Failed to delete submission:', err)
    alert('Failed to delete submission: ' + (err.response?.data?.error || err.message))
  }
}

async function applyTags(tagIds: string[]) {
  if (!activeSelectionId.value) return
  
  try {
    await ontologiesAPI.applyTags(activeSelectionId.value, tagIds)
    
    // Refresh the selection to get updated tag attributions from server
    const updatedSelections = await annotationsAPI.getSelections(submissionId)
    const updatedSel = updatedSelections.data.selections.find(s => s.id === activeSelectionId.value)
    
    if (updatedSel) {
      // Update selection in main list
      const idx = selections.value.findIndex(s => s.id === activeSelectionId.value)
      if (idx !== -1) {
        selections.value[idx] = updatedSel
      }
      
      // Update selection data using tag_attributions
      const data = selectionData.value.get(activeSelectionId.value!)
      if (data) {
        const tagIds = updatedSel.tag_attributions 
          ? updatedSel.tag_attributions.map(a => a.tag_id)
          : updatedSel.annotation_tags
        data.tags = tagIds.map(tagId => allTags.value.get(tagId)).filter(t => t) as any[]
      }
    }
    
    showTagPicker.value = false
    activeSelectionId.value = null
  } catch (err) {
    console.error('Failed to apply tags:', err)
    showTagPicker.value = false
    activeSelectionId.value = null
  }
}

function formatDate(date?: string) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString()
}
</script>


