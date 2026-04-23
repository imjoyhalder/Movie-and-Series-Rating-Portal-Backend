import { Router } from 'express';

import authRoutes from '../modules/auth/auth.route';
import userRoutes from '../modules/user/user.route';
import movieRoutes from '../modules/movie/movie.route';
import reviewRoutes from '../modules/review/review.route';
import commentRoutes from '../modules/comment/comment.route';
import watchlistRoutes from '../modules/watchlist/watchlist.route';
import paymentRoutes from '../modules/payment/payment.route';
import adminRoutes from '../modules/admin/admin.route';

/**
 * Access control summary:
 *
 * PUBLIC          — no token needed
 * USER            — authenticate middleware (any logged-in user)
 * ADMIN           — authenticate + requireAdmin middleware
 *
 * /auth/*         PUBLIC   register, login, refresh, logout, password reset
 * /movies         PUBLIC   browse & search media
 * /movies/:id     PUBLIC   view single media
 * /reviews        PUBLIC   read approved reviews
 * /comments       PUBLIC   read comments
 * /users/*        USER     own profile & password
 * /reviews (mut.) USER     create / edit / delete own reviews, like
 * /comments(mut.) USER     create / edit / delete own comments
 * /watchlist/*    USER     manage personal watchlist
 * /payments/*     USER     checkout & subscription management
 * /payments/webhook PUBLIC (Stripe-signed, raw body verified)
 * /admin/*        ADMIN    dashboard, moderation, user & media management
 */

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/movies', movieRoutes);
router.use('/reviews', reviewRoutes);
router.use('/comments', commentRoutes);
router.use('/watchlist', watchlistRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);

export default router;
