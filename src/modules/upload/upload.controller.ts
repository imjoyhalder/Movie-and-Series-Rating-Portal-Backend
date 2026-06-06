import { Request, Response, NextFunction } from 'express';
import cloudinary from '../../config/cloudinary.js';
import { env } from '../../config/env.js';
import { sendResponse } from '../../utils/response.js';
import { AppError } from '../../utils/AppError.js';

const UPLOAD_FOLDER = 'movie-portal/posters';

export class UploadController {
  // POST /api/upload/image — legacy server-side upload (kept for compatibility)
  async uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) throw new AppError('No image file provided', 400);

      const b64 = req.file.buffer.toString('base64');
      const dataUri = `data:${req.file.mimetype};base64,${b64}`;

      const result = await cloudinary.uploader.upload(dataUri, {
        folder: UPLOAD_FOLDER,
        transformation: [
          { width: 500, height: 750, crop: 'fill', gravity: 'auto' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      });

      sendResponse(res, 200, 'Image uploaded successfully', {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/upload/signature — returns a short-lived signed upload credential.
  // The browser uses this to upload the file DIRECTLY to Cloudinary, so the
  // file never travels through the Next.js proxy or this server.  The API
  // secret never leaves the backend.
  getSignature(req: Request, res: Response, next: NextFunction): void {
    try {
      const timestamp = Math.round(Date.now() / 1000);

      const paramsToSign: Record<string, string | number> = {
        timestamp,
        folder: UPLOAD_FOLDER,
        transformation: 'c_fill,g_auto,h_750,w_500/q_auto,f_auto',
      };

      const signature = cloudinary.utils.api_sign_request(
        paramsToSign,
        env.CLOUDINARY_API_SECRET,
      );

      sendResponse(res, 200, 'Signature generated', {
        signature,
        timestamp,
        folder: UPLOAD_FOLDER,
        transformation: paramsToSign.transformation,
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const uploadController = new UploadController();
