import { Router } from 'express';
import { getBattlesByUser, createBattle, acceptBattle, completeBattle } from '../controllers/battleController';

const router = Router();

router.get('/:userId', getBattlesByUser);
router.post('/', createBattle);
router.patch('/:id/accept', acceptBattle);
router.patch('/:id/complete', completeBattle);

export default router;
