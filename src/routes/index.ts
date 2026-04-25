import { Router } from 'express';

import userRoutes from '../modules/user/user.route.js';
import movieRoutes from '../modules/movie/movie.route.js';
import reviewRoutes from '../modules/review/review.route.js';
import commentRoutes from '../modules/comment/comment.route.js';
import watchlistRoutes from '../modules/watchlist/watchlist.route.js';
import paymentRoutes from '../modules/payment/payment.route.js';
import adminRoutes from '../modules/admin/admin.route.js';

/**
 * Access control summary:
 *
 * PUBLIC           — no session required
 * VERIFIED USER    — authenticate + requireVerified
 * ADMIN            — authenticate + requireVerified + requireAdmin
 *
 * /api/auth/*      Better Auth handles all authentication routes:
 *                  sign-up, sign-in, sign-out, verify-email,
 *                  forget-password, reset-password, change-password,
 *                  update-user, sign-in/google, callback/google
 *
 * /movies          PUBLIC   browse & search media
 * /movies/:id      PUBLIC   view single media
 * /reviews         PUBLIC   read approved reviews
 * /comments        PUBLIC   read comments
 * /users/*         VERIFIED USER   own profile
 * /reviews (mut.)  VERIFIED USER   create / edit / delete own reviews, like
 * /comments(mut.)  VERIFIED USER   create / edit / delete own comments
 * /watchlist/*     VERIFIED USER   manage personal watchlist
 * /payments/*      VERIFIED USER   checkout & subscription management
 * /payments/webhook PUBLIC (Stripe-signed, raw body verified)
 * /admin/*         ADMIN    dashboard, moderation, user & media management
 */

const router = Router();

router.use('/users', userRoutes);
router.use('/movies', movieRoutes);
router.use('/reviews', reviewRoutes);
router.use('/comments', commentRoutes);
router.use('/watchlist', watchlistRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);

export default router;
