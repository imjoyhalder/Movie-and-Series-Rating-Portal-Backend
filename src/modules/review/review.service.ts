import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { getPagination, buildMeta } from '../../utils/response.js';
import { findOrThrow, assertOwnership } from '../../utils/db.js';
import { CreateReviewDto, UpdateReviewDto, ReviewFilterQuery } from './review.interface.js';
import { AppError } from '../../utils/AppError.js';

const USER_SELECT = { id: true, name: true, image: true } as const;
const MEDIA_SELECT = { id: true, title: true, posterUrl: true, type: true } as const;

export class ReviewService {
  async create(userId: string, dto: CreateReviewDto) {
    await findOrThrow(
      prisma.media.findUnique({ where: { id: dto.mediaId } }),
      'Media not found',
    );

    const existing = await prisma.review.findUnique({
      where: { userId_mediaId: { userId, mediaId: dto.mediaId } },
    });
    if (existing) throw new AppError('You have already reviewed this title', 409);

    return prisma.review.create({
      data: { ...dto, userId, status: 'PENDING' },
      include: {
        user: { select: USER_SELECT },
        media: { select: MEDIA_SELECT },
      },
    });
  }

  async findAll(query: ReviewFilterQuery) {
    const { skip, take, page } = getPagination(query.page, query.limit);

    const where: Prisma.ReviewWhereInput = {
      ...(query.status ? { status: query.status } : { status: 'APPROVED' }),
      ...(query.mediaId && { mediaId: query.mediaId }),
      ...(query.userId && { userId: query.userId }),
    };

    const orderBy: Prisma.ReviewOrderByWithRelationInput =
      query.sortBy === 'topRated'
        ? { rating: 'desc' }
        : query.sortBy === 'mostLiked'
          ? { likes: { _count: 'desc' } }
          : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          user: { select: USER_SELECT },
          media: { select: MEDIA_SELECT },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return { data, meta: buildMeta(total, page, take) };
  }

  async findOne(id: string) {
    return findOrThrow(
      prisma.review.findUnique({
        where: { id },
        include: {
          user: { select: USER_SELECT },
          media: { select: MEDIA_SELECT },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      'Review not found',
    );
  }

  async update(id: string, userId: string, dto: UpdateReviewDto) {
    const review = await findOrThrow(
      prisma.review.findUnique({ where: { id } }),
      'Review not found',
    );
    assertOwnership(review.userId, userId);
    if (review.status === 'APPROVED') throw new AppError('Cannot edit an approved review', 400);

    return prisma.review.update({ where: { id }, data: dto });
  }

  async delete(id: string, userId: string, isAdmin: boolean) {
    const review = await findOrThrow(
      prisma.review.findUnique({ where: { id } }),
      'Review not found',
    );
    assertOwnership(review.userId, userId, isAdmin);
    if (!isAdmin && review.status === 'APPROVED') {
      throw new AppError('Cannot delete an approved review', 400);
    }
    await prisma.review.delete({ where: { id } });
  }

  async toggleLike(reviewId: string, userId: string) {
    await findOrThrow(prisma.review.findUnique({ where: { id: reviewId } }), 'Review not found');

    // Transaction prevents race conditions where two requests toggle simultaneously
    return prisma.$transaction(async (tx) => {
      const existing = await tx.reviewLike.findUnique({
        where: { reviewId_userId: { reviewId, userId } },
      });

      if (existing) {
        await tx.reviewLike.delete({ where: { id: existing.id } });
        return { liked: false };
      }

      await tx.reviewLike.create({ data: { reviewId, userId } });
      return { liked: true };
    });
  }

  async getUserReviews(userId: string) {
    return prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        media: { select: MEDIA_SELECT },
        _count: { select: { likes: true, comments: true } },
      },
    });
  }
}

export const reviewService = new ReviewService();
