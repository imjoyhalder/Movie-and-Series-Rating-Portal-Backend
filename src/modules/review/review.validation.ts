import { z } from 'zod';

export const createReviewSchema = z.object({
  mediaId: z.string().min(1, 'Media ID is required'),
  rating: z.number().int().min(1).max(10),
  content: z.string().min(10, 'Review must be at least 10 characters').max(5000),
  tags: z.array(z.string()).optional().default([]),
  hasSpoiler: z.boolean().optional().default(false),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(10).optional(),
  content: z.string().min(10).max(5000).optional(),
  tags: z.array(z.string()).optional(),
  hasSpoiler: z.boolean().optional(),
});
