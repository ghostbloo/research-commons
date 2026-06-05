import { describe, it, expect } from 'vitest';
import { renderMarkdown, preserveNewlines } from './markdown';

describe('renderMarkdown', () => {
  it('returns an empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });

  it('wraps @mentions in a mention span', () => {
    const html = renderMarkdown('@john');
    expect(html).toContain('class="mention"');
    expect(html).toContain('@john');
  });

  it('neutralizes chat-artifact pseudo-tags like <reply:@user>', () => {
    const html = renderMarkdown('<reply:@bob>');
    // The raw pseudo-tag must not survive as HTML; it gets entity-escaped.
    expect(html).not.toContain('<reply');
    expect(html).toContain('&lt;');
  });
});

describe('preserveNewlines', () => {
  it('converts newlines to <br>', () => {
    expect(preserveNewlines('a\nb')).toBe('a<br>b');
  });

  it('returns an empty string for empty input', () => {
    expect(preserveNewlines('')).toBe('');
  });
});
