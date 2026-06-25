// ============================================
// Battle Controller — Friend Battles (Ghost Challenger Mode)
// ============================================

import { Request, Response } from 'express';
import { dummyBattles, dummyUsers, dummyRuns } from '../data/dummyData';
import { Battle, ApiResponse } from '../types';

// GET /api/battles/:userId
export const getBattlesByUser = (req: Request, res: Response): void => {
  const { userId } = req.params;
  const userBattles = dummyBattles
    .filter((b) => b.challengerId === userId || b.opponentId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.status(200).json({
    success: true,
    data: userBattles,
  } as ApiResponse<Battle[]>);
};

// POST /api/battles
// Create challenge from challenger's completed run record
export const createBattle = (req: Request, res: Response): void => {
  const { challengerId, opponentId, challengerRunId } = req.body;

  if (!challengerId || !opponentId || !challengerRunId) {
    res.status(400).json({
      success: false,
      error: '필수 정보가 누락되었습니다.',
    } as ApiResponse<null>);
    return;
  }

  const challenger = dummyUsers.find((u) => u.id === challengerId);
  const opponent = dummyUsers.find((u) => u.id === opponentId);
  const challengerRun = dummyRuns.find((r) => r.id === challengerRunId);

  if (!challenger || !opponent) {
    res.status(404).json({
      success: false,
      error: '유저를 찾을 수 없습니다.',
    } as ApiResponse<null>);
    return;
  }

  if (!challengerRun) {
    res.status(404).json({
      success: false,
      error: '도전에 사용할 러닝 기록을 찾을 수 없습니다.',
    } as ApiResponse<null>);
    return;
  }

  const newBattle: Battle = {
    id: `battle-${Date.now()}`,
    challengerId,
    challengerName: challenger.nickname,
    opponentId,
    opponentName: opponent.nickname,
    status: 'pending',
    targetDistance: challengerRun.distance,
    targetDuration: challengerRun.duration,
    targetPace: challengerRun.pace,
    opponentProgress: 0,
    challengerRunId,
    createdAt: new Date().toISOString(),
  };

  dummyBattles.push(newBattle);

  res.status(201).json({
    success: true,
    data: newBattle,
    message: '기록 도전장을 보냈습니다! ⚔️',
  } as ApiResponse<Battle>);
};

// PATCH /api/battles/:id/accept
export const acceptBattle = (req: Request, res: Response): void => {
  const { id } = req.params;
  const battle = dummyBattles.find((b) => b.id === id);

  if (!battle) {
    res.status(404).json({
      success: false,
      error: '대결을 찾을 수 없습니다.',
    } as ApiResponse<null>);
    return;
  }

  if (battle.status !== 'pending') {
    res.status(400).json({
      success: false,
      error: '이미 진행 중이거나 완료된 대결입니다.',
    } as ApiResponse<null>);
    return;
  }

  battle.status = 'active';

  res.status(200).json({
    success: true,
    data: battle,
    message: '도전을 수락했습니다! 고스트를 향해 달리세요! 🔥',
  } as ApiResponse<Battle>);
};

// PATCH /api/battles/:id/complete
// Complete opponent's run for battle, determine winner
export const completeBattle = (req: Request, res: Response): void => {
  const { id } = req.params;
  const { opponentRunId } = req.body;

  if (!opponentRunId) {
    res.status(400).json({
      success: false,
      error: '도전 완료 정보(러닝 기록 ID)가 누락되었습니다.',
    } as ApiResponse<null>);
    return;
  }

  const battle = dummyBattles.find((b) => b.id === id);
  if (!battle) {
    res.status(404).json({
      success: false,
      error: '대결을 찾을 수 없습니다.',
    } as ApiResponse<null>);
    return;
  }

  if (battle.status !== 'active') {
    res.status(400).json({
      success: false,
      error: '진행 중인 대결만 완료할 수 있습니다.',
    } as ApiResponse<null>);
    return;
  }

  const opponentRun = dummyRuns.find((r) => r.id === opponentRunId);
  if (!opponentRun) {
    res.status(404).json({
      success: false,
      error: '도전 러닝 기록을 찾을 수 없습니다.',
    } as ApiResponse<null>);
    return;
  }

  battle.opponentRunId = opponentRunId;
  battle.opponentProgress = opponentRun.distance;
  battle.opponentDuration = opponentRun.duration;
  battle.status = 'done';

  // Opponent wins if opponent duration is less than or equal to challenger target duration
  if (battle.opponentDuration <= battle.targetDuration) {
    battle.winnerId = battle.opponentId; // Defender wins
  } else {
    battle.winnerId = battle.challengerId; // Challenger wins
  }

  const defenderWon = battle.winnerId === battle.opponentId;
  const diffSec = Math.abs(battle.opponentDuration - battle.targetDuration);
  const diffMin = Math.floor(diffSec / 60);
  const diffS = diffSec % 60;
  const diffText = diffMin > 0 ? `${diffMin}분 ${diffS}초` : `${diffS}초`;

  const message = defenderWon
    ? `🎉 축하합니다! 친구의 기록보다 ${diffText} 단축하여 도전에서 승리했습니다! 🏆`
    : `아쉽네요! 친구의 기록보다 ${diffText} 초과했습니다. 다음 기회에 다시 도전해 보세요! 💪`;

  res.status(200).json({
    success: true,
    data: battle,
    message,
  } as ApiResponse<Battle>);
};

