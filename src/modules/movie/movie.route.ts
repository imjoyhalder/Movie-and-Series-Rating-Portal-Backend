import { Router } from 'express';
import { movieController } from './movie.controller';
import { authenticate, requireVerified, requireAdmin } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createMediaSchema, updateMediaSchema } from './movie.validation';

const router = Router();

router.get('/featured', movieController.getFeatured.bind(movieController));
router.get('/', movieController.findAll.bind(movieController));
router.get('/:id', movieController.findOne.bind(movieController));

router.post('/', authenticate, requireVerified, requireAdmin, validate(createMediaSchema), movieController.create.bind(movieController));
router.patch('/:id', authenticate, requireVerified, requireAdmin, validate(updateMediaSchema), movieController.update.bind(movieController));
router.delete('/:id', authenticate, requireVerified, requireAdmin, movieController.delete.bind(movieController));

export default router;
