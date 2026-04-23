import { Router } from 'express';
import { userController } from './user.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { updateProfileSchema, changePasswordSchema } from './user.validation';

const router = Router();

router.use(authenticate);

router.get('/profile', userController.getProfile.bind(userController));
router.patch('/profile', validate(updateProfileSchema), userController.updateProfile.bind(userController));
router.patch('/change-password', validate(changePasswordSchema), userController.changePassword.bind(userController));

export default router;
