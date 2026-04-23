import { Router } from 'express';
import { movieController } from './movie.controller';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createMediaSchema, updateMediaSchema } from './movie.validation';

const router = Router();

router.get('/featured', movieController.getFeatured.bind(movieController));
router.get('/', movieController.findAll.bind(movieController));
router.get('/:id', movieController.findOne.bind(movieController));

router.post('/', authenticate, requireAdmin, validate(createMediaSchema), movieController.create.bind(movieController));
router.patch('/:id', authenticate, requireAdmin, validate(updateMediaSchema), movieController.update.bind(movieController));
router.delete('/:id', authenticate, requireAdmin, movieController.delete.bind(movieController));

export default router;
