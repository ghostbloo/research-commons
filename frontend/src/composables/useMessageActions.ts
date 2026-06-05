import { ref, type Ref } from 'vue'
import type { Message } from '@/types'
import { submissionsAPI } from '@/services/api'
import type { useAuthStore } from '@/stores/auth'
import type { useSubmissionsStore } from '@/stores/submissions'

type AuthStore = ReturnType<typeof useAuthStore>
type SubmissionsStore = ReturnType<typeof useSubmissionsStore>

/**
 * Message-level moderation/interaction actions: pin/unpin, hide/unhide,
 * hidden-from-models, monospace, reactions, plus the scroll-to-message and
 * scroll-to-pinned helpers.
 *
 * Owns `pinnedMessageId`, `hiddenMessageIds`, `messageReactions` and
 * `loadingPinnedMessage` (the view seeds these in `loadData`). `messages`,
 * `submission` and `headerHeight` are passed in as refs since the view owns them.
 */
export function useMessageActions(
  submissionId: string,
  authStore: AuthStore,
  submissionsStore: SubmissionsStore,
  messages: Ref<Message[]>,
  submission: Ref<any>,
  headerHeight: Ref<number>
) {
  const pinnedMessageId = ref<string | null>(null)
  const hiddenMessageIds = ref<Set<string>>(new Set())
  const messageReactions = ref<Map<string, Array<{ user_id: string; reaction_type: string }>>>(new Map())
  const loadingPinnedMessage = ref(false)

  async function handleTogglePin(messageId: string) {
    try {
      // If this message is already pinned, unpin it
      if (pinnedMessageId.value === messageId) {
        await submissionsAPI.unpinMessage(submissionId)
        pinnedMessageId.value = null
        console.log('Message unpinned')
      } else {
        // Pin this message
        await submissionsAPI.pinMessage(submissionId, messageId)
        pinnedMessageId.value = messageId
        console.log('Message pinned')
      }

      // Reload submission to get updated metadata
      submission.value = await submissionsStore.fetchSubmission(submissionId)
    } catch (err) {
      console.error('Failed to toggle pin:', err)
    }
  }

  async function handleToggleHide(messageId: string) {
    try {
      // If message is hidden, unhide it
      if (hiddenMessageIds.value.has(messageId)) {
        await submissionsAPI.unhideMessage(submissionId, messageId)
        hiddenMessageIds.value.delete(messageId)
      } else {
        // Hide this message
        await submissionsAPI.hideMessage(submissionId, messageId)
        hiddenMessageIds.value.add(messageId)
      }
    } catch (err) {
      console.error('Failed to toggle hide:', err)
    }
  }

  async function handleHideAllPrevious(messageId: string) {
    try {
      const response = await submissionsAPI.hideAllPrevious(submissionId, messageId)

      // Add all newly hidden message IDs to the set
      for (const hiddenId of response.data.message_ids) {
        hiddenMessageIds.value.add(hiddenId)
      }
    } catch (err) {
      console.error('Failed to hide all previous:', err)
    }
  }

  async function handleToggleHiddenFromModels(messageId: string) {
    try {
      const message = messages.value.find(m => m.id === messageId)
      if (!message) return

      const newValue = !message.hidden_from_models
      await submissionsAPI.setHiddenFromModels(submissionId, messageId, newValue)

      // Update local state
      message.hidden_from_models = newValue
    } catch (err) {
      console.error('Failed to toggle hidden from models:', err)
    }
  }

  async function handleToggleMonospace(messageId: string) {
    try {
      const message = messages.value.find(m => m.id === messageId)
      if (!message) return

      const currentValue = message.metadata?.monospace === true
      const newValue = !currentValue

      await submissionsAPI.setMessageMonospace(submissionId, messageId, newValue)

      // Update local state
      if (!message.metadata) {
        message.metadata = {}
      }
      message.metadata.monospace = newValue || undefined
    } catch (err) {
      console.error('Failed to toggle monospace:', err)
    }
  }

  // Generic scroll to message function
  function scrollToMessage(messageId: string, highlightColor: string = 'ring-indigo-400') {
    const messageEl = document.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement
    if (!messageEl) {
      console.warn('[Scroll] Message element not found:', messageId)
      return
    }

    // Calculate position accounting for fixed header
    const messageRect = messageEl.getBoundingClientRect()
    const scrollOffset = window.scrollY + messageRect.top - headerHeight.value - 20 // 20px extra padding

    // Smooth scroll to calculated position
    window.scrollTo({
      top: scrollOffset,
      behavior: 'smooth'
    })

    // Briefly highlight the message
    messageEl.classList.add('ring-2', highlightColor)
    setTimeout(() => {
      messageEl.classList.remove('ring-2', highlightColor)
    }, 1500)
  }

  function scrollToPinnedMessage() {
    if (!pinnedMessageId.value) {
      console.log('[Pinned] No pinned message ID')
      loadingPinnedMessage.value = false
      return
    }

    console.log('[Pinned] Looking for message:', pinnedMessageId.value)
    console.log('[Pinned] Total messages loaded:', messages.value.length)
    console.log('[Pinned] Message IDs:', messages.value.map(m => m.id))

    // Check if pinned message is in the loaded messages
    const pinnedMsg = messages.value.find(m => m.id === pinnedMessageId.value)
    if (!pinnedMsg) {
      console.error('[Pinned] Pinned message ID not found in loaded messages!')
      loadingPinnedMessage.value = false
      return
    }

    console.log('[Pinned] Found in messages array, now waiting for DOM element')

    // Wait for the pinned message element to exist in DOM (with timeout)
    // Longer timeout for slow connections and mobile
    const maxAttempts = 100 // 10 seconds max (100 * 100ms)
    let attempts = 0

    const checkAndScroll = () => {
      const messageEl = document.querySelector(`[data-message-id="${pinnedMessageId.value}"]`) as HTMLElement

      console.log(`[Pinned] Attempt ${attempts + 1}/${maxAttempts} - Element found:`, !!messageEl)

      if (messageEl) {
        console.log('[Pinned] Element found! Clearing overlay and scrolling')
        // Clear loading overlay immediately - we found the element!
        loadingPinnedMessage.value = false

        // Use the generic scroll function with amber highlight for pinned
        scrollToMessage(pinnedMessageId.value!, 'ring-amber-400')
      } else if (attempts < maxAttempts) {
        // Element not ready yet, try again
        attempts++
        setTimeout(checkAndScroll, 100)
      } else {
        // Timeout - element never appeared
        console.error('[Pinned] TIMEOUT! Element never appeared in DOM after', maxAttempts, 'attempts')
        console.error('[Pinned] All message elements:', document.querySelectorAll('[data-message-id]').length)
        loadingPinnedMessage.value = false
      }
    }

    checkAndScroll()
  }

  async function handleToggleReaction(messageId: string, reactionType: 'star' | 'laugh' | 'sparkles') {
    try {
      const currentUserId = authStore.user?.id
      if (!currentUserId) return

      const reactions = messageReactions.value.get(messageId) || []
      const hasReacted = reactions.some(r => r.user_id === currentUserId && r.reaction_type === reactionType)

      if (hasReacted) {
        // Remove reaction
        await submissionsAPI.removeReaction(submissionId, messageId, reactionType)
      } else {
        // Add reaction
        await submissionsAPI.addReaction(submissionId, messageId, reactionType)
      }

      // Reload reactions for this message
      const reactionResponse = await submissionsAPI.getReactions(submissionId, messageId)
      if (reactionResponse.data.reactions.length > 0) {
        messageReactions.value.set(messageId, reactionResponse.data.reactions)
      } else {
        messageReactions.value.delete(messageId)
      }
    } catch (err) {
      console.error('Failed to toggle reaction:', err)
    }
  }

  return {
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
  }
}
