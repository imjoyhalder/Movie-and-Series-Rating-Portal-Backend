import { Router } from 'express';
import { commentController } from './comment.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createCommentSchema, updateCommentSchema } from './comment.validation';

const router = Router();

// Public
router.get('/review/:reviewId', commentController.findByReview.bind(commentController));

// Authenticated users only
router.post('/', authenticate, validate(createCommentSchema), commentController.create.bind(commentController));
router.patch('/:id', authenticate, validate(updateCommentSchema), commentController.update.bind(commentController));
router.delete('/:id', authenticate, commentController.delete.bind(commentController));

export default router;
