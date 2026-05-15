import { Prisma } from '@prisma/client';
import type { ReviewStatus, SubscriptionStatus } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { getPagination, buildMeta } from '../../utils/response.js';
import { findOrThrow } from '../../utils/db.js';

const MONTHLY_PRICE = 9.99;
const YEARLY_PRICE  = 79.99;

export class AdminService {
  async getDashboardStats(period: string = '30days') {
    // ── All-time aggregates ──────────────────────────────────────────────────
    const [
      totalUsers, totalMedia, totalReviews, pendingReviews,
      activeSubscriptions, monthlySubscriptions, yearlySubscriptions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.media.count(),
      prisma.review.count(),
      prisma.review.count({ where: { status: 'PENDING' } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { plan: 'MONTHLY', status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { plan: 'YEARLY',  status: 'ACTIVE' } }),
    ]);

    const estimatedMRR = monthlySubscriptions * MONTHLY_PRICE + yearlySubscriptions * (YEARLY_PRICE / 12);
    const estimatedARR = monthlySubscriptions * MONTHLY_PRICE * 12 + yearlySubscriptions * YEARLY_PRICE;

    // ── Period date range ────────────────────────────────────────────────────
    const now = new Date();
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);

    const startDate: Date = (() => {
      const d = new Date(todayMidnight);
      if (period === 'today') return d;
      if (period === '7days') { d.setDate(d.getDate() - 6); return d; }
      d.setDate(d.getDate() - 29); // 30days default
      return d;
    })();

    const periodDays = period === 'today' ? 1 : period === '7days' ? 7 : 30;
    const prevStart = new Date(startDate);
    prevStart.setDate(prevStart.getDate() - periodDays);

    // ── Fetch period + previous-period records ───────────────────────────────
    const [periodUsers, periodReviews, periodSubs, prevUsers, prevReviews, prevSubs, recentReviews, topRatedMedia] =
      await Promise.all([
        prisma.user.findMany({ where: { createdAt: { gte: startDate } }, select: { createdAt: true } }),
        prisma.review.findMany({ where: { createdAt: { gte: startDate } }, select: { createdAt: true } }),
        prisma.subscription.findMany({ where: { createdAt: { gte: startDate } }, select: { createdAt: true } }),
        prisma.user.count({ where: { createdAt: { gte: prevStart, lt: startDate } } }),
        prisma.review.count({ where: { createdAt: { gte: prevStart, lt: startDate } } }),
        prisma.subscription.count({ where: { createdAt: { gte: prevStart, lt: startDate } } }),
        prisma.review.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user:  { select: { id: true, name: true, email: true, image: true } },
            media: { select: { id: true, title: true, posterUrl: true } },
          },
        }),
        prisma.media.findMany({
          take: 5,
          include: {
            _count:  { select: { reviews: true } },
            reviews: { where: { status: 'APPROVED' }, select: { rating: true } },
          },
          orderBy: { reviews: { _count: 'desc' } },
        }),
      ]);

    // ── Build time-series chart data ─────────────────────────────────────────
    type Bucket = { date: string; users: number; reviews: number; subscriptions: number };

    const chartData: Bucket[] = period === 'today'
      ? Array.from({ length: 24 }, (_, h) => {
          const hStart = new Date(todayMidnight); hStart.setHours(h, 0, 0, 0);
          const hEnd   = new Date(todayMidnight); hEnd.setHours(h, 59, 59, 999);
          const inHour = (r: { createdAt: Date }) => r.createdAt >= hStart && r.createdAt <= hEnd;
          return {
            date:          `${h.toString().padStart(2, '0')}:00`,
            users:         periodUsers.filter(inHour).length,
            reviews:       periodReviews.filter(inHour).length,
            subscriptions: periodSubs.filter(inHour).length,
          };
        })
      : (() => {
          const days: Bucket[] = [];
          const cur = new Date(startDate);
          while (cur <= now) {
            const dStart = new Date(cur); dStart.setHours(0, 0, 0, 0);
            const dEnd   = new Date(cur); dEnd.setHours(23, 59, 59, 999);
            const inDay  = (r: { createdAt: Date }) => r.createdAt >= dStart && r.createdAt <= dEnd;
            days.push({
              date:          cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              users:         periodUsers.filter(inDay).length,
              reviews:       periodReviews.filter(inDay).length,
              subscriptions: periodSubs.filter(inDay).length,
            });
            cur.setDate(cur.getDate() + 1);
          }
          return days;
        })();

    return {
      stats: {
        totalUsers, totalMedia, totalReviews, pendingReviews,
        activeSubscriptions, monthlySubscriptions, yearlySubscriptions,
        estimatedMRR, estimatedARR,
        newUsers:          periodUsers.length,
        newReviews:        periodReviews.length,
        newSubscriptions:  periodSubs.length,
        prevUsers,
        prevReviews,
        prevSubscriptions: prevSubs,
      },
      chartData,
      recentReviews,
      topRatedMedia: topRatedMedia.map((m) => ({
        ...m,
        averageRating: m.reviews.length
          ? m.reviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / m.reviews.length
          : 0,
      })),
    };
  }

  async getSubscriptions(page: number, limit: number, status?: string, plan?: string, search?: string) {
    const { skip, take } = getPagination(page, limit);

    const where: Prisma.SubscriptionWhereInput = {};
    if (status && status !== 'ALL') where.status = status as SubscriptionStatus;
    if (plan   && plan   !== 'ALL') where.plan   = plan as 'MONTHLY' | 'YEARLY' | 'FREE';
    if (search) {
      where.user = {
        OR: [
          { name:  { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

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

  async getAllReviews(page: number, limit: number, status?: ReviewStatus, search?: string, sortBy?: string, sortOrder?: string) {
    const { skip, take } = getPagination(page, limit);

    const where: Prisma.ReviewWhereInput = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { user:  { name:  { contains: search, mode: 'insensitive' } } },
        { media: { title: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const order = (sortOrder === 'asc' ? 'asc' : 'desc') as Prisma.SortOrder;
    const orderBy: Prisma.ReviewOrderByWithRelationInput =
      sortBy === 'rating' ? { rating: order } : { createdAt: order };

    const [data, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          user:  { select: { id: true, name: true, email: true, image: true } },
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

  async getAllUsers(
    page: number,
    limit: number,
    search?: string,
    role?: string,
    banned?: string,
    sortBy?: string,
    sortOrder?: string,
  ) {
    const { skip, take } = getPagination(page, limit);

    const where: Prisma.UserWhereInput = {};
    if (search) {
      where.OR = [
        { name:  { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role   && role !== 'ALL') where.role   = role as 'USER' | 'ADMIN';
    if (banned === 'true')        where.banned = true;
    if (banned === 'false')       where.banned = false;

    const order = (sortOrder === 'asc' ? 'asc' : 'desc') as Prisma.SortOrder;
    const orderBy: Prisma.UserOrderByWithRelationInput =
      sortBy === 'name'    ? { name:      order }              :
      sortBy === 'reviews' ? { reviews:   { _count: order } }  :
                             { createdAt: 'desc' };

    const [data, filteredTotal, allTotal, bannedTotal, adminTotal] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id:           true,
          name:         true,
          email:        true,
          image:        true,
          role:         true,
          banned:       true,
          createdAt:    true,
          subscription: { select: { plan: true, status: true } },
          _count:       { select: { reviews: true } },
        },
      }),
      prisma.user.count({ where }),
      prisma.user.count(),
      prisma.user.count({ where: { banned: true } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
    ]);

    return {
      data,
      meta: {
        ...buildMeta(filteredTotal, page, take),
        summary: {
          total:  allTotal,
          active: allTotal - bannedTotal,
          banned: bannedTotal,
          admins: adminTotal,
        },
      },
    };
  }

  async updateUserRole(userId: string, role: 'USER' | 'ADMIN') {
    await findOrThrow(prisma.user.findUnique({ where: { id: userId } }), 'User not found');
    return prisma.user.update({
      where:  { id: userId },
      data:   { role },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  async banUser(userId: string, banned: boolean) {
    await findOrThrow(prisma.user.findUnique({ where: { id: userId } }), 'User not found');
    return prisma.user.update({
      where:  { id: userId },
      data:   { banned },
      select: { id: true, name: true, email: true, banned: true },
    });
  }

  async deleteUser(userId: string) {
    await findOrThrow(prisma.user.findUnique({ where: { id: userId } }), 'User not found');
    await prisma.user.delete({ where: { id: userId } });
  }

  async deleteComment(commentId: string) {
    await findOrThrow(
      prisma.comment.findUnique({ where: { id: commentId } }),
      'Comment not found',
    );
    await prisma.comment.delete({ where: { id: commentId } });
  }

  async getAllMedia(
    page: number,
    limit: number,
    search?: string,
    type?: string,
    pricing?: string,
    published?: string,
    sortBy?: string,
    sortOrder?: string,
  ) {
    const { skip, take } = getPagination(page, limit);

    const where: Prisma.MediaWhereInput = {};
    if (search)                             where.title     = { contains: search, mode: 'insensitive' };
    if (type    && type    !== 'ALL')       where.type      = type    as 'MOVIE' | 'SERIES';
    if (pricing && pricing !== 'ALL')       where.pricing   = pricing as 'free'  | 'premium';
    if (published === 'true')               where.isPublished = true;
    else if (published === 'false')         where.isPublished = false;

    const order = (sortOrder === 'asc' ? 'asc' : 'desc') as Prisma.SortOrder;
    const orderBy: Prisma.MediaOrderByWithRelationInput =
      sortBy === 'title'   ? { title: order }       :
      sortBy === 'year'    ? { releaseYear: order }  :
      sortBy === 'reviews' ? { reviews: { _count: order } } :
                             { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { _count: { select: { reviews: true, watchlist: true } } },
      }),
      prisma.media.count({ where }),
    ]);

    return { data, meta: buildMeta(total, page, take) };
  }
}

export const adminService = new AdminService();
