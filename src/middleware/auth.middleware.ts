import { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../config/auth';
import { AppError } from '../utils/AppError';
import { Role } from '@prisma/client';

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session?.user) {
      throw new AppError('Authentication required', 401);
    }

    const { user } = session;

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: ((user as Record<string, unknown>).role as Role) ?? Role.USER,
      isEmailVerified: user.emailVerified,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Invalid or expired session', 401));
    }
  }
};

export const requireVerified = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user?.isEmailVerified) {
    next(new AppError('Please verify your email address before proceeding', 403));
    return;
  }
  next();
};

export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.user?.role !== Role.ADMIN) {
    next(new AppError('Admin access required', 403));
    return;
  }
  next();
};
