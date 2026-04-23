import { z } from 'zod';

// Change-password is now handled by Better Auth at POST /api/auth/change-password
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  image: z.url({ error: 'Invalid image URL' }).optional(),
});
