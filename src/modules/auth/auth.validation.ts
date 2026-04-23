import { z } from 'zod';

// NOTE: These schemas are kept for reference only.
// All authentication is now handled by Better Auth at /api/auth/*.

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .refine((v) => /[A-Z]/.test(v), { message: 'Must contain at least one uppercase letter' })
  .refine((v) => /[0-9]/.test(v), { message: 'Must contain at least one number' });

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.email({ error: 'Invalid email address' }),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.email({ error: 'Invalid email address' }),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.email({ error: 'Invalid email address' }),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const resendVerificationSchema = z.object({
  email: z.email({ error: 'Invalid email address' }),
});
