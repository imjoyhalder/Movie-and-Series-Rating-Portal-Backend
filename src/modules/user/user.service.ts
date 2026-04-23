import { prisma } from '../../config/database';
import { findOrThrow } from '../../utils/db';
import { UpdateProfileDto } from './user.interface';

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

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return prisma.user.update({
      where: { id: userId },
      data: dto,
      select: { id: true, name: true, email: true, image: true, role: true },
    });
  }
}

export const userService = new UserService();
