import { Request, Response, NextFunction } from 'express';
import { commentService } from './comment.service';
import { sendResponse } from '../../utils/response';

export class CommentController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const comment = await commentService.create(req.user!.id, req.body);
      sendResponse(res, 201, 'Comment added', comment);
    } catch (error) {
      next(error);
    }
  }

  async findByReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const comments = await commentService.findByReview(String(req.params.reviewId));
      sendResponse(res, 200, 'Comments fetched', comments);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const comment = await commentService.update(String(req.params.id), req.user!.id, req.body);
      sendResponse(res, 200, 'Comment updated', comment);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await commentService.delete(String(req.params.id), req.user!.id, req.user!.role === 'ADMIN');
      sendResponse(res, 200, 'Comment deleted');
    } catch (error) {
      next(error);
    }
  }
}

export const commentController = new CommentController();
