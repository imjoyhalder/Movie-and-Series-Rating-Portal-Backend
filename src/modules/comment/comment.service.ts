import { prisma } from '../../config/database';
import { findOrThrow, assertOwnership } from '../../utils/db';
import { CreateCommentDto, UpdateCommentDto } from './comment.interface';

const USER_SELECT = { id: true, name: true, image: true } as const;

export class CommentService {
  async create(userId: string, dto: CreateCommentDto) {
    await findOrThrow(
      prisma.review.findUnique({ where: { id: dto.reviewId } }),
      'Review not found',
    );

    if (dto.parentId) {
      await findOrThrow(
        prisma.comment.findUnique({ where: { id: dto.parentId } }),
        'Parent comment not found',
      );
    }

    return prisma.comment.create({
      data: { ...dto, userId },
      include: {
        user: { select: USER_SELECT },
        replies: { include: { user: { select: USER_SELECT } } },
      },
    });
  }

  async findByReview(reviewId: string) {
    return prisma.comment.findMany({
      where: { reviewId, parentId: null },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: USER_SELECT },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: USER_SELECT } },
        },
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateCommentDto) {
    const comment = await findOrThrow(
      prisma.comment.findUnique({ where: { id } }),
      'Comment not found',
    );
    assertOwnership(comment.userId, userId);

    return prisma.comment.update({
      where: { id },
      data: { content: dto.content },
      include: { user: { select: USER_SELECT } },
    });
  }

  async delete(id: string, userId: string, isAdmin: boolean) {
    const comment = await findOrThrow(
      prisma.comment.findUnique({ where: { id } }),
      'Comment not found',
    );
    assertOwnership(comment.userId, userId, isAdmin);
    await prisma.comment.delete({ where: { id } });
  }
}

export const commentService = new CommentService();
