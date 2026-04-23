import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { UpdateProfileDto, ChangePasswordDto } from './user.interface';

export class UserService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        subscription: true,
        _count: { select: { reviews: true, watchlist: true } },
      },
    });
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return prisma.user.update({
      where: { id: userId },
      data: dto,
      select: { id: true, name: true, email: true, avatar: true, role: true },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) throw new AppError('User not found', 404);

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) throw new AppError('Current password is incorrect', 400);

    const hashed = await bcrypt.hash(dto.newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
  }
}

export const userService = new UserService();
