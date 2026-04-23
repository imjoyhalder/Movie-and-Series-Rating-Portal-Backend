import { prisma } from '../../config/database';
import { findOrThrow } from '../../utils/db';

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
    await findOrThrow(
      prisma.media.findUnique({ where: { id: mediaId } }),
      'Media not found',
    );

    // Transaction prevents a duplicate insert if two requests arrive simultaneously
    return prisma.$transaction(async (tx) => {
      const existing = await tx.watchlist.findUnique({
        where: { userId_mediaId: { userId, mediaId } },
      });

      if (existing) {
        await tx.watchlist.delete({ where: { id: existing.id } });
        return { added: false };
      }

      await tx.watchlist.create({ data: { userId, mediaId } });
      return { added: true };
    });
  }

  async remove(userId: string, mediaId: string) {
    const entry = await findOrThrow(
      prisma.watchlist.findUnique({ where: { userId_mediaId: { userId, mediaId } } }),
      'Not in watchlist',
    );
    await prisma.watchlist.delete({ where: { id: entry.id } });
  }
}

export const watchlistService = new WatchlistService();
