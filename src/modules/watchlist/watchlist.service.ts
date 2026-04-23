import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';

export class WatchlistService {
  async getWatchlist(userId: string) {
    return prisma.watchlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        media: {
          select: {
            id: true,
            title: true,
            posterUrl: true,
            type: true,
            genre: true,
            releaseYear: true,
            pricing: true,
          },
        },
      },
    });
  }

  async toggle(userId: string, mediaId: string) {
    const media = await prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new AppError('Media not found', 404);

    const existing = await prisma.watchlist.findUnique({
      where: { userId_mediaId: { userId, mediaId } },
    });

    if (existing) {
      await prisma.watchlist.delete({ where: { id: existing.id } });
      return { added: false };
    }

    await prisma.watchlist.create({ data: { userId, mediaId } });
    return { added: true };
  }

  async remove(userId: string, mediaId: string) {
    const entry = await prisma.watchlist.findUnique({
      where: { userId_mediaId: { userId, mediaId } },
    });
    if (!entry) throw new AppError('Not in watchlist', 404);
    await prisma.watchlist.delete({ where: { id: entry.id } });
  }
}

export const watchlistService = new WatchlistService();
