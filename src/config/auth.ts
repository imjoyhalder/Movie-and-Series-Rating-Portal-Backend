import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { bearer, emailOTP } from 'better-auth/plugins';
import { prisma } from './database.js';
import { env } from './env.js';
import { sendEmail, emailOtpHtml, forgotPasswordOtpHtml } from '../utils/email.js';

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  user: {
    fields: {
      image: 'image',
      emailVerified: 'emailVerified',
    },
    additionalFields: {
      role: {
        type: 'string' as const,
        required: false,
        defaultValue: 'USER',
        input: false,
      },
    },
  },

  plugins: [
    bearer(),
    emailOTP({
      otpLength: 6,
      expiresIn: 600, // 10 minutes
      sendVerificationOnSignUp: true,
      disableSignUp: false,
      allowedAttempts: 5,
      sendVerificationOTP: async ({ email, otp, type }) => {
        const isReset = type === 'forget-password';
        await sendEmail({
          to: email,
          subject: isReset
            ? 'Password Reset Code — CinePortal'
            : 'Your Verification Code — CinePortal',
          html: isReset ? forgotPasswordOtpHtml(email, otp) : emailOtpHtml(email, otp),
        });
      },
    }),
  ],

  trustedOrigins: [env.FRONTEND_URL],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
});

export type BetterAuthSession = typeof auth.$Infer.Session;
export type BetterAuthUser = typeof auth.$Infer.Session.user & { role?: string };
