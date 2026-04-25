import { Router } from 'express';
import { watchlistController } from './watchlist.controller.js';
import { authenticate, requireVerified } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { toggleWatchlistSchema } from './watchlist.validation.js';

const router = Router();

router.use(authenticate, requireVerified);

router.get('/', watchlistController.getWatchlist.bind(watchlistController));
router.post('/toggle', validate(toggleWatchlistSchema), watchlistController.toggle.bind(watchlistController));
router.delete('/:mediaId', watchlistController.remove.bind(watchlistController));

export default router;
