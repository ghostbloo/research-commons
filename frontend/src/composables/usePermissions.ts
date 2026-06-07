import { computed, type Ref } from 'vue'
import type { useAuthStore } from '@/stores/auth'

type AuthStore = ReturnType<typeof useAuthStore>

export function usePermissions(authStore: AuthStore, submission: Ref<any>) {
  const canEditSubmission = computed(() => {
    if (!authStore.user || !submission.value) return false
    return submission.value.submitter_id === authStore.user.id ||
           authStore.user.roles.includes('researcher') ||
           authStore.user.roles.includes('admin')
  })

  const canDeleteSubmission = computed(() => {
    if (!authStore.user || !submission.value) return false
    return submission.value.submitter_id === authStore.user.id ||
           authStore.user.roles.includes('admin')
  })

  // Researchers and admins can export conversations
  const canExport = computed(() => {
    if (!authStore.user) return false
    return authStore.user.roles.includes('researcher') ||
           authStore.user.roles.includes('admin')
  })

  // Permission to hide messages (owner or admin only)
  const canHideMessages = computed(() => {
    if (!authStore.user || !submission.value) return false
    return submission.value.submitter_id === authStore.user.id ||
           authStore.user.roles.includes('admin')
  })

  // Permission to view hidden messages (researchers can see what's hidden, but not hide)
  // Owners can also see individual hidden messages so they can manage them
  const canViewHiddenMessages = computed(() => {
    if (!authStore.user || !submission.value) return false

    // Check if user is researcher, admin, or the submission owner
    const isOwner = submission.value.submitter_id === authStore.user.id
    const isResearcher = authStore.user.roles.includes('researcher')
    const isAdmin = authStore.user.roles.includes('admin')

    return isOwner || isResearcher || isAdmin
  })

  // Permission to toggle hidden_from_models (admins and submission owners only)
  const canToggleHiddenFromModels = computed(() => {
    if (!authStore.user || !submission.value) return false
    return submission.value.submitter_id === authStore.user.id ||
           authStore.user.roles.includes('admin')
  })

  const canPin = computed(() => {
    if (!authStore.user || !submission.value) return false
    return submission.value.submitter_id === authStore.user.id ||
           authStore.user.roles.includes('admin') ||
           authStore.user.roles.includes('researcher')
  })

  return {
    canEditSubmission,
    canDeleteSubmission,
    canExport,
    canHideMessages,
    canViewHiddenMessages,
    canToggleHiddenFromModels,
    canPin
  }
}
