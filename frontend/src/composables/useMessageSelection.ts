import { ref, type Ref } from 'vue'

/**
 * Callbacks used by {@link useMessageSelection} to surface selection events to
 * the host component (which forwards them as `text-selected` / `delete-selection`
 * emits).
 */
export interface UseMessageSelectionCallbacks {
  /** Fired when the user selects text inside the message content. */
  onTextSelected: (text: string, start: number, end: number) => void
  /** Fired when the user confirms deletion of an existing highlight. */
  onDeleteSelection: (selectionId: string) => void
}

/**
 * In-message text-selection + highlight-popup behavior, extracted from
 * Message.vue.
 *
 * - `onTextSelect` reads the current window selection and reports the selected
 *   text plus its character offsets (relative to the message's text content)
 *   via the `onTextSelected` callback.
 * - `onContentClick` detects clicks on an existing `.selection-highlight`
 *   element and opens an action popup anchored at the cursor; clicking
 *   elsewhere closes it.
 * - `deleteHighlight` / `closeHighlightPopup` drive that popup.
 *
 * @param contentEl template ref to the element wrapping the rendered message
 *   content (used to compute offsets against its `textContent`).
 */
export function useMessageSelection(
  contentEl: Ref<HTMLElement | undefined>,
  callbacks: UseMessageSelectionCallbacks
) {
  // Highlight popup state
  const activeHighlightId = ref<string | null>(null)
  const highlightPopupPosition = ref({ x: 0, y: 0 })

  function onTextSelect() {
    const selection = window.getSelection()
    if (!selection || selection.toString().length === 0) return

    const text = selection.toString()

    // Calculate offsets relative to message content
    // Simplified: just use character count for now
    const content = contentEl.value?.textContent || ''
    const startOffset = content.indexOf(text)
    const endOffset = startOffset + text.length

    if (startOffset !== -1) {
      callbacks.onTextSelected(text, startOffset, endOffset)
    }
  }

  function onContentClick(event: MouseEvent) {
    const target = event.target as HTMLElement

    // Check if clicked on a highlight
    const highlightEl = target.closest('.selection-highlight') as HTMLElement
    if (highlightEl) {
      const selectionId = highlightEl.getAttribute('data-selection-id')
      if (selectionId) {
        event.stopPropagation()
        activeHighlightId.value = selectionId
        highlightPopupPosition.value = {
          x: event.clientX,
          y: event.clientY
        }
      }
    } else {
      // Clicked elsewhere, close popup
      activeHighlightId.value = null
    }
  }

  function deleteHighlight() {
    if (activeHighlightId.value) {
      callbacks.onDeleteSelection(activeHighlightId.value)
      activeHighlightId.value = null
    }
  }

  function closeHighlightPopup() {
    activeHighlightId.value = null
  }

  return {
    activeHighlightId,
    highlightPopupPosition,
    onTextSelect,
    onContentClick,
    deleteHighlight,
    closeHighlightPopup,
  }
}
