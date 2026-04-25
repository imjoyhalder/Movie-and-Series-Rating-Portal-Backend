import { Request, Response, NextFunction } from 'express';
import { movieService } from './movie.service.js';
import { sendResponse } from '../../utils/response.js';
import { MediaFilterQuery } from './movie.interface.js';

export class MovieController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const media = await movieService.create(req.body);
      sendResponse(res, 201, 'Media created successfully', media);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: MediaFilterQuery = {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        type: req.query.type as MediaFilterQuery['type'],
        genre: req.query.genre as string,
        releaseYear: req.query.releaseYear ? Number(req.query.releaseYear) : undefined,
        streamingPlatform: req.query.streamingPlatform as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as MediaFilterQuery['sortBy'],
        pricing: req.query.pricing as string,
      };
      const result = await movieService.findAll(query);
      sendResponse(res, 200, 'Media fetched', result.data, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async findOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const media = await movieService.findOne(String(req.params.id));
      sendResponse(res, 200, 'Media fetched', media);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const media = await movieService.update(String(req.params.id), req.body);
      sendResponse(res, 200, 'Media updated', media);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await movieService.delete(String(req.params.id));
      sendResponse(res, 200, 'Media deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async getFeatured(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await movieService.getFeatured();
      sendResponse(res, 200, 'Featured media fetched', data);
    } catch (error) {
      next(error);
    }
  }
}

export const movieController = new MovieController();
