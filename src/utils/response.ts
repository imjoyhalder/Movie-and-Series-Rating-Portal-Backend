import { Response } from 'express';
import { ApiResponse } from '../types';

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
  meta?: ApiResponse['meta']
): void => {
  const response: ApiResponse<T> = {
    success: statusCode < 400,
    message,
    ...(data !== undefined && { data }),
    ...(meta && { meta }),
  };
  res.status(statusCode).json(response);
};

export const getPagination = (page = 1, limit = 10) => {
  const take = Math.min(Math.max(Number(limit), 1), 100);
  const skip = (Math.max(Number(page), 1) - 1) * take;
  return { skip, take, page: Math.max(Number(page), 1) };
};

export const buildMeta = (total: number, page: number, limit: number) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});
