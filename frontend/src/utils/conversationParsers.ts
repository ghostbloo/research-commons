// Pure conversation-parsing helpers extracted from SubmitView.vue.
//
// These functions take raw JSON (already parsed from an uploaded file) and
// convert ARC branching exports or standard Anthropic API message arrays into
// the platform's linear `Message[]` shape, alongside the unique participant
// names and an auto-mapping (participant name -> model id or 'human').
//
// No Vue / no side effects: the caller owns refs and applies results.

import type { Message } from '@/types'

export interface ParsedConversation {
  /** Messages converted into the platform's linear format. */
  messages: Message[]
  /** Unique participant names found in the conversation. */
  participantNames: string[]
  /** Suggested participant -> (modelId | 'human') mapping. */
  autoMapping: Record<string, string>
  /** Title pulled from conversation metadata, if any (ARC only). */
  detectedTitle?: string
  /** Whether the input was detected as ARC branching format. */
  isArcFormat: boolean
}

/** Minimal shape of a model the auto-mapping needs to match against. */
interface ModelLike {
  id: string
  name: string
  model_id?: string
}

/**
 * Detect whether parsed JSON is ARC's branching conversation export.
 * ARC files carry both a `conversation` object and a `messages` array.
 */
export function isArcConversationFormat(data: any): boolean {
  return !!(data && data.conversation && data.messages && Array.isArray(data.messages))
}

/** Detect whether parsed JSON is a standard Anthropic-style `messages` array. */
export function isAnthropicFormat(data: any): boolean {
  return !!(data && data.messages && Array.isArray(data.messages))
}

/**
 * Resolve a participant name from a role string, matching the original
 * SubmitView behavior (user -> 'User', assistant -> 'Assistant', else role).
 */
function participantNameFromRole(role: any): string {
  return role === 'user' ? 'User' : role === 'assistant' ? 'Assistant' : role || 'Unknown'
}

/**
 * Convert ARC's branching conversation format into linear messages by
 * following each message's active branch.
 */
export function parseArcConversation(data: any): {
  messages: Message[]
  participantNames: string[]
  detectedTitle?: string
} {
  const converted: Message[] = []
  const participants = new Set<string>()
  let parentId: string | null = null

  // Build map of branch IDs to their resulting message IDs.
  const branchToMessageId = new Map<string, string>()

  data.messages.forEach((msg: any, idx: number) => {
    // Get the active branch for this message
    const activeBranch = msg.branches.find((b: any) => b.id === msg.activeBranchId)

    if (!activeBranch) {
      console.warn('[Submit] Message has no active branch:', msg.id)
      return
    }

    const messageId = crypto.randomUUID()

    // Store mapping of branch ID to our message ID
    branchToMessageId.set(activeBranch.id, messageId)

    // Extract content blocks from branch
    // ARC format has contentBlocks array with thinking/text blocks
    let contentBlocks: any[] = []
    if (activeBranch.contentBlocks && Array.isArray(activeBranch.contentBlocks)) {
      // Transform ARC contentBlocks format to our format
      contentBlocks = activeBranch.contentBlocks.map((block: any) => {
        if (block.type === 'thinking') {
          // ARC has thinking as a direct string, we need { content, signature }
          return {
            type: 'thinking',
            thinking: {
              content: block.thinking,
              signature: block.signature
            }
          }
        }
        return block
      })
    } else if (typeof activeBranch.content === 'string') {
      contentBlocks = [{ type: 'text', text: activeBranch.content }]
    } else if (Array.isArray(activeBranch.content)) {
      contentBlocks = activeBranch.content
    }

    // Determine participant name from role
    const participantName = participantNameFromRole(activeBranch.role)

    participants.add(participantName)

    // Figure out parent message ID by looking up parent branch
    let actualParentId = parentId
    if (activeBranch.parentBranchId && activeBranch.parentBranchId !== 'root') {
      actualParentId = branchToMessageId.get(activeBranch.parentBranchId) || parentId
    }

    converted.push({
      id: messageId,
      submission_id: '', // Will be filled by server
      parent_message_id: actualParentId,
      order: idx,
      participant_name: participantName,
      participant_type: 'human' as any, // Will be updated based on selection
      content_blocks: contentBlocks,
      model_info: activeBranch.model ? {
        model_id: activeBranch.model,
        provider: 'other',
        reasoning_enabled: false
      } : undefined,
      timestamp: activeBranch.createdAt || new Date().toISOString()
    })

    parentId = messageId
  })

  return {
    messages: converted,
    participantNames: Array.from(participants),
    detectedTitle: typeof data.conversation?.title === 'string' ? data.conversation.title : undefined
  }
}

/**
 * Convert a standard Anthropic-style `messages` array into linear messages.
 */
export function parseAnthropicConversation(data: any): {
  messages: Message[]
  participantNames: string[]
} {
  const converted: Message[] = []
  const participants = new Set<string>()
  let parentId: string | null = null

  data.messages.forEach((msg: any, idx: number) => {
    const messageId = crypto.randomUUID()

    // Extract content blocks
    let contentBlocks: any[] = []
    if (Array.isArray(msg.content)) {
      contentBlocks = msg.content
    } else if (typeof msg.content === 'string') {
      contentBlocks = [{ type: 'text', text: msg.content }]
    }

    // Determine participant (but don't assume type yet)
    const participantName = participantNameFromRole(msg.role)
    participants.add(participantName)

    converted.push({
      id: messageId,
      submission_id: '', // Will be filled by server
      parent_message_id: parentId,
      order: idx,
      participant_name: participantName,
      participant_type: 'human' as any, // Will be updated based on selection
      content_blocks: contentBlocks,
      model_info: undefined // Will be set if this is the model
    })

    parentId = messageId
  })

  return {
    messages: converted,
    participantNames: Array.from(participants)
  }
}

/**
 * Build the default participant -> (modelId | 'human') auto-mapping:
 * map "Assistant" to a Claude model if one exists, and "User" to human.
 */
export function buildDefaultMapping(
  participantNames: string[],
  availableModels: ModelLike[]
): Record<string, string> {
  const mapping: Record<string, string> = {}

  // Auto-map "Assistant" to Claude if available
  if (participantNames.includes('Assistant') && availableModels.length > 0) {
    const claude = availableModels.find(m => m.name.includes('Claude'))
    if (claude) {
      mapping['Assistant'] = claude.id
    }
  }

  // Auto-map "User" to human
  if (participantNames.includes('User')) {
    mapping['User'] = 'human'
  }

  return mapping
}

/**
 * Parse raw JSON text from an uploaded conversation file.
 *
 * Throws on invalid JSON (message prefixed) or when no `messages` array is
 * present, so the caller can surface the message in its error ref.
 */
export function parseConversationJSON(
  text: string,
  availableModels: ModelLike[]
): ParsedConversation {
  let data: any
  try {
    data = JSON.parse(text)
  } catch (err: any) {
    throw new Error('Invalid JSON: ' + err.message)
  }

  let messages: Message[]
  let participantNames: string[]
  let detectedTitle: string | undefined
  let isArcFormat = false

  if (isArcConversationFormat(data)) {
    console.log('[Submit] Detected ARC conversation format')
    isArcFormat = true
    const result = parseArcConversation(data)
    messages = result.messages
    participantNames = result.participantNames
    detectedTitle = result.detectedTitle
    console.log('[Submit] Converted', messages.length, 'messages from ARC format')
  } else if (isAnthropicFormat(data)) {
    console.log('[Submit] Detected standard Anthropic format')
    const result = parseAnthropicConversation(data)
    messages = result.messages
    participantNames = result.participantNames
  } else {
    throw new Error('JSON must have a "messages" array (with optional "conversation" metadata for ARC format)')
  }

  return {
    messages,
    participantNames,
    autoMapping: buildDefaultMapping(participantNames, availableModels),
    detectedTitle,
    isArcFormat
  }
}
