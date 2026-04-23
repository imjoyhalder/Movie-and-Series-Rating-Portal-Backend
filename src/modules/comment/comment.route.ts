import { Router } from 'express';
import { commentController } from './comment.controller';
import { authenticate, requireVerified } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createCommentSchema, updateCommentSchema } from './comment.validation';

const router = Router();

// Public
router.get('/review/:reviewId', commentController.findByReview.bind(commentController));

// Authenticated + verified users only
router.post('/', authenticate, requireVerified, validate(createCommentSchema), commentController.create.bind(commentController));
router.patch('/:id', authenticate, requireVerified, validate(updateCommentSchema), commentController.update.bind(commentController));
router.delete('/:id', authenticate, requireVerified, commentController.delete.bind(commentController));

export default router;
