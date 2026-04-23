import type { ReviewStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { getPagination, buildMeta } from '../../utils/response';
import { findOrThrow } from '../../utils/db';

export class AdminService {
  async getDashboardStats() {
    const [totalUsers, totalMedia, totalReviews, pendingReviews, activeSubscriptions] =
      await Promise.all([
        prisma.user.count(),
        prisma.media.count(),
        prisma.review.count(),
        prisma.review.count({ where: { status: 'PENDING' } }),
        prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      ]);

    const [recentReviews, topRatedMedia] = await Promise.all([
      prisma.review.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          media: { select: { id: true, title: true } },
        },
      }),
      prisma.media.findMany({
        take: 5,
        include: {
          _count: { select: { reviews: true } },
          reviews: { where: { status: 'APPROVED' }, select: { rating: true } },
        },
      }),
    ]);

    return {
      stats: { totalUsers, totalMedia, totalReviews, pendingReviews, activeSubscriptions },
      recentReviews,
      topRatedMedia: topRatedMedia.map((m) => ({
        ...m,
        averageRating:
          m.reviews.length > 0
            ? m.reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) /
              m.reviews.length
            : 0,
      })),
    };
  }

  async getPendingReviews(page: number, limit: number) {
    const { skip, take } = getPagination(page, limit);

    const [data, total] = await Promise.all([
      prisma.review.findMany({
        where: { status: 'PENDING' },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          media: { select: { id: true, title: true, posterUrl: true } },
        },
      }),
      prisma.review.count({ where: { status: 'PENDING' } }),
    ]);

    return { data, meta: buildMeta(total, page, take) };
  }

  async getAllReviews(page: number, limit: number, status?: ReviewStatus) {
    const { skip, take } = getPagination(page, limit);
    const where = status ? { status } : {};

    const [data, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          media: { select: { id: true, title: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return { data, meta: buildMeta(total, page, take) };
  }

  async moderateReview(reviewId: string, status: ReviewStatus) {
    await findOrThrow(prisma.review.findUnique({ where: { id: reviewId } }), 'Review not found');
    return prisma.review.update({ where: { id: reviewId }, data: { status } });
  }

  async getAllUsers(page: number, limit: number) {
    const { skip, take } = getPagination(page, limit);

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          subscription: { select: { plan: true, status: true } },
          _count: { select: { reviews: true } },
        },
      }),
      prisma.user.count(),
    ]);

    return { data, meta: buildMeta(total, page, take) };
  }

  async updateUserRole(userId: string, role: 'USER' | 'ADMIN') {
    await findOrThrow(prisma.user.findUnique({ where: { id: userId } }), 'User not found');
    return prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async deleteComment(commentId: string) {
    await findOrThrow(
      prisma.comment.findUnique({ where: { id: commentId } }),
      'Comment not found',
    );
    await prisma.comment.delete({ where: { id: commentId } });
  }

  async getAllMedia(page: number, limit: number) {
    const { skip, take } = getPagination(page, limit);

    const [data, total] = await Promise.all([
      prisma.media.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { reviews: true, watchlist: true } } },
      }),
      prisma.media.count(),
    ]);

    return { data, meta: buildMeta(total, page, take) };
  }
}

export const adminService = new AdminService();
