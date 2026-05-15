import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { getPagination, buildMeta } from '../../utils/response.js';
import { findOrThrow } from '../../utils/db.js';
import { CreateMediaDto, UpdateMediaDto, MediaFilterQuery } from './movie.interface.js';

const REVIEW_USER_SELECT = { id: true, name: true, image: true } as const;

export class MovieService {
  async create(dto: CreateMediaDto) {
    return prisma.media.create({ data: dto });
  }

  async findAll(query: MediaFilterQuery) {
    const { skip, take, page } = getPagination(query.page, query.limit);

    const where: Prisma.MediaWhereInput = {
      isPublished: true,
      ...(query.type && { type: query.type }),
      ...(query.genre && { genre: { has: query.genre } }),
      ...(query.releaseYear && { releaseYear: query.releaseYear }),
      ...(query.streamingPlatform && { streamingPlatforms: { has: query.streamingPlatform } }),
      ...(query.pricing && { pricing: query.pricing }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { director: { contains: query.search, mode: 'insensitive' } },
          { synopsis: { contains: query.search, mode: 'insensitive' } },
          { cast: { has: query.search } },
        ],
      }),
    };

    // Use two-step server-side aggregation when we need avg-rating data:
    // topRated sort, or minRating/maxRating filters — Prisma can't do these natively.
    const needsRatingStep =
      query.sortBy === 'topRated' ||
      query.minRating !== undefined ||
      query.maxRating !== undefined;

    if (needsRatingStep) {
      const allMedia = await prisma.media.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          reviews: { where: { status: 'APPROVED' }, select: { rating: true } },
        },
      });

      let ranked = allMedia.map((m) => ({
        id: m.id,
        createdAt: m.createdAt,
        reviewCount: m.reviews.length,
        avg: m.reviews.length
          ? m.reviews.reduce((s, r) => s + r.rating, 0) / m.reviews.length
          : 0,
      }));

      // Apply rating range filter
      if (query.minRating !== undefined) ranked = ranked.filter((m) => m.avg >= query.minRating!);
      if (query.maxRating !== undefined) ranked = ranked.filter((m) => m.avg <= query.maxRating!);

      // Sort
      if (query.sortBy === 'topRated') {
        ranked.sort((a, b) => b.avg - a.avg);
      } else if (query.sortBy === 'mostReviewed') {
        ranked.sort((a, b) => b.reviewCount - a.reviewCount);
      } else {
        ranked.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }

      const filteredTotal = ranked.length;
      const pageIds = ranked.slice(skip, skip + take).map((m) => m.id);

      const rows = await prisma.media.findMany({
        where: { id: { in: pageIds } },
        include: { _count: { select: { reviews: true } } },
      });

      const data = pageIds.map((id) => rows.find((r) => r.id === id)!).filter(Boolean);
      return { data, meta: buildMeta(filteredTotal, page, take) };
    }

    const orderBy: Prisma.MediaOrderByWithRelationInput =
      query.sortBy === 'mostReviewed'
        ? { reviews: { _count: 'desc' } }
        : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { _count: { select: { reviews: true } } },
      }),
      prisma.media.count({ where }),
    ]);

    return { data, meta: buildMeta(total, page, take) };
  }

  async findOne(id: string) {
    return findOrThrow(
      prisma.media.findUnique({
        where: { id, isPublished: true },
        include: {
          _count: { select: { reviews: true } },
          reviews: {
            where: { status: 'APPROVED' },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
              user: { select: REVIEW_USER_SELECT },
              _count: { select: { likes: true, comments: true } },
            },
          },
        },
      }),
      'Media not found',
    );
  }

  async update(id: string, dto: UpdateMediaDto) {
    await findOrThrow(prisma.media.findUnique({ where: { id } }), 'Media not found');
    return prisma.media.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    await findOrThrow(prisma.media.findUnique({ where: { id } }), 'Media not found');
    await prisma.media.delete({ where: { id } });
  }

  async getFeatured() {
    const [topRated, newlyAdded] = await Promise.all([
      prisma.media.findMany({
        where: { isPublished: true },
        take: 6,
        orderBy: { reviews: { _count: 'desc' } },
        include: { _count: { select: { reviews: true } } },
      }),
      prisma.media.findMany({
        where: { isPublished: true },
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { reviews: true } } },
      }),
    ]);
    return { topRated, newlyAdded };
  }
}

export const movieService = new MovieService();
