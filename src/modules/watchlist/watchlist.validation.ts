import { z } from 'zod';

export const toggleWatchlistSchema = z.object({
  mediaId: z.string().min(1, 'Media ID is required'),
});
