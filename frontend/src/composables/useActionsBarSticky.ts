import { ref, watch, onMounted, onUnmounted, nextTick, type Ref } from 'vue'

/**
 * Sticky-positioning logic for a message's floating actions bar.
 *
 * The actions bar normally floats just above its message card. As the user
 * scrolls and the card moves up behind the fixed page header, the bar becomes
 * `position: fixed` and pins itself just below the header until the card has
 * scrolled (mostly) out of view. This composable owns that visibility/sticky
 * state plus the hover bookkeeping that keeps the bar open while the pointer is
 * over either the message or the bar.
 *
 * It is extracted verbatim from Message.vue so behavior is unchanged.
 *
 * @param actionsBar template ref to the actions-bar element (used to measure
 *   its position and find the enclosing `.message-card`).
 */
export function useActionsBarSticky(actionsBar: Ref<HTMLElement | undefined>) {
  const showActions = ref(false)
  const actionsExpanded = ref(false)
  const isMobile = ref(false)
  const isActionsBarSticky = ref(false)
  const actionsBarLeft = ref('0px') // Left position when sticky (captured from screen)

  const isMouseOverMessage = ref(false)
  const isMouseOverBar = ref(false)

  // Check if actions bar should be sticky (hit the header)
  function updateActionsBarSticky() {
    if (!actionsBar.value || !(showActions.value || actionsExpanded.value)) {
      isActionsBarSticky.value = false
      return
    }

    const messageCard = actionsBar.value.closest('.message-card')
    if (!messageCard) {
      isActionsBarSticky.value = false
      return
    }

    const cardRect = messageCard.getBoundingClientRect()
    const headerHeight = 80 // Fixed header height
    const barHeight = 60 // Approximate actions bar height

    // The actions bar would naturally be at cardRect.top - 30
    const naturalTop = cardRect.top - 30

    // Hide if message is completely scrolled past
    if (cardRect.bottom < headerHeight + barHeight) {
      showActions.value = false
      isActionsBarSticky.value = false
      return
    }

    // Make it sticky if:
    // 1. Natural position would be above/behind header
    // 2. Message card still has content below the sticky position
    const shouldBeSticky = naturalTop < headerHeight && cardRect.bottom > (headerHeight + barHeight + 20)

    // Calculate left position for fixed positioning
    if (shouldBeSticky && !isActionsBarSticky.value) {
      // Capture the bar's actual current LEFT position before making it fixed
      const barRect = actionsBar.value.getBoundingClientRect()

      // Use the bar's current left position directly
      const leftPosition = barRect.left
      actionsBarLeft.value = `${leftPosition}px`
    }

    isActionsBarSticky.value = shouldBeSticky
  }

  // Watch for actions bar visibility and scroll
  watch([showActions, actionsExpanded], () => {
    if (showActions.value || actionsExpanded.value) {
      nextTick(updateActionsBarSticky)
    }
  })

  function checkMobile() {
    isMobile.value = window.innerWidth < 768
  }

  function handleMouseEnter() {
    isMouseOverMessage.value = true
    showActions.value = true
    nextTick(updateActionsBarSticky)
  }

  function handleMouseLeave() {
    isMouseOverMessage.value = false

    // Use setTimeout to allow mouse to move to the bar
    setTimeout(() => {
      // Hide only if mouse is not over message AND not over bar
      if (!isMouseOverMessage.value && !isMouseOverBar.value) {
        showActions.value = false
      }
    }, 50)
  }

  function handleActionsBarEnter() {
    isMouseOverBar.value = true
    showActions.value = true
  }

  function handleActionsBarLeave() {
    isMouseOverBar.value = false

    // Use setTimeout to allow mouse to move back to message
    setTimeout(() => {
      // Hide only if mouse is not over message AND not over bar
      if (!isMouseOverMessage.value && !isMouseOverBar.value) {
        showActions.value = false
      }
    }, 50)
  }

  function toggleActions() {
    actionsExpanded.value = !actionsExpanded.value
  }

  onMounted(() => {
    checkMobile()
    window.addEventListener('resize', checkMobile)
    window.addEventListener('scroll', updateActionsBarSticky, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('resize', checkMobile)
    window.removeEventListener('scroll', updateActionsBarSticky)
  })

  return {
    showActions,
    actionsExpanded,
    isMobile,
    isActionsBarSticky,
    actionsBarLeft,
    updateActionsBarSticky,
    handleMouseEnter,
    handleMouseLeave,
    handleActionsBarEnter,
    handleActionsBarLeave,
    toggleActions,
  }
}
