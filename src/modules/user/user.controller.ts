import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service.js';
import { sendResponse } from '../../utils/response.js';

export class UserController {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.getProfile(req.user!.id);
      sendResponse(res, 200, 'Profile fetched', user);
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
}

export const userController = new UserController();
