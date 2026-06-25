import { Router } from 'express';
import { getRunsByUser, getRunStats, getLatestRun, createRun, getAIFeedback } from '../controllers/runController';

const router = Router();

router.get('/:userId/stats', getRunStats);
router.get('/:userId/latest', getLatestRun);
router.get('/:userId/ai-feedback', getAIFeedback);
router.get('/:userId', getRunsByUser);
router.post('/', createRun);

export default router;
