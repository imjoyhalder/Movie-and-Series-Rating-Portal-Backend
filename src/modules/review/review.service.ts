import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { getPagination, buildMeta } from '../../utils/response';
import { CreateReviewDto, UpdateReviewDto, ReviewFilterQuery } from './review.interface';
import { Prisma } from '@prisma/client';

export class ReviewService {
  async create(userId: string, dto: CreateReviewDto) {
    const media = await prisma.media.findUnique({ where: { id: dto.mediaId } });
    if (!media) throw new AppError('Media not found', 404);

    const existing = await prisma.review.findUnique({
      where: { userId_mediaId: { userId, mediaId: dto.mediaId } },
    });
    if (existing) throw new AppError('You have already reviewed this title', 409);

    return prisma.review.create({
      data: { ...dto, userId, status: 'PENDING' },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        media: { select: { id: true, title: true, posterUrl: true } },
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
          user: { select: { id: true, name: true, avatar: true } },
          media: { select: { id: true, title: true, posterUrl: true, type: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      prisma.review.count({ where }),
    ]);

    return { data, meta: buildMeta(total, page, take) };
  }

  async findOne(id: string) {
    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        media: { select: { id: true, title: true, posterUrl: true, type: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    if (!review) throw new AppError('Review not found', 404);
    return review;
  }

  async update(id: string, userId: string, dto: UpdateReviewDto) {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new AppError('Review not found', 404);
    if (review.userId !== userId) throw new AppError('Forbidden', 403);
    if (review.status === 'APPROVED') throw new AppError('Cannot edit an approved review', 400);

    return prisma.review.update({ where: { id }, data: dto });
  }

  async delete(id: string, userId: string, isAdmin: boolean) {
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) throw new AppError('Review not found', 404);
    if (!isAdmin && review.userId !== userId) throw new AppError('Forbidden', 403);
    if (!isAdmin && review.status === 'APPROVED') {
      throw new AppError('Cannot delete an approved review', 400);
    }
    await prisma.review.delete({ where: { id } });
  }

  async toggleLike(reviewId: string, userId: string) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new AppError('Review not found', 404);

    const existing = await prisma.reviewLike.findUnique({
      where: { reviewId_userId: { reviewId, userId } },
    });

    if (existing) {
      await prisma.reviewLike.delete({ where: { id: existing.id } });
      return { liked: false };
    }

    await prisma.reviewLike.create({ data: { reviewId, userId } });
    return { liked: true };
  }

  async getUserReviews(userId: string) {
    return prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        media: { select: { id: true, title: true, posterUrl: true, type: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
  }
}

export const reviewService = new ReviewService();
