// Discord-import cluster extracted from SubmitView.vue.
//
// Owns all Discord-specific reactive state (URL inputs, validation flags,
// fetch statistics, the message-selector modal pagination, and the detected
// participants) and the functions that drive it. The composable mutates a set
// of SHARED refs (preview messages, participant names/mapping, title, error,
// submitting, step) that are also read by the view and its sibling components,
// so those are passed in by the caller rather than owned here.
//
// Per-instance: call useDiscordImport(...) once per SubmitView instance. It is
// not a singleton and holds no module-level state.

import { ref, type Ref } from 'vue'
import { importsAPI, discordPreviewAPI } from '@/services/api'
import type { Message } from '@/types'

/** A Discord participant resolved from a fetched conversation. */
export interface DiscordParticipant {
  name: string
  discord_user_id: string
  username: string
  display_name: string
  is_bot: boolean
  avatar_url?: string
}

/** Statistics describing the result of a Discord message fetch. */
export interface DiscordFetchStats {
  messageCount: number
  truncated: boolean
  firstMessageReached: boolean
  requestedFirstUrl: string | undefined
}

/** Shared refs the composable reads from / writes to, owned by the caller. */
interface UseDiscordImportShared {
  availableModels: Ref<any[]>
  previewMessages: Ref<Message[]>
  participantNames: Ref<string[]>
  participantMapping: Ref<Record<string, string>>
  title: Ref<string>
  error: Ref<string>
  submitting: Ref<boolean>
  step: Ref<'upload' | 'configure'>
  /** Guard mirroring the view's authStore.isAuthenticated(); redirects on false. */
  isAuthenticated: () => boolean
  onUnauthenticated: () => void
}

export function useDiscordImport(shared: UseDiscordImportShared) {
  const {
    availableModels,
    previewMessages,
    participantNames,
    participantMapping,
    title,
    error,
    submitting,
    step,
    isAuthenticated,
    onUnauthenticated
  } = shared

  // Discord import fields
  const discordLastMessageUrl = ref('')
  const discordFirstMessageUrl = ref('')
  const discordMaxMessages = ref<number>(50)
  const discordUrlValidated = ref(false) // Track if URL has been validated
  const discordUrlValidating = ref(false) // Track validation in progress
  const discordUrlError = ref('') // Track validation error
  const discordParticipantsWithIds = ref<DiscordParticipant[]>([])

  // Fetch statistics
  const fetchStats = ref<DiscordFetchStats | null>(null)

  // Message selector modal
  const showMessageSelector = ref(false)
  const selectorPreviewMessages = ref<any[]>([])
  const loadingPreview = ref(false)
  const canLoadEarlier = ref(false)
  const oldestMessageUrl = ref('')

  function isValidDiscordUrl(url: string): boolean {
    // Discord message URL format: https://discord.com/channels/GUILD_ID/CHANNEL_ID/MESSAGE_ID
    const pattern = /^https:\/\/discord\.com\/channels\/\d+\/\d+\/\d+$/
    return pattern.test(url)
  }

  function extractMessageId(url: string): string | null {
    const match = url.match(/\/channels\/\d+\/\d+\/(\d+)$/)
    return match ? match[1] : null
  }

  async function validateDiscordUrl() {
    if (!discordLastMessageUrl.value) {
      discordUrlValidated.value = false
      discordUrlError.value = ''
      return
    }

    // Check format first
    if (!isValidDiscordUrl(discordLastMessageUrl.value)) {
      discordUrlValidated.value = false
      discordUrlError.value = 'Invalid URL format'
      return
    }

    // Test with actual API call (fetch 1 message)
    discordUrlValidating.value = true
    discordUrlError.value = ''

    try {
      console.log('[Discord Validation] Testing URL:', discordLastMessageUrl.value)
      const response = await discordPreviewAPI.fetchMessages(discordLastMessageUrl.value, undefined, 1)

      // Check if we actually got messages back
      if (!response.data.messages || response.data.messages.length === 0) {
        discordUrlValidated.value = false
        discordUrlError.value = 'No messages found - Message ID may not exist in this channel'
        console.log('[Discord Validation] URL valid but no messages returned')
        return
      }

      // Success!
      discordUrlValidated.value = true
      discordUrlError.value = ''
      console.log('[Discord Validation] URL is valid and accessible')
    } catch (err: any) {
      console.error('[Discord Validation] Failed:', err)
      discordUrlValidated.value = false

      // Provide specific error messages
      if (err.response?.status === 403 || err.response?.status === 401) {
        discordUrlError.value = 'Permission denied - Bridge bot may not have access to this channel'
      } else if (err.response?.status === 404) {
        discordUrlError.value = 'Message not found - URL may be invalid or message deleted'
      } else if (err.response?.status === 400) {
        discordUrlError.value = 'Invalid request - Please check the URL'
      } else if (err.message?.includes('timeout') || err.message?.includes('timed out')) {
        discordUrlError.value = 'Request timed out - Bridge service may be unavailable'
      } else if (err.message?.includes('Network Error')) {
        discordUrlError.value = 'Network error - Check your connection'
      } else {
        discordUrlError.value = 'Unable to access this URL - Please verify it is correct'
      }
    } finally {
      discordUrlValidating.value = false
    }
  }

  // Message selector functions
  async function openMessageSelector() {
    if (!discordLastMessageUrl.value) return

    showMessageSelector.value = true
    selectorPreviewMessages.value = []
    oldestMessageUrl.value = discordLastMessageUrl.value

    await loadSelectorMessages(discordLastMessageUrl.value)
  }

  async function loadSelectorMessages(fromUrl: string, appendToExisting: boolean = false) {
    loadingPreview.value = true

    try {
      // When loading earlier: fromUrl is the oldest message, we want to fetch 50 messages before it
      // Don't pass firstParam - let the API work backwards from fromUrl
      console.log('[Message Selector] Fetching from:', fromUrl, 'append:', appendToExisting)

      const response = await discordPreviewAPI.fetchMessages(fromUrl, undefined, 50)

      console.log('[Message Selector] Got messages:', response.data.messages.length)

      // Sort messages by timestamp (oldest first, like a chat)
      const sorted = response.data.messages.sort((a: any, b: any) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )

      if (appendToExisting) {
        // Prepend older messages to the beginning of the list
        selectorPreviewMessages.value = [...sorted, ...selectorPreviewMessages.value]
      } else {
        // Initial load - replace list
        selectorPreviewMessages.value = sorted
      }

      canLoadEarlier.value = response.data.has_more

      // Update oldest message URL (first item after sorting = oldest)
      if (selectorPreviewMessages.value.length > 0) {
        oldestMessageUrl.value = selectorPreviewMessages.value[0].message_url
      }

      console.log('[Message Selector] Total messages now:', selectorPreviewMessages.value.length)
    } catch (err: any) {
      console.error('[Message Selector] Failed to load messages:', err)
      error.value = 'Failed to load message preview'
    } finally {
      loadingPreview.value = false
    }
  }

  async function loadEarlierMessages() {
    if (!oldestMessageUrl.value || !selectorPreviewMessages.value.length) {
      console.log('[Message Selector] Cannot load earlier - no oldest URL or no messages')
      return
    }

    console.log('[Message Selector] Load Earlier clicked, current count:', selectorPreviewMessages.value.length)

    // Call with append mode - fetch from oldest we have going back 50 more
    await loadSelectorMessages(oldestMessageUrl.value, true)
  }

  function selectFirstMessage(messageUrl: string) {
    discordFirstMessageUrl.value = messageUrl
    showMessageSelector.value = false
    console.log('[Message Selector] Selected first message:', messageUrl)
  }

  async function fetchDiscordMessages() {
    if (!isAuthenticated()) {
      onUnauthenticated()
      return
    }

    if (!discordLastMessageUrl.value) {
      error.value = 'Please enter the last message URL'
      return
    }

    submitting.value = true
    error.value = ''

    try {
      console.log('[Discord Import] Fetching messages with params:', {
        last: discordLastMessageUrl.value,
        first: discordFirstMessageUrl.value,
        maxMessages: discordMaxMessages.value
      })

      // Fetch messages from Discord API through our backend (server-side credentials)
      const response = await importsAPI.fetchDiscordMessages({
        lastMessageUrl: discordLastMessageUrl.value,
        firstMessageUrl: discordFirstMessageUrl.value || undefined,
        maxMessages: discordMaxMessages.value
      })

      console.log('[Discord Import] Fetched messages:', response.data)

      // Store fetch statistics
      const metadata = response.data.metadata
      const requestedFirst = discordFirstMessageUrl.value || undefined

      // Determine if first message was reached:
      // - If we specified a first URL and got it, we reached it
      // - If we didn't specify a first URL and not truncated, we got everything
      // - If truncated, we didn't reach the beginning
      let firstMessageReached = !metadata.truncated
      if (requestedFirst && response.data.messages.length > 0) {
        const firstMsgId = response.data.messages[0]?.metadata?.discord_message_id
        firstMessageReached = firstMsgId === extractMessageId(requestedFirst)
      }

      fetchStats.value = {
        messageCount: metadata.message_count || response.data.messages.length,
        truncated: metadata.truncated || false,
        firstMessageReached,
        requestedFirstUrl: requestedFirst
      }

      console.log('[Discord Import] Fetch stats:', fetchStats.value)

      // Store participant info with Discord IDs
      discordParticipantsWithIds.value = metadata.participants_with_ids || []

      // Convert to preview format
      previewMessages.value = response.data.messages

      // Extract unique participants
      const participants = new Set<string>()
      response.data.messages.forEach((msg: any) => {
        participants.add(msg.participant_name)
      })
      participantNames.value = Array.from(participants)

      // Use existing mappings first (keyed by Discord user ID), then auto-detect
      participantMapping.value = {}
      const existingMappingsByUserId = response.data.existing_mappings_by_user_id || {}

      console.log('[Discord Import] Applying mappings for participants:', participantNames.value)
      console.log('[Discord Import] Existing mappings by user ID:', existingMappingsByUserId)

      participantNames.value.forEach(name => {
        // Find participant info to get Discord user ID
        const participantInfo = discordParticipantsWithIds.value.find(p => p.name === name)

        if (!participantInfo) {
          console.log(`[Discord Import] No participant info for ${name}`)
          return
        }

        // Check if we have an existing mapping for this Discord user ID
        const existingMapping = existingMappingsByUserId[participantInfo.discord_user_id]

        if (existingMapping) {
          console.log(`[Discord Import] Found existing mapping for ${name} (${participantInfo.discord_user_id}):`, existingMapping)
          if (existingMapping.is_human) {
            participantMapping.value[name] = 'human'
          } else if (existingMapping.model_id) {
            participantMapping.value[name] = existingMapping.model_id
          }
          console.log(`[Discord Import] Applied mapping: ${name} → ${participantMapping.value[name]}`)
        } else {
          console.log(`[Discord Import] No existing mapping for ${name}, auto-detecting...`)
          // Auto-detect for new participants
          const msg = response.data.messages.find((m: any) => m.participant_name === name)
          if (msg) {
            if (msg.participant_type === 'model' && msg.model_info) {
              // Try to find existing model by name
              const existingModel = availableModels.value.find(
                m => m.name === msg.model_info.model_id || m.model_id === msg.model_info.model_id
              )
              if (existingModel) {
                participantMapping.value[name] = existingModel.id
              }
            } else if (msg.participant_type === 'human') {
              participantMapping.value[name] = 'human'
            }
          }
        }
      })

      // Set default title from Discord
      if (!title.value && response.data.title) {
        title.value = response.data.title
      }

      // Move to configure step
      step.value = 'configure'
    } catch (err: any) {
      console.error('[Discord Import] Fetch failed:', err)

      // Provide specific error messages based on response
      if (err.response?.status === 403 || err.response?.status === 401) {
        error.value = 'Permission denied: The Discord bridge bot may not have access to this channel. Please check that the bot is invited to the server and has permission to read message history.'
      } else if (err.response?.status === 404) {
        error.value = 'Message not found: The Discord message URL may be invalid or the message may have been deleted. Please verify the URL is correct.'
      } else if (err.response?.status === 400) {
        // Bad request - could be invalid URL format or bad parameters
        const errorMsg = err.response?.data?.error || err.response?.data?.message || ''
        if (errorMsg.toLowerCase().includes('url') || errorMsg.toLowerCase().includes('format')) {
          error.value = 'Invalid Discord URL format. Please use: https://discord.com/channels/GUILD_ID/CHANNEL_ID/MESSAGE_ID'
        } else {
          error.value = `Invalid request: ${errorMsg || 'Please check your input parameters'}`
        }
      } else if (err.message?.includes('timeout') || err.message?.includes('timed out')) {
        error.value = 'Request timed out: The Discord bridge service is not responding. It may be temporarily unavailable. Please try again in a moment.'
      } else if (err.message?.includes('Network Error') || err.message?.includes('fetch failed')) {
        error.value = 'Network error: Unable to connect to Discord bridge service. Please check your internet connection and try again.'
      } else {
        // Generic error with whatever message we got
        error.value = err.response?.data?.error || err.message || 'Failed to fetch Discord messages. Please try again or contact support.'
      }
    } finally {
      submitting.value = false
    }
  }

  return {
    // Refs owned by the composable
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
    oldestMessageUrl,
    // Functions
    isValidDiscordUrl,
    extractMessageId,
    validateDiscordUrl,
    openMessageSelector,
    loadSelectorMessages,
    loadEarlierMessages,
    selectFirstMessage,
    fetchDiscordMessages
  }
}
