import { Router } from 'express';
import { watchlistController } from './watchlist.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { toggleWatchlistSchema } from './watchlist.validation';

const router = Router();

router.use(authenticate);

router.get('/', watchlistController.getWatchlist.bind(watchlistController));
router.post('/toggle', validate(toggleWatchlistSchema), watchlistController.toggle.bind(watchlistController));
router.delete('/:mediaId', watchlistController.remove.bind(watchlistController));

export default router;
