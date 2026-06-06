import { Router } from 'express';
import { getPublicStats } from './stats.controller.js';

const router = Router();

// GET /api/stats — PUBLIC, cached 5 min
router.get('/', getPublicStats);

export default router;
