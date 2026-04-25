import { Router } from 'express';
import { userController } from './user.controller.js';
import { authenticate, requireVerified } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { updateProfileSchema } from './user.validation.js';

const router = Router();

router.use(authenticate, requireVerified);

router.get('/profile', userController.getProfile.bind(userController));
router.patch('/profile', validate(updateProfileSchema), userController.updateProfile.bind(userController));

export default router;
