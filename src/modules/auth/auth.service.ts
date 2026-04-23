import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { sendEmail, passwordResetEmailHtml } from '../../utils/email';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, AuthTokens } from './auth.interface';

export class AuthService {
  async register(dto: RegisterDto) {
    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new AppError('Email already in use', 409);

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await prisma.user.create({
      data: { name: dto.name, email: dto.email, password: hashedPassword },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    const tokens = this.generateTokens(user.id, user.email, user.role);
    await this.saveSession(user.id, tokens.refreshToken);

    return { user, tokens };
  }

  async login(dto: LoginDto) {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.password) throw new AppError('Invalid email or password', 401);

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new AppError('Invalid email or password', 401);

    const tokens = this.generateTokens(user.id, user.email, user.role);
    await this.saveSession(user.id, tokens.refreshToken);

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, tokens };
  }

  async refreshToken(token: string): Promise<AuthTokens> {
    const session = await prisma.session.findUnique({ where: { token } });
    if (!session || session.expiresAt < new Date()) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) throw new AppError('User not found', 401);

    const tokens = this.generateTokens(user.id, user.email, user.role);
    await prisma.session.update({ where: { token }, data: { token: tokens.refreshToken } });

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    await prisma.session.deleteMany({ where: { token: refreshToken } });
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return; // Silent fail to prevent email enumeration

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: 'Password Reset - Movie Portal',
      html: passwordResetEmailHtml(user.name, resetUrl),
    });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: dto.token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) throw new AppError('Invalid or expired reset token', 400);

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, resetToken: null, resetTokenExpiry: null },
    });

    await prisma.session.deleteMany({ where: { userId: user.id } });
  }

  private generateTokens(userId: string, email: string, role: string): AuthTokens {
    const payload = { userId, email, role: role as 'USER' | 'ADMIN' };
    return {
      accessToken: generateAccessToken(payload),
      refreshToken: generateRefreshToken(payload),
    };
  }

  private async saveSession(userId: string, refreshToken: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await prisma.session.create({ data: { userId, token: refreshToken, expiresAt } });
  }
}

export const authService = new AuthService();
