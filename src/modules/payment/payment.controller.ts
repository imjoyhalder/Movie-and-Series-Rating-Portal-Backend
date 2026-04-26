import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { paymentService } from './payment.service.js';
import { sendResponse } from '../../utils/response.js';
import { AppError } from '../../utils/AppError.js';

export class PaymentController {
  async createCheckoutSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user!.role === Role.ADMIN) {
        throw new AppError('Admin accounts have full access — no payment required', 403);
      }
      const { plan } = req.body;
      const result = await paymentService.createCheckoutSession(req.user!.id, plan);
      sendResponse(res, 200, 'Checkout session created', result);
    } catch (error) {
      next(error);
    }
  }

  async webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;
      await paymentService.handleWebhook(req.body as Buffer, signature);
      res.status(200).json({ received: true });
    } catch (error) {
      next(error);
    }
  }

  async getSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Admins get full access without a subscription record
      if (req.user!.role === Role.ADMIN) {
        sendResponse(res, 200, 'Subscription fetched', {
          plan: 'ADMIN',
          status: 'ACTIVE',
          adminAccess: true,
        });
        return;
      }
      const subscription = await paymentService.getSubscription(req.user!.id);
      sendResponse(res, 200, 'Subscription fetched', subscription);
    } catch (error) {
      next(error);
    }
  }

  async cancelSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user!.role === Role.ADMIN) {
        throw new AppError('Admin accounts do not have subscriptions to cancel', 403);
      }
      const subscription = await paymentService.cancelSubscription(req.user!.id);
      sendResponse(res, 200, 'Subscription will cancel at end of billing period', subscription);
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
