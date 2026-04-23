import { z } from 'zod';

export const createMediaSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  synopsis: z.string().min(10, 'Synopsis must be at least 10 characters'),
  type: z.enum(['MOVIE', 'SERIES']),
  genre: z.array(z.string()).min(1, 'At least one genre is required'),
  releaseYear: z.number().int().min(1888).max(new Date().getFullYear() + 2),
  director: z.string().min(1, 'Director is required'),
  cast: z.array(z.string()).min(1, 'At least one cast member is required'),
  streamingPlatforms: z.array(z.string()).min(1, 'At least one streaming platform is required'),
  posterUrl: z.url().optional(),
  trailerUrl: z.url().optional(),
  streamingUrl: z.url().optional(),
  pricing: z.enum(['free', 'premium']).optional().default('free'),
});

export const updateMediaSchema = createMediaSchema.partial().extend({
  isPublished: z.boolean().optional(),
  // Override to strip the default('free') so partial updates don't silently reset pricing
  pricing: z.enum(['free', 'premium']).optional(),
});
