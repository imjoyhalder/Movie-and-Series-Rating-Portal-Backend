import { z } from 'zod';

export const createCommentSchema = z.object({
  reviewId: z.string().min(1, 'Review ID is required'),
  content: z.string().min(1, 'Comment cannot be empty').max(1000),
  parentId: z.string().optional(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000),
});
