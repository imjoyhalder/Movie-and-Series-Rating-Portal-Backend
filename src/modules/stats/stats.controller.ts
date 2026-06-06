import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { sendResponse } from '../../utils/response.js';

// Simple in-memory cache — stats don't change every second
let cache: { data: object; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getPublicStats(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Return cached data if fresh
    if (cache && Date.now() < cache.expiresAt) {
      sendResponse(res, 200, 'Stats fetched', cache.data);
      return;
    }

    const [totalMedia, totalReviews, totalUsers, ratingAgg] = await Promise.all([
      prisma.media.count({ where: { isPublished: true } }),
      prisma.review.count({ where: { status: 'APPROVED' } }),
      prisma.user.count(),
      prisma.review.aggregate({
        where: { status: 'APPROVED' },
        _avg: { rating: true },
      }),
    ]);

    const avgRating = ratingAgg._avg.rating
      ? Math.round(ratingAgg._avg.rating * 10) / 10
      : null;

    const data = { totalMedia, totalReviews, totalUsers, avgRating };
    cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };

    sendResponse(res, 200, 'Stats fetched', data);
  } catch (error) {
    next(error);
  }
}
