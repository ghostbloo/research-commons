import { ref, type Ref } from 'vue'
import type { Topic } from '@/types'
import { submissionsAPI } from '@/services/api'

export function useSubmissionMetadata(submission: Ref<any>, submissionId: string) {
  const editingTitle = ref(false)
  const titleEdit = ref('')
  const titleInput = ref<HTMLInputElement>()

  const editingDescription = ref(false)
  const descriptionEdit = ref('')
  const descriptionTextarea = ref<HTMLTextAreaElement>()

  const showTopicSelector = ref(false)
  const availableTopics = ref<Topic[]>([])

  function startEditTitle() {
    titleEdit.value = submission.value?.title || ''
    editingTitle.value = true
    setTimeout(() => titleInput.value?.focus(), 10)
  }

  async function saveTitle() {
    if (!editingTitle.value) return

    const newTitle = titleEdit.value.trim()
    if (!newTitle || newTitle === submission.value?.title) {
      cancelEditTitle()
      return
    }

    try {
      await submissionsAPI.update(submissionId, { title: newTitle })

      if (submission.value) {
        submission.value.title = newTitle
      }
      editingTitle.value = false
    } catch (err) {
      console.error('Failed to save title:', err)
      cancelEditTitle()
    }
  }

  function cancelEditTitle() {
    editingTitle.value = false
    titleEdit.value = ''
  }

  function startEditDescription() {
    descriptionEdit.value = submission.value?.metadata.description || ''
    editingDescription.value = true
    setTimeout(() => descriptionTextarea.value?.focus(), 10)
  }

  async function saveDescription() {
    try {
      await submissionsAPI.update(submissionId, { description: descriptionEdit.value })

      if (submission.value) {
        submission.value.metadata.description = descriptionEdit.value
      }
      editingDescription.value = false
    } catch (err) {
      console.error('Failed to save description:', err)
    }
  }

  function cancelEditDescription() {
    editingDescription.value = false
    descriptionEdit.value = ''
  }

  async function applyTopics(topicNames: string[]) {
    try {
      await submissionsAPI.update(submissionId, { tags: topicNames })

      if (submission.value) {
        submission.value.metadata.tags = topicNames
      }
      showTopicSelector.value = false
    } catch (err) {
      console.error('Failed to save topics:', err)
      showTopicSelector.value = false
    }
  }

  return {
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
  }
}
