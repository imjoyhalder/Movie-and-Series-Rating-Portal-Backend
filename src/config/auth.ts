import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { bearer } from 'better-auth/plugins';
import { prisma } from './database';
import { env } from './env';
import { sendEmail, emailVerificationHtml, passwordResetEmailHtml } from '../utils/email';

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  // Prisma adapter — maps Better Auth's internal field names to our schema fields
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // Map Better Auth's default field names to our Prisma field names
  user: {
    fields: {
      image: 'image',
      emailVerified: 'emailVerified',
    },
    additionalFields: {
      // Expose `role` in session so middleware can enforce RBAC
      role: {
        type: 'string' as const,
        required: false,
        defaultValue: 'USER',
        input: false, // users cannot set their own role
      },
    },
  },

  // Allow Bearer token in Authorization header (for REST clients / mobile)
  plugins: [bearer()],

  // Trusted origins for CORS — the frontend URL
  trustedOrigins: [env.FRONTEND_URL],

  // ── Email + Password ──────────────────────────────────────────────────────
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset — Movie Portal',
        html: passwordResetEmailHtml(user.name, url),
      });
    },
  },

  // ── Email Verification ────────────────────────────────────────────────────
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Verify your email — Movie Portal',
        html: emailVerificationHtml(user.name, url),
      });
    },
  },

  // ── Social Providers ──────────────────────────────────────────────────────
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
});

// Infer the session/user type so middleware can be fully typed
export type BetterAuthSession = typeof auth.$Infer.Session;
export type BetterAuthUser = typeof auth.$Infer.Session.user & { role?: string };
