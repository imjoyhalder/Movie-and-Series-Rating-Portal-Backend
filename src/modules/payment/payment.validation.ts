import { z } from 'zod';

export const createCheckoutSchema = z.object({
  plan: z.enum(['MONTHLY', 'YEARLY'], {
    error: 'Plan must be MONTHLY or YEARLY',
  }),
});
