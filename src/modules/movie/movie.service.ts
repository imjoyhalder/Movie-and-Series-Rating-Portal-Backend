import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { getPagination, buildMeta } from '../../utils/response';
import { CreateMediaDto, UpdateMediaDto, MediaFilterQuery } from './movie.interface';
import { Prisma } from '@prisma/client';

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
        ],
      }),
    };

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
        include: {
          _count: { select: { reviews: true } },
        },
      }),
      prisma.media.count({ where }),
    ]);

    return { data, meta: buildMeta(total, page, take) };
  }

  async findOne(id: string) {
    const media = await prisma.media.findUnique({
      where: { id, isPublished: true },
      include: {
        _count: { select: { reviews: true } },
        reviews: {
          where: { status: 'APPROVED' },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, avatar: true } },
            _count: { select: { likes: true, comments: true } },
          },
        },
      },
    });
    if (!media) throw new AppError('Media not found', 404);
    return media;
  }

  async update(id: string, dto: UpdateMediaDto) {
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) throw new AppError('Media not found', 404);
    return prisma.media.update({ where: { id }, data: dto });
  }

  async delete(id: string) {
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) throw new AppError('Media not found', 404);
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
