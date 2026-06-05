import type { Ref } from 'vue'
import type { Message } from '@/types'

interface UseExportOptions {
  submission: Ref<any>
  messages: Ref<Message[]>
  submitterName: Ref<string>
  displayTags: Ref<string[]>
  showMoreMenu: Ref<boolean>
}

export function useExport(options: UseExportOptions) {
  const { submission, messages, submitterName, displayTags, showMoreMenu } = options

  // Download helper
  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showMoreMenu.value = false
  }

  // Export as Markdown - drops images, inlines text attachments
  function exportAsMarkdown() {
    const title = submission.value?.title || 'Conversation'
    const date = submission.value?.submitted_at
      ? new Date(submission.value.submitted_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    let md = `# ${title}\n\n`
    md += `*Exported from Research Commons on ${date}*\n\n`

    if (submission.value?.metadata?.description) {
      md += `> ${submission.value.metadata.description}\n\n`
    }

    md += `---\n\n`

    for (const msg of messages.value) {
      const role = msg.participant_type === 'human' ? '👤' : msg.participant_type === 'model' ? '🤖' : '⚙️'
      const name = msg.participant_name
      const model = msg.model_info?.model_id ? ` (${msg.model_info.model_id})` : ''

      md += `## ${role} ${name}${model}\n\n`

      for (const block of msg.content_blocks) {
        if (block.type === 'text' && block.text) {
          md += `${block.text}\n\n`
        } else if (block.type === 'thinking' && block.thinking?.content) {
          md += `<details>\n<summary>💭 Thinking</summary>\n\n${block.thinking.content}\n\n</details>\n\n`
        } else if (block.type === 'image') {
          md += `*[Image omitted]*\n\n`
        }
      }

      md += `---\n\n`
    }

    const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${date}.md`
    downloadFile(md, filename, 'text/markdown')
  }

  // Export as Standard JSON - user/assistant roles only
  function exportAsStandardJson() {
    const title = submission.value?.title || 'Conversation'
    const date = submission.value?.submitted_at
      ? new Date(submission.value.submitted_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    const conversation = {
      title,
      exported_at: new Date().toISOString(),
      source: 'Research Commons',
      messages: messages.value.map(msg => {
        // Map participant_type to standard roles
        const role = msg.participant_type === 'human' ? 'user'
          : msg.participant_type === 'model' ? 'assistant'
          : 'system'

        // Combine text blocks into content string
        const content = msg.content_blocks
          .filter(block => block.type === 'text')
          .map(block => block.text || '')
          .join('\n')

        return { role, content }
      }).filter(msg => msg.content.trim()) // Remove empty messages
    }

    const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${date}.json`
    downloadFile(JSON.stringify(conversation, null, 2), filename, 'application/json')
  }

  // Export as Multiuser JSON - rich role metadata
  function exportAsMultiuserJson() {
    const title = submission.value?.title || 'Conversation'
    const date = submission.value?.submitted_at
      ? new Date(submission.value.submitted_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    const conversation = {
      title,
      description: submission.value?.metadata?.description || null,
      exported_at: new Date().toISOString(),
      source: 'Research Commons',
      submission_id: submission.value?.id,
      submitted_at: submission.value?.submitted_at,
      submitter: submitterName.value,
      tags: displayTags.value,
      participants: [...new Set(messages.value.map(m => m.participant_name))].map(name => {
        const sample = messages.value.find(m => m.participant_name === name)
        return {
          name,
          type: sample?.participant_type || 'human',
          model_id: sample?.model_info?.model_id || null,
          provider: sample?.model_info?.provider || null
        }
      }),
      messages: messages.value.map(msg => ({
        id: msg.id,
        order: msg.order,
        participant_name: msg.participant_name,
        participant_type: msg.participant_type,
        model_info: msg.model_info || null,
        timestamp: msg.timestamp || null,
        hidden_from_models: msg.hidden_from_models || false,
        content_blocks: msg.content_blocks.map(block => {
          if (block.type === 'text') {
            return { type: 'text', text: block.text }
          } else if (block.type === 'thinking') {
            return { type: 'thinking', content: block.thinking?.content || '' }
          } else if (block.type === 'image') {
            return {
              type: 'image',
              mime_type: block.image?.mime_type || 'image/png',
              data: block.image?.data || '' // Include base64 data
            }
          }
          return block
        })
      }))
    }

    const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_multiuser_${date}.json`
    downloadFile(JSON.stringify(conversation, null, 2), filename, 'application/json')
  }

  function handleCopyMessage(messageId: string) {
    const message = messages.value.find(m => m.id === messageId)
    if (!message) return

    // Extract text from content blocks
    const text = message.content_blocks
      .filter(block => block.type === 'text')
      .map(block => block.text || '')
      .join('\n')

    navigator.clipboard.writeText(text)
      .then(() => {
        console.log('Message copied to clipboard')
        // TODO: Show toast notification
      })
      .catch(err => {
        console.error('Failed to copy message:', err)
      })
  }

  return {
    downloadFile,
    exportAsMarkdown,
    exportAsStandardJson,
    exportAsMultiuserJson,
    handleCopyMessage
  }
}
