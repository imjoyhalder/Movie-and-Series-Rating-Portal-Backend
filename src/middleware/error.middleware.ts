import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { ZodError } from 'zod';

interface PrismaError extends Error {
  code?: string;
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  if (err instanceof ZodError) {
    const issues = err.issues ?? [];
    res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: issues.map((e: { path: PropertyKey[]; message: string }) => ({
        field: e.path.map(String).join('.'),
        message: e.message,
      })),
    });
    return;
  }

  const prismaErr = err as PrismaError;
  if (prismaErr.code === 'P2002') {
    res.status(409).json({ success: false, message: 'Resource already exists' });
    return;
  }
  if (prismaErr.code === 'P2025') {
    res.status(404).json({ success: false, message: 'Resource not found' });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message }),
  });
};
