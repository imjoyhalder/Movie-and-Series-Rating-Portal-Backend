import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { CreateCommentDto, UpdateCommentDto } from './comment.interface';

export class CommentService {
  async create(userId: string, dto: CreateCommentDto) {
    const review = await prisma.review.findUnique({ where: { id: dto.reviewId } });
    if (!review) throw new AppError('Review not found', 404);

    if (dto.parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: dto.parentId } });
      if (!parent) throw new AppError('Parent comment not found', 404);
    }

    return prisma.comment.create({
      data: { ...dto, userId },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        replies: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });
  }

  async findByReview(reviewId: string) {
    return prisma.comment.findMany({
      where: { reviewId, parentId: null },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateCommentDto) {
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new AppError('Comment not found', 404);
    if (comment.userId !== userId) throw new AppError('Forbidden', 403);

    return prisma.comment.update({
      where: { id },
      data: { content: dto.content },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
  }

  async delete(id: string, userId: string, isAdmin: boolean) {
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new AppError('Comment not found', 404);
    if (!isAdmin && comment.userId !== userId) throw new AppError('Forbidden', 403);
    await prisma.comment.delete({ where: { id } });
  }
}

export const commentService = new CommentService();
