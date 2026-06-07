import { ref, computed } from 'vue'
import { foldersAPI, type Folder } from '@/services/api'
import type { useAuthStore } from '@/stores/auth'

type AuthStore = ReturnType<typeof useAuthStore>

export function useFolderManager(submissionId: string, authStore: AuthStore) {
  const showFolderPicker = ref(false)
  const folderPickerLoading = ref(false)
  const folderPickerFolders = ref<Folder[]>([])
  const folderPickerExisting = ref<Set<string>>(new Set())
  const submissionFolderCount = ref(0)

  const folderPickerCurrentFolders = computed(() =>
    folderPickerFolders.value.filter(f => folderPickerExisting.value.has(f.id))
  )
  const folderPickerAvailable = computed(() =>
    folderPickerFolders.value.filter(f => !folderPickerExisting.value.has(f.id))
  )

  async function loadSubmissionFolderCount() {
    if (!authStore.isAuthenticated()) return
    try {
      const res = await foldersAPI.getBySubmission(submissionId)
      submissionFolderCount.value = res.data.folders.length
    } catch { /* ignore for unauthenticated */ }
  }

  async function openFolderPicker() {
    showFolderPicker.value = true
    folderPickerLoading.value = true
    try {
      const [foldersRes, existingRes] = await Promise.all([
        foldersAPI.list(),
        foldersAPI.getBySubmission(submissionId)
      ])
      folderPickerFolders.value = foldersRes.data.folders
      folderPickerExisting.value = new Set(existingRes.data.folders.map(f => f.id))
      submissionFolderCount.value = existingRes.data.folders.length
    } catch (err) {
      console.error('Failed to load folders:', err)
    } finally {
      folderPickerLoading.value = false
    }
  }

  async function addToFolder(folderId: string) {
    try {
      await foldersAPI.addSubmission(folderId, submissionId)
      folderPickerExisting.value = new Set([...folderPickerExisting.value, folderId])
      submissionFolderCount.value = folderPickerExisting.value.size
    } catch (err: any) {
      console.error('Failed to add to folder:', err)
      alert('Failed to add to folder: ' + (err.response?.data?.error || err.message))
    }
  }

  async function removeFromFolder(folderId: string) {
    if (!confirm('Remove this conversation from the folder?')) return
    try {
      await foldersAPI.removeSubmission(folderId, submissionId)
      const next = new Set(folderPickerExisting.value)
      next.delete(folderId)
      folderPickerExisting.value = next
      submissionFolderCount.value = next.size
    } catch (err: any) {
      console.error('Failed to remove from folder:', err)
      alert('Failed to remove from folder: ' + (err.response?.data?.error || err.message))
    }
  }

  return {
    showFolderPicker,
    folderPickerLoading,
    folderPickerFolders,
    folderPickerExisting,
    submissionFolderCount,
    folderPickerCurrentFolders,
    folderPickerAvailable,
    loadSubmissionFolderCount,
    openFolderPicker,
    addToFolder,
    removeFromFolder
  }
}
