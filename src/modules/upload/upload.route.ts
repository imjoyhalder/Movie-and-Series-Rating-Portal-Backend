import { Router } from 'express';
import { uploadController } from './upload.controller.js';
import { authenticate, requireVerified, requireAdmin } from '../../middleware/auth.middleware.js';
import { uploadMiddleware } from '../../middleware/upload.middleware.js';

const router = Router();

// POST /api/upload/image — admin-only, multipart/form-data, field name: "image"
router.post(
  '/image',
  authenticate,
  requireVerified,
  requireAdmin,
  uploadMiddleware.single('image'),
  uploadController.uploadImage.bind(uploadController),
);

export default router;
