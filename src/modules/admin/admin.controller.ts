import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service.js';
import { sendResponse } from '../../utils/response.js';
import type { ReviewStatus } from '@prisma/client';

export class AdminController {
  async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const period = (req.query.period as string) || '30days';
      const stats = await adminService.getDashboardStats(period);
      sendResponse(res, 200, 'Dashboard stats fetched', stats);
    } catch (error) {
      next(error);
    }
  }

  async getPendingReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const result = await adminService.getPendingReviews(page, limit);
      sendResponse(res, 200, 'Pending reviews fetched', result.data, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getAllReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page   = Number(req.query.page)  || 1;
      const limit  = Number(req.query.limit) || 20;
      const status = req.query.status as ReviewStatus | undefined;
      const result = await adminService.getAllReviews(
        page, limit,
        status,
        req.query.search    as string | undefined,
        req.query.sortBy    as string | undefined,
        req.query.sortOrder as string | undefined,
      );
      sendResponse(res, 200, 'Reviews fetched', result.data, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async moderateReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status } = req.body;
      const review = await adminService.moderateReview(String(req.params.id), status);
      sendResponse(res, 200, 'Review status updated', review);
    } catch (error) {
      next(error);
    }
  }

  async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page  = Number(req.query.page)  || 1;
      const limit = Number(req.query.limit) || 20;
      const result = await adminService.getAllUsers(
        page, limit,
        req.query.search    as string | undefined,
        req.query.role      as string | undefined,
        req.query.banned    as string | undefined,
        req.query.sortBy    as string | undefined,
        req.query.sortOrder as string | undefined,
      );
      sendResponse(res, 200, 'Users fetched', result.data, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await adminService.updateUserRole(String(req.params.id), req.body.role);
      sendResponse(res, 200, 'User role updated', user);
    } catch (error) {
      next(error);
    }
  }

  async banUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const banned = req.body.banned === true;
      const user = await adminService.banUser(String(req.params.id), banned);
      sendResponse(res, 200, banned ? 'User banned' : 'User unbanned', user);
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await adminService.deleteUser(String(req.params.id));
      sendResponse(res, 200, 'User deleted');
    } catch (error) {
      next(error);
    }
  }

  async deleteComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await adminService.deleteComment(String(req.params.id));
      sendResponse(res, 200, 'Comment deleted');
    } catch (error) {
      next(error);
    }
  }

  async getSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page   = Number(req.query.page)  || 1;
      const limit  = Number(req.query.limit) || 20;
      const result = await adminService.getSubscriptions(
        page, limit,
        req.query.status as string | undefined,
        req.query.plan   as string | undefined,
        req.query.search as string | undefined,
      );
      sendResponse(res, 200, 'Subscriptions fetched', result.data, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getAllMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page  = Number(req.query.page)  || 1;
      const limit = Number(req.query.limit) || 20;
      const result = await adminService.getAllMedia(
        page, limit,
        req.query.search    as string | undefined,
        req.query.type      as string | undefined,
        req.query.pricing   as string | undefined,
        req.query.published as string | undefined,
        req.query.sortBy    as string | undefined,
        req.query.sortOrder as string | undefined,
      );
      sendResponse(res, 200, 'Media fetched', result.data, result.meta);
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
