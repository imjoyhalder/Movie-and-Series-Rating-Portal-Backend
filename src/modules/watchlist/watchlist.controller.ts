import { Request, Response, NextFunction } from 'express';
import { watchlistService } from './watchlist.service';
import { sendResponse } from '../../utils/response';

export class WatchlistController {
  async getWatchlist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const watchlist = await watchlistService.getWatchlist(req.user!.id);
      sendResponse(res, 200, 'Watchlist fetched', watchlist);
    } catch (error) {
      next(error);
    }
  }

  async toggle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await watchlistService.toggle(req.user!.id, req.body.mediaId);
      sendResponse(res, 200, result.added ? 'Added to watchlist' : 'Removed from watchlist', result);
    } catch (error) {
      next(error);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await watchlistService.remove(req.user!.id, String(req.params.mediaId));
      sendResponse(res, 200, 'Removed from watchlist');
    } catch (error) {
      next(error);
    }
  }
}

export const watchlistController = new WatchlistController();
