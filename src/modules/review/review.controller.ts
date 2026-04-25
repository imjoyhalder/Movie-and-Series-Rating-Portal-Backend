import { Request, Response, NextFunction } from 'express';
import { reviewService } from './review.service.js';
import { sendResponse } from '../../utils/response.js';
import { ReviewFilterQuery } from './review.interface.js';

export class ReviewController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const review = await reviewService.create(req.user!.id, req.body);
      sendResponse(res, 201, 'Review submitted and pending approval', review);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: ReviewFilterQuery = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        mediaId: req.query.mediaId as string,
        userId: req.query.userId as string,
        sortBy: req.query.sortBy as ReviewFilterQuery['sortBy'],
      };
      const result = await reviewService.findAll(query);
      sendResponse(res, 200, 'Reviews fetched', result.data, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async findOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const review = await reviewService.findOne(String(req.params.id));
      sendResponse(res, 200, 'Review fetched', review);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const review = await reviewService.update(String(req.params.id), req.user!.id, req.body);
      sendResponse(res, 200, 'Review updated', review);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await reviewService.delete(String(req.params.id), req.user!.id, req.user!.role === 'ADMIN');
      sendResponse(res, 200, 'Review deleted');
    } catch (error) {
      next(error);
    }
  }

  async toggleLike(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await reviewService.toggleLike(String(req.params.id), req.user!.id);
      sendResponse(res, 200, result.liked ? 'Review liked' : 'Review unliked', result);
    } catch (error) {
      next(error);
    }
  }

  async getMyReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviews = await reviewService.getUserReviews(req.user!.id);
      sendResponse(res, 200, 'Your reviews fetched', reviews);
    } catch (error) {
      next(error);
    }
  }
}

export const reviewController = new ReviewController();
