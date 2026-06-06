import { Router } from 'express';
import { uploadController } from './upload.controller.js';
import { authenticate, requireVerified, requireAdmin } from '../../middleware/auth.middleware.js';
import { uploadMiddleware } from '../../middleware/upload.middleware.js';

const router = Router();

// GET /api/upload/signature
// Returns a short-lived Cloudinary signed-upload credential.
// The browser uploads the file DIRECTLY to Cloudinary using this signature.
router.get(
  '/signature',
  authenticate,
  requireVerified,
  requireAdmin,
  uploadController.getSignature.bind(uploadController),
);

// POST /api/upload/image — legacy server-side upload (fallback)
router.post(
  '/image',
  authenticate,
  requireVerified,
  requireAdmin,
  uploadMiddleware.single('image'),
  uploadController.uploadImage.bind(uploadController),
);

export default router;
