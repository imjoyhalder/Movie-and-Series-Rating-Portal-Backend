import { Router } from 'express';
import { adminController } from './admin.controller';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { moderateReviewSchema, updateUserRoleSchema } from './admin.validation';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate, requireAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboardStats.bind(adminController));

// Review moderation
router.get('/reviews', adminController.getAllReviews.bind(adminController));
router.get('/reviews/pending', adminController.getPendingReviews.bind(adminController));
router.patch('/reviews/:id/moderate', validate(moderateReviewSchema), adminController.moderateReview.bind(adminController));

// User management
router.get('/users', adminController.getAllUsers.bind(adminController));
router.patch('/users/:id/role', validate(updateUserRoleSchema), adminController.updateUserRole.bind(adminController));

// Media management (admin view — includes unpublished)
router.get('/media', adminController.getAllMedia.bind(adminController));

// Content moderation
router.delete('/comments/:id', adminController.deleteComment.bind(adminController));

export default router;
