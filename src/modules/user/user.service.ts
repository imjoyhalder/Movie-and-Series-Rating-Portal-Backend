import { prisma } from '../../config/database.js';
import { findOrThrow } from '../../utils/db.js';
import { UpdateProfileDto } from './user.interface.js';

export class UserService {
  async getProfile(userId: string) {
    return findOrThrow(
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          subscription: true,
          _count: { select: { reviews: true, watchlist: true } },
        },
      }),
      'User not found',
    );
  }

  async getDashboardStats(userId: string) {
    const [reviews, watchlistCount, subscription] = await Promise.all([
      prisma.review.findMany({
        where: { userId },
        select: { rating: true, status: true },
      }),
      prisma.watchlist.count({ where: { userId } }),
      prisma.subscription.findUnique({ where: { userId } }),
    ]);

    const totalReviews    = reviews.length;
    const approvedReviews = reviews.filter((r) => r.status === 'APPROVED').length;
    const pendingReviews  = reviews.filter((r) => r.status === 'PENDING').length;
    const avgRating =
      totalReviews > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / totalReviews
        : null;

    const isPaid =
      subscription?.status === 'ACTIVE' && subscription.plan !== 'FREE';

    const daysRemaining =
      isPaid && subscription?.currentPeriodEnd
        ? Math.max(
            0,
            Math.ceil(
              (new Date(subscription.currentPeriodEnd).getTime() - Date.now()) /
                86_400_000,
            ),
          )
        : null;

    return {
      totalReviews,
      approvedReviews,
      pendingReviews,
      avgRating,
      watchlistCount,
      daysRemaining,
      subscription,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return prisma.user.update({
      where: { id: userId },
      data: dto,
      select: { id: true, name: true, email: true, image: true, role: true },
    });
  }

  async isEmailTaken(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    return user !== null;
  }
}

export const userService = new UserService();
