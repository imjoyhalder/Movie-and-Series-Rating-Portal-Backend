import { Router } from 'express';
import { userController } from './user.controller';
import { authenticate, requireVerified } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { updateProfileSchema } from './user.validation';

const router = Router();

router.use(authenticate, requireVerified);

router.get('/profile', userController.getProfile.bind(userController));
router.patch('/profile', validate(updateProfileSchema), userController.updateProfile.bind(userController));

export default router;
