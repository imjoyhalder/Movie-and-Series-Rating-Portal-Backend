import { z } from 'zod';

export const moderateReviewSchema = z.object({
  status: z.enum(['APPROVED', 'UNPUBLISHED'], {
    error: 'Status must be APPROVED or UNPUBLISHED',
  }),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['USER', 'ADMIN'], {
    error: 'Role must be USER or ADMIN',
  }),
});
