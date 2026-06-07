import { ref, computed, type Ref } from 'vue'
import type { Message, Selection, Comment } from '@/types'
import type { MarginAnnotation, VerticalBar } from '@/utils/layout-manager'
import { annotationsAPI } from '@/services/api'

export interface SelectionDataRecord {
  comments: Comment[]
  tags: any[]
  tagAttributions: Array<{ tag_id: string; tagged_by: string; tagged_at: Date }>
}

/**
 * Owns the selection "hub": the `selections` list and the `selectionData` cache,
 * plus all the derived computeds (margin annotations, vertical bars, inline comments,
 * tag stats, …) and the selection/comment CRUD that mutate those two refs.
 *
 * The refs are returned directly so the view's other handlers can keep reading and
 * mutating them while the reactive relationships into the computeds stay intact.
 */
export function useSelectionState(
  messages: Ref<Message[]>,
  allTags: Ref<Map<string, any>>
) {
  const selections = ref<Selection[]>([])
  const selectionData = ref<Map<string, SelectionDataRecord>>(new Map())

  // Track expanded comment threads (by parent comment id)
  const expandedReplies = ref<Set<string>>(new Set())
  const expandedTopLevel = ref<Set<string>>(new Set()) // Track which selections show all top-level comments

  // Build selection highlights map for each message
  const messageSelections = computed(() => {
    const selectionsMap = new Map<string, Array<{
      id: string
      start_offset: number
      end_offset: number
      label?: string
      hasComments: boolean
      hasTags: boolean
    }>>()

    for (const sel of selections.value) {
      const messageId = sel.start_message_id
      if (!selectionsMap.has(messageId)) {
        selectionsMap.set(messageId, [])
      }

      const data = selectionData.value.get(sel.id)
      selectionsMap.get(messageId)!.push({
        id: sel.id,
        start_offset: sel.start_offset ?? 0,
        end_offset: sel.end_offset ?? 0,
        label: sel.label,
        hasComments: (data?.comments?.length ?? 0) > 0,
        hasTags: (data?.tags?.length ?? 0) > 0
      })
    }

    return selectionsMap
  })

  // Track which messages have annotations
  const annotatedMessageIds = computed(() => {
    const ids = new Set<string>()
    for (const sel of selections.value) {
      ids.add(sel.start_message_id)
      // If spans multiple, add all in range
      if (sel.end_message_id !== sel.start_message_id) {
        const startIdx = messages.value.findIndex(m => m.id === sel.start_message_id)
        const endIdx = messages.value.findIndex(m => m.id === sel.end_message_id)
        for (let i = startIdx; i <= endIdx && i >= 0; i++) {
          ids.add(messages.value[i].id)
        }
      }
    }
    return ids
  })

  // Computed helpers
  const totalCommentCount = computed(() => {
    let count = 0
    for (const data of selectionData.value.values()) {
      count += data.comments.length
    }
    return count
  })

  // Messages that have comments (for highlight navigator)
  const messagesWithComments = computed(() => {
    const ids = new Set<string>()
    for (const sel of selections.value) {
      const data = selectionData.value.get(sel.id)
      if (data && data.comments.length > 0) {
        ids.add(sel.start_message_id)
      }
    }
    return ids
  })

  // Messages that have tags (for highlight navigator)
  const messagesWithTags = computed(() => {
    const ids = new Set<string>()
    for (const sel of selections.value) {
      if (sel.annotation_tags && sel.annotation_tags.length > 0) {
        ids.add(sel.start_message_id)
      }
    }
    return ids
  })

  // Inline comments grouped by message ID (for mobile view)
  const inlineComments = computed(() => {
    interface InlineComment {
      id: string
      selection_id: string
      content: string
      author_id: string
      created_at: string
      selection_text?: string
      parent_id?: string
      replies?: InlineComment[]
    }

    const map = new Map<string, InlineComment[]>()

    for (const sel of selections.value) {
      const data = selectionData.value.get(sel.id)
      if (!data || data.comments.length === 0) continue

      const messageId = sel.start_message_id
      if (!map.has(messageId)) {
        map.set(messageId, [])
      }

      // Build comment tree
      const commentMap = new Map<string, InlineComment>()
      const topLevel: InlineComment[] = []

      // First pass: create all comments
      for (const comment of data.comments) {
        const inlineComment: InlineComment = {
          id: comment.id,
          selection_id: sel.id,
          content: comment.content,
          author_id: comment.author_id,
          created_at: comment.created_at,
          selection_text: sel.selected_text?.slice(0, 50),
          parent_id: comment.parent_id,
          replies: []
        }
        commentMap.set(comment.id, inlineComment)
      }

      // Second pass: build tree
      for (const comment of data.comments) {
        const inlineComment = commentMap.get(comment.id)!
        if (comment.parent_id && commentMap.has(comment.parent_id)) {
          commentMap.get(comment.parent_id)!.replies!.push(inlineComment)
        } else {
          topLevel.push(inlineComment)
        }
      }

      map.get(messageId)!.push(...topLevel)
    }

    return map
  })

  // Tag statistics
  const tagStats = computed(() => {
    const stats = new Map<string, { tag_id: string; tag_name: string; count: number }>()

    for (const selection of selections.value) {
      for (const tagId of selection.annotation_tags) {
        const tag = allTags.value.get(tagId)
        if (!tag) continue

        if (!stats.has(tagId)) {
          stats.set(tagId, {
            tag_id: tagId,
            tag_name: tag.name,
            count: 0
          })
        }
        stats.get(tagId)!.count++
      }
    }

    return Array.from(stats.values()).sort((a, b) => b.count - a.count)
  })

  // Build vertical bars - one per selection
  const verticalBars = computed<VerticalBar[]>(() => {
    const bars: VerticalBar[] = []

    for (const sel of selections.value) {
      const data = selectionData.value.get(sel.id)
      if (!data) continue

      // Determine color: use first tag's color, or generate from selection ID
      let color = '#6B7280' // Default gray
      if (data.tags.length > 0 && data.tags[0].color) {
        color = data.tags[0].color
      } else if (data.tags.length > 0) {
        // Generate from tag name
        let hash = 0
        for (let i = 0; i < data.tags[0].name.length; i++) {
          hash = data.tags[0].name.charCodeAt(i) + ((hash << 5) - hash)
        }
        const hue = hash % 360
        color = `hsl(${hue}, 70%, 60%)`
      }

      bars.push({
        id: sel.id,
        selectionId: sel.id,
        startMessageId: sel.start_message_id,
        endMessageId: sel.end_message_id,
        color,
        tags: data.tags
      })
    }

    return bars
  })

  // Build margin annotations - separate annotations for tags and comments
  const marginAnnotations = computed<MarginAnnotation[]>(() => {
    const annotations: MarginAnnotation[] = []

    for (const sel of selections.value) {
      const data = selectionData.value.get(sel.id)
      if (!data) continue

      // Group tag attributions by tag_id
      const tagGroups = new Map<string, typeof sel.tag_attributions>()
      if (sel.tag_attributions) {
        for (const attr of sel.tag_attributions) {
          if (!tagGroups.has(attr.tag_id)) {
            tagGroups.set(attr.tag_id, [])
          }
          tagGroups.get(attr.tag_id)!.push(attr)
        }
      }

      // Create one annotation per unique tag
      for (const [tagId, attributions] of tagGroups) {
        const tag = allTags.value.get(tagId)
        if (!tag) continue

        annotations.push({
          id: `tag-${sel.id}-${tagId}`,
          type: 'tag-label',
          anchorMessageId: sel.start_message_id,
          priority: 5,
          minHeight: 32,
          data: {
            selectionId: sel.id,
            tag,
            tagAttributions: attributions
          }
        })
      }

      // Create one annotation per comment (with replies grouped after parents)
      // Collapsing rules:
      // - Show max 2 top-level comments unless expanded
      // - Show max 1 level of replies unless expanded
      const rootComments = data.comments.filter(c => !c.parent_id)
      const showAllTopLevel = expandedTopLevel.value.has(sel.id)
      const visibleRootComments = showAllTopLevel ? rootComments : rootComments.slice(0, 2)
      const hiddenTopLevelCount = rootComments.length - visibleRootComments.length

      // Recursively add a comment and its replies
      function addCommentWithReplies(comment: Comment, depth: number, parentId?: string) {
        annotations.push({
          id: `comment-${comment.id}`,
          type: 'comment-card',
          anchorMessageId: sel.start_message_id,
          priority: 4 + depth,
          minHeight: depth === 0 ? 80 : 60,
          data: {
            selectionId: sel.id,
            selection: sel,
            comment,
            isReply: depth > 0,
            depth
          }
        })

        // Find direct replies to this comment (data is guaranteed non-null by the guard above)
        const directReplies = data!.comments.filter(c => c.parent_id === comment.id)
        if (directReplies.length === 0) return

        // For depth 0 (root comments): show 1 reply, collapse rest
        // For depth 1+: only show if parent is expanded
        const isExpanded = expandedReplies.value.has(comment.id)

        if (depth === 0) {
          // Show first reply always
          const visibleReplies = isExpanded ? directReplies : directReplies.slice(0, 1)
          const hiddenCount = directReplies.length - visibleReplies.length

          for (const reply of visibleReplies) {
            addCommentWithReplies(reply, depth + 1, comment.id)
          }

          // Add "show more" indicator if there are hidden replies
          if (hiddenCount > 0) {
            annotations.push({
              id: `expand-replies-${comment.id}`,
              type: 'expand-replies',
              anchorMessageId: sel.start_message_id,
              priority: 5,
              minHeight: 24,
              data: {
                parentCommentId: comment.id,
                hiddenCount,
                depth: 1
              }
            })
          }
        } else if (isExpanded) {
          // Deeper levels: only show if explicitly expanded
          for (const reply of directReplies) {
            addCommentWithReplies(reply, depth + 1, comment.id)
          }
        } else if (directReplies.length > 0) {
          // Show "N more replies" indicator
          annotations.push({
            id: `expand-replies-${comment.id}`,
            type: 'expand-replies',
            anchorMessageId: sel.start_message_id,
            priority: 5 + depth,
            minHeight: 24,
            data: {
              parentCommentId: comment.id,
              hiddenCount: directReplies.length,
              depth: depth + 1
            }
          })
        }
      }

      // Start with visible root comments
      for (const comment of visibleRootComments) {
        addCommentWithReplies(comment, 0)
      }

      // Add "show more comments" if there are hidden top-level comments
      if (hiddenTopLevelCount > 0) {
        annotations.push({
          id: `expand-top-${sel.id}`,
          type: 'expand-top-level',
          anchorMessageId: sel.start_message_id,
          priority: 10,
          minHeight: 24,
          data: {
            selectionId: sel.id,
            hiddenCount: hiddenTopLevelCount
          }
        })
      }
    }

    return annotations
  })

  function handleExpandReplies(parentCommentId: string) {
    if (expandedReplies.value.has(parentCommentId)) {
      expandedReplies.value.delete(parentCommentId)
    } else {
      expandedReplies.value.add(parentCommentId)
    }
    // Trigger reactivity
    expandedReplies.value = new Set(expandedReplies.value)
  }

  function handleExpandTopLevel(selectionId: string) {
    if (expandedTopLevel.value.has(selectionId)) {
      expandedTopLevel.value.delete(selectionId)
    } else {
      expandedTopLevel.value.add(selectionId)
    }
    // Trigger reactivity
    expandedTopLevel.value = new Set(expandedTopLevel.value)
  }

  async function handleDeleteSelection(selectionId: string) {
    if (!confirm('Delete this selection and all its comments/ratings?')) return

    try {
      await annotationsAPI.deleteSelection(selectionId)

      // Remove from UI
      selections.value = selections.value.filter(s => s.id !== selectionId)
      selectionData.value.delete(selectionId)
    } catch (err) {
      console.error('Failed to delete selection:', err)
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm('Delete this comment?')) return

    try {
      await annotationsAPI.deleteComment(commentId)

      // Remove from all selections' comments (including replies to this comment)
      for (const data of selectionData.value.values()) {
        data.comments = data.comments.filter(c => c.id !== commentId && c.parent_id !== commentId)
      }
    } catch (err) {
      console.error('Failed to delete comment:', err)
    }
  }

  async function handleEditComment(commentId: string, content: string) {
    try {
      await annotationsAPI.updateComment(commentId, content)

      // Update the comment in local state
      for (const data of selectionData.value.values()) {
        const comment = data.comments.find(c => c.id === commentId)
        if (comment) {
          comment.content = content
          comment.updated_at = new Date().toISOString()
          break
        }
      }
    } catch (err) {
      console.error('Failed to edit comment:', err)
    }
  }

  return {
    // hub refs
    selections,
    selectionData,
    expandedReplies,
    expandedTopLevel,
    // computeds
    messageSelections,
    annotatedMessageIds,
    totalCommentCount,
    messagesWithComments,
    messagesWithTags,
    inlineComments,
    tagStats,
    verticalBars,
    marginAnnotations,
    // handlers
    handleExpandReplies,
    handleExpandTopLevel,
    handleDeleteSelection,
    handleDeleteComment,
    handleEditComment
  }
}
