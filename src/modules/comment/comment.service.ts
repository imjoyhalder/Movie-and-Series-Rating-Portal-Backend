import { prisma } from '../../config/database.js';
import { findOrThrow, assertOwnership } from '../../utils/db.js';
import { CreateCommentDto, UpdateCommentDto } from './comment.interface.js';
import { AppError } from '../../utils/AppError.js';

const USER_SELECT = { id: true, name: true, image: true } as const;

export class CommentService {
  async create(userId: string, dto: CreateCommentDto) {
    // Load review together with its media pricing so we can gate premium content
    const review = await findOrThrow(
      prisma.review.findUnique({
        where: { id: dto.reviewId },
        include: { media: { select: { pricing: true } } },
      }),
      'Review not found',
    );

    if (dto.parentId) {
      await findOrThrow(
        prisma.comment.findUnique({ where: { id: dto.parentId } }),
        'Parent comment not found',
      );
    }

    // Comments on premium content require an active paid subscription
    if (review.media?.pricing === 'premium') {
      const subscription = await prisma.subscription.findUnique({ where: { userId } });
      const hasPaidPlan =
        subscription?.status === 'ACTIVE' && subscription.plan !== 'FREE';

      if (!hasPaidPlan) {
        throw new AppError(
          'An active Pro or Annual subscription is required to comment on premium content.',
          403,
        );
      }
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

  async toggleLike(commentId: string, userId: string, isAdmin: boolean) {
    await findOrThrow(prisma.comment.findUnique({ where: { id: commentId } }), 'Comment not found');

    // Admins bypass subscription requirement
    if (!isAdmin) {
      const subscription = await prisma.subscription.findUnique({ where: { userId } });
      const hasPaidPlan =
        subscription?.status === 'ACTIVE' && subscription.plan !== 'FREE';

      if (!hasPaidPlan) {
        throw new AppError(
          'An active Pro or Annual subscription is required to like comments.',
          403,
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      const existing = await tx.commentLike.findUnique({
        where: { commentId_userId: { commentId, userId } },
      });

      if (existing) {
        await tx.commentLike.delete({ where: { id: existing.id } });
        return { liked: false };
      }

      await tx.commentLike.create({ data: { commentId, userId } });
      return { liked: true };
    });
  }
}

export const commentService = new CommentService();
