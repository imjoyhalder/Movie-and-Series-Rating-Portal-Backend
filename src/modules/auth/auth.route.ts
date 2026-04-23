// All auth routes are handled by Better Auth at /api/auth/*.
// The handler is mounted in src/app.ts via toNodeHandler(auth).
//
// Verified endpoints (tested against Better Auth v1.6.7):
//   POST   /api/auth/sign-up/email
//   POST   /api/auth/sign-in/email
//   POST   /api/auth/sign-out
//   GET    /api/auth/get-session          ← NOT /session
//   POST   /api/auth/request-password-reset  ← NOT /forget-password
//   POST   /api/auth/reset-password
//   GET    /api/auth/verify-email
//   POST   /api/auth/send-verification-email
//   POST   /api/auth/change-password
//   POST   /api/auth/update-user
//   POST   /api/auth/sign-in/social      ← Google: { provider: "google", callbackURL }
//   GET    /api/auth/callback/google     ← OAuth redirect_uri (called by Google)

import { Router } from 'express';
const router = Router();
export default router;
