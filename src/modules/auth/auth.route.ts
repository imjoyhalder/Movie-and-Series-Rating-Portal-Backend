// All auth routes are handled by Better Auth at /api/auth/*.
// The handler is mounted in src/app.ts via toNodeHandler(auth).
//
// Available endpoints (Better Auth defaults):
//   POST   /api/auth/sign-up/email
//   POST   /api/auth/sign-in/email
//   POST   /api/auth/sign-out
//   GET    /api/auth/session
//   POST   /api/auth/forget-password
//   POST   /api/auth/reset-password
//   GET    /api/auth/verify-email
//   POST   /api/auth/change-password
//   POST   /api/auth/update-user
//   GET    /api/auth/sign-in/google
//   GET    /api/auth/callback/google

import { Router } from 'express';
const router = Router();
export default router;
