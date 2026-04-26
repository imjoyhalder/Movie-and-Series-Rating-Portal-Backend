import { Request, Response, NextFunction } from 'express';
import cloudinary from '../../config/cloudinary.js';
import { sendResponse } from '../../utils/response.js';
import { AppError } from '../../utils/AppError.js';

export class UploadController {
  async uploadImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError('No image file provided', 400);
      }

      const b64 = req.file.buffer.toString('base64');
      const dataUri = `data:${req.file.mimetype};base64,${b64}`;

      const result = await cloudinary.uploader.upload(dataUri, {
        folder: 'movie-portal/posters',
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
}

export const uploadController = new UploadController();
