import type { ReviewStatus, SubscriptionStatus } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { getPagination, buildMeta } from '../../utils/response.js';
import { findOrThrow } from '../../utils/db.js';

const MONTHLY_PRICE = 9.99;
const YEARLY_PRICE  = 79.99;

export class AdminService {
  async getDashboardStats() {
    const [
      totalUsers,
      totalMedia,
      totalReviews,
      pendingReviews,
      activeSubscriptions,
      monthlySubscriptions,
      yearlySubscriptions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.media.count(),
      prisma.review.count(),
      prisma.review.count({ where: { status: 'PENDING' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { plan: 'MONTHLY', status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { plan: 'YEARLY',  status: 'ACTIVE' } }),
    ]);

    // Estimated monthly recurring revenue
    const estimatedMRR =
      monthlySubscriptions * MONTHLY_PRICE +
      yearlySubscriptions  * (YEARLY_PRICE / 12);

    // Estimated annual recurring revenue
    const estimatedARR =
      monthlySubscriptions * MONTHLY_PRICE * 12 +
      yearlySubscriptions  * YEARLY_PRICE;

    const [recentReviews, topRatedMedia] = await Promise.all([
      prisma.review.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user:  { select: { id: true, name: true, email: true, image: true } },
          media: { select: { id: true, title: true, posterUrl: true } },
        },
      }),
      prisma.media.findMany({
        take: 5,
        include: {
          _count:   { select: { reviews: true } },
          reviews:  { where: { status: 'APPROVED' }, select: { rating: true } },
        },
        orderBy: { reviews: { _count: 'desc' } },
      }),
    ]);

    return {
      stats: {
        totalUsers,
        totalMedia,
        totalReviews,
        pendingReviews,
        activeSubscriptions,
        monthlySubscriptions,
        yearlySubscriptions,
        estimatedMRR,
        estimatedARR,
      },
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

  async getSubscriptions(page: number, limit: number, status?: string) {
    const { skip, take } = getPagination(page, limit);
    const where = status && status !== 'ALL' ? { status: status as SubscriptionStatus } : {};

    const [data, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    return { data, meta: buildMeta(total, page, take) };
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
          user:  { select: { id: true, name: true, email: true } },
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
          user:  { select: { id: true, name: true, email: true } },
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
          id:           true,
          name:         true,
          email:        true,
          image:        true,
          role:         true,
          createdAt:    true,
          subscription: { select: { plan: true, status: true } },
          _count:       { select: { reviews: true } },
        },
      }),
      prisma.user.count(),
    ]);

    return { data, meta: buildMeta(total, page, take) };
  }

  async updateUserRole(userId: string, role: 'USER' | 'ADMIN') {
    await findOrThrow(prisma.user.findUnique({ where: { id: userId } }), 'User not found');
    return prisma.user.update({
      where:  { id: userId },
      data:   { role },
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
