import { z } from 'zod';

// Selection: a range in the submission (Google Docs style)
export const SelectionSchema = z.object({
  id: z.string().uuid(),
  submission_id: z.string().uuid(),
  created_by: z.string().uuid(),
  
  start_message_id: z.string().uuid(),
  start_offset: z.number().int().optional(),
  end_message_id: z.string().uuid(),
  end_offset: z.number().int().optional(),
  
  label: z.string().optional(),  // Freeform label (legacy/optional)
  selected_text: z.string().optional(),  // Legacy snapshot of the selected range text (some views)
  annotation_tags: z.array(z.string().uuid()).default([]),  // Tag IDs from ontologies

  // Per-user tag votes assembled from the SQLite selection_tags table when the API returns a
  // selection (see src/routes/annotations.ts). Not persisted on the selection event itself.
  tag_attributions: z.array(z.object({
    tag_id: z.string().uuid(),
    tagged_by: z.string().uuid(),
    tagged_at: z.date()
  })).optional(),

  created_at: z.date()
});

export type Selection = z.infer<typeof SelectionSchema>;

// Comment: always targets a selection (can be threaded)
export const CommentSchema = z.object({
  id: z.string().uuid(),
  selection_id: z.string().uuid(),  // Always on selection
  author_id: z.string().uuid(),
  parent_id: z.string().uuid().optional(),  // Threading
  
  content: z.string(),
  // Generic target fields used by some annotation views (legacy/optional).
  target_type: z.string().optional(),
  target_id: z.string().optional(),
  created_at: z.date(),
  updated_at: z.date().optional()
});

export type Comment = z.infer<typeof CommentSchema>;

// Rating: linked to criterion, always on submission (not selection)
export const RatingSchema = z.object({
  id: z.string().uuid(),
  submission_id: z.string().uuid(),  // Always on submission
  rater_id: z.string().uuid(),
  
  criterion_id: z.string().uuid(),
  score: z.number(),
  target_id: z.string().optional(),  // Legacy/optional, used by some annotation views

  created_at: z.date(),
  updated_at: z.date().optional()
});

export type Rating = z.infer<typeof RatingSchema>;

// API request schemas
export const CreateSelectionRequestSchema = z.object({
  submission_id: z.string().uuid(),
  start_message_id: z.string().uuid(),
  start_offset: z.number().int().optional(),
  end_message_id: z.string().uuid(),
  end_offset: z.number().int().optional(),
  label: z.string().optional()
});

export const CreateCommentRequestSchema = z.object({
  selection_id: z.string().uuid(),
  parent_id: z.string().uuid().optional(),
  content: z.string()
});

export const CreateRatingRequestSchema = z.object({
  submission_id: z.string().uuid(),
  criterion_id: z.string().uuid(),
  score: z.number()
});

