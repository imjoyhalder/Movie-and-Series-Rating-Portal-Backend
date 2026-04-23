import { Router } from 'express';
import { reviewController } from './review.controller';
import { authenticate, requireVerified } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createReviewSchema, updateReviewSchema } from './review.validation';

const router = Router();

router.get('/', reviewController.findAll.bind(reviewController));
router.get('/my', authenticate, requireVerified, reviewController.getMyReviews.bind(reviewController));
router.get('/:id', reviewController.findOne.bind(reviewController));

router.post('/', authenticate, requireVerified, validate(createReviewSchema), reviewController.create.bind(reviewController));
router.patch('/:id', authenticate, requireVerified, validate(updateReviewSchema), reviewController.update.bind(reviewController));
router.delete('/:id', authenticate, requireVerified, reviewController.delete.bind(reviewController));
router.post('/:id/like', authenticate, requireVerified, reviewController.toggleLike.bind(reviewController));

export default router;
