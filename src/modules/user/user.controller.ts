import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service.js';
import { sendResponse } from '../../utils/response.js';
import { AppError } from '../../utils/AppError.js';

export class UserController {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getProfile(req.user!.id);
      sendResponse(res, 200, 'Profile fetched', user);
    } catch (error) {
      next(error);
    }
  }

  async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await userService.getDashboardStats(req.user!.id);
      sendResponse(res, 200, 'Dashboard stats fetched', stats);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.updateProfile(req.user!.id, req.body);
      sendResponse(res, 200, 'Profile updated', user);
    } catch (error) {
      next(error);
    }
  }

  async checkEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body as { email?: string };
      if (!email) throw new AppError('email is required', 400);
      const taken = await userService.isEmailTaken(email);
      if (taken) throw new AppError('This email is already registered', 409);
      sendResponse(res, 200, 'Email is available');
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
