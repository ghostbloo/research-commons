import { describe, it, expect } from 'vitest';
import { CreateSubmissionRequestSchema, ContentBlockSchema } from './submission.js';

describe('CreateSubmissionRequestSchema', () => {
  it('accepts a minimal valid request', () => {
    const result = CreateSubmissionRequestSchema.safeParse({
      title: 'A conversation',
      source_type: 'discord',
      messages: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a request missing the title', () => {
    const result = CreateSubmissionRequestSchema.safeParse({
      source_type: 'discord',
      messages: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown source_type', () => {
    const result = CreateSubmissionRequestSchema.safeParse({
      title: 'A conversation',
      source_type: 'nope',
      messages: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('ContentBlockSchema', () => {
  it('accepts a text block', () => {
    expect(ContentBlockSchema.safeParse({ type: 'text', text: 'hi' }).success).toBe(true);
  });

  it('accepts an image block', () => {
    expect(
      ContentBlockSchema.safeParse({ type: 'image', mime_type: 'image/png', data: 'base64==' }).success,
    ).toBe(true);
  });

  it('rejects an unknown block type (discriminated union)', () => {
    expect(ContentBlockSchema.safeParse({ type: 'bogus', text: 'hi' }).success).toBe(false);
  });
});
