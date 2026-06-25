import { Router } from 'express';
import { getRunsByUser, getRunStats, getLatestRun, createRun } from '../controllers/runController';

const router = Router();

router.get('/:userId', getRunsByUser);
router.get('/:userId/stats', getRunStats);
router.get('/:userId/latest', getLatestRun);
router.post('/', createRun);

export default router;
