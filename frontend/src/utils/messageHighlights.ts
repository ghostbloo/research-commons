import { renderMarkdown } from '@/utils/markdown'

/**
 * A text selection that should be rendered as a highlight inside a message.
 * Mirrors the `SelectionHighlight` shape consumed by Message.vue.
 */
export interface SelectionHighlight {
  id: string
  start_offset: number
  end_offset: number
  label?: string
  hasComments?: boolean
  hasTags?: boolean
}

/**
 * Normalize text for comparison (collapse whitespace, normalize quotes/apostrophes).
 */
export function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[''`]/g, "'")  // Normalize apostrophes
    .replace(/[""]/g, '"')   // Normalize quotes
    .trim()
}

/**
 * Apply highlights to rendered HTML by finding the label text.
 *
 * For each selection that carries a `label`, this searches the rendered HTML
 * (outside of tags) for the label text — first an exact-ish flexible match,
 * then progressively shorter prefixes — and wraps the first match it finds in a
 * `<mark class="selection-highlight" data-selection-id="...">` element.
 */
export function applyHighlightsToHtml(html: string, selections?: SelectionHighlight[]): string {
  if (!selections || selections.length === 0) return html

  let result = html

  // Process each selection - use the label to find matches
  for (const sel of selections) {
    if (!sel.label) continue

    const searchText = sel.label
    const normalizedSearch = normalizeText(searchText)
    const hasAnnotations = sel.hasComments || sel.hasTags
    const className = hasAnnotations ? 'selection-highlight annotated' : 'selection-highlight'

    // Create a flexible regex that matches the text with normalized apostrophes/quotes
    // Replace apostrophes with a pattern that matches any apostrophe variant OR HTML entities
    let escapedText = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Match apostrophes as: ' or ' or ` or ' or &#39; or &apos;
    escapedText = escapedText.replace(/'/g, "(?:[''`']|&#39;|&apos;)")
    // Match quotes as: " or " or " or &#34; or &quot;
    escapedText = escapedText.replace(/"/g, '(?:["""]|&#34;|&quot;)')
    escapedText = escapedText.replace(/ /g, '\\s+')    // Flexible whitespace

    // First try: simple search in text parts (for text within single elements)
    const tagPattern = /(<[^>]+>)/g
    const parts = result.split(tagPattern)
    let found = false

    for (let i = 0; i < parts.length && !found; i++) {
      if (parts[i].startsWith('<')) continue

      // Try flexible match (regex now handles HTML entities)
      const textRegex = new RegExp(`(${escapedText})`, 'i')
      if (textRegex.test(parts[i])) {
        parts[i] = parts[i].replace(textRegex, `<mark class="${className}" data-selection-id="${sel.id}">$1</mark>`)
        found = true
      }
    }

    if (found) {
      result = parts.join('')
      continue
    }

    // Second try: progressively shorter substrings until we find a match
    // Start with full text, then try first 80%, 60%, 40%, 20%
    const percentages = [0.8, 0.6, 0.4, 0.2]

    for (const pct of percentages) {
      if (found) break

      const substringLen = Math.max(5, Math.floor(normalizedSearch.length * pct))
      const substring = normalizedSearch.substring(0, substringLen)

      let subEscaped = substring.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      subEscaped = subEscaped.replace(/'/g, "(?:[''`']|&#39;|&apos;)")
      subEscaped = subEscaped.replace(/"/g, '(?:["""]|&#34;|&quot;)')
      subEscaped = subEscaped.replace(/ /g, '\\s+')

      for (let i = 0; i < parts.length && !found; i++) {
        if (parts[i].startsWith('<')) continue

        const subRegex = new RegExp(`(${subEscaped})`, 'i')
        if (subRegex.test(parts[i])) {
          parts[i] = parts[i].replace(subRegex, `<mark class="${className}" data-selection-id="${sel.id}">$1</mark>`)
          found = true
        }
      }
    }

    if (found) {
      result = parts.join('')
    }
  }

  return result
}

/**
 * Render text with markdown + highlighting applied.
 *
 * `blockIndex` is accepted for parity with the original call site (it is part of
 * the per-block render loop) but is not currently used by the highlight pipeline.
 */
export function renderTextWithHighlights(
  text: string,
  selections?: SelectionHighlight[],
  _blockIndex?: number
): string {
  const renderedMarkdown = renderMarkdown(text)
  return applyHighlightsToHtml(renderedMarkdown, selections)
}
