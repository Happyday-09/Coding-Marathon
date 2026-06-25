// ============================================
// Battle Controller — Friend Battles (Ghost Challenger Mode) (Supabase Integrated)
// ============================================

import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { Battle, ApiResponse } from '../types';

// Helper to map DB record to TypeScript Battle model
const mapDbBattleToModel = (b: any): Battle => {
  return {
    id: b.id,
    challengerId: b.challenger_id,
    challengerName: (b.challenger as any)?.nickname || '러너',
    opponentId: b.opponent_id,
    opponentName: (b.opponent as any)?.nickname || '러너',
    status: b.status as 'pending' | 'active' | 'done',
    targetDistance: Number(b.target_distance),
    targetDuration: b.target_duration,
    targetPace: Number(b.target_pace),
    opponentProgress: Number(b.opponent_progress),
    opponentDuration: b.opponent_duration || undefined,
    winnerId: b.winner_id || undefined,
    challengerRunId: b.challenger_run_id,
    opponentRunId: b.opponent_run_id || undefined,
    createdAt: b.created_at,
  };
};

// GET /api/battles/:userId
export const getBattlesByUser = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;

  try {
    const { data: battlesData, error } = await supabase
      .from('battles')
      .select(`
        *,
        challenger:profiles!challenger_id(nickname),
        opponent:profiles!opponent_id(nickname)
      `)
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({
        success: false,
        error: '대결 목록을 가져오는 중 오류가 발생했습니다.',
      } as ApiResponse<null>);
      return;
    }

    const battles: Battle[] = (battlesData || []).map(mapDbBattleToModel);

    res.status(200).json({
      success: true,
      data: battles,
    } as ApiResponse<Battle[]>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '서버 내부 오류가 발생했습니다.',
    } as ApiResponse<null>);
  }
};

// POST /api/battles
// Create challenge from challenger's completed run record
export const createBattle = async (req: Request, res: Response): Promise<void> => {
  const { challengerId, opponentId, challengerRunId } = req.body;

  if (!challengerId || !opponentId || !challengerRunId) {
    res.status(400).json({
      success: false,
      error: '필수 정보가 누락되었습니다.',
    } as ApiResponse<null>);
    return;
  }

  try {
    // 1. Fetch challenger's run info from DB
    const { data: run, error: runError } = await supabase
      .from('runs')
      .select('*')
      .eq('id', challengerRunId)
      .single();

    if (runError || !run) {
      res.status(404).json({
        success: false,
        error: '도전에 사용할 러닝 기록을 찾을 수 없습니다.',
      } as ApiResponse<null>);
      return;
    }

    const targetDistance = run.distance_m / 1000;
    const targetDuration = run.duration_sec;
    const targetPace = run.avg_pace_sec_per_km ? run.avg_pace_sec_per_km / 60 : 0;

    // 2. Insert new battle record
    const { data: insertedData, error: insertError } = await supabase
      .from('battles')
      .insert({
        challenger_id: challengerId,
        opponent_id: opponentId,
        challenger_run_id: challengerRunId,
        status: 'pending',
        target_distance: targetDistance,
        target_duration: targetDuration,
        target_pace: targetPace,
        opponent_progress: 0,
      })
      .select()
      .single();

    if (insertError || !insertedData) {
      res.status(500).json({
        success: false,
        error: `대결 생성에 실패했습니다: ${insertError?.message}`,
      } as ApiResponse<null>);
      return;
    }

    // 3. Select complete record with profiles nickname
    const { data: fullBattle, error: selectError } = await supabase
      .from('battles')
      .select(`
        *,
        challenger:profiles!challenger_id(nickname),
        opponent:profiles!opponent_id(nickname)
      `)
      .eq('id', insertedData.id)
      .single();

    if (selectError || !fullBattle) {
      res.status(500).json({
        success: false,
        error: '대결 생성 후 정보를 불러오지 못했습니다.',
      } as ApiResponse<null>);
      return;
    }

    res.status(201).json({
      success: true,
      data: mapDbBattleToModel(fullBattle),
      message: '기록 도전장을 보냈습니다! ⚔️',
    } as ApiResponse<Battle>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '서버 내부 오류가 발생했습니다.',
    } as ApiResponse<null>);
  }
};

// PATCH /api/battles/:id/accept
export const acceptBattle = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // 1. Fetch current status
    const { data: current, error: getError } = await supabase
      .from('battles')
      .select('status')
      .eq('id', id)
      .single();

    if (getError || !current) {
      res.status(404).json({
        success: false,
        error: '대결을 찾을 수 없습니다.',
      } as ApiResponse<null>);
      return;
    }

    if (current.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: '이미 진행 중이거나 완료된 대결입니다.',
      } as ApiResponse<null>);
      return;
    }

    // 2. Update status to active
    const { data: updatedBattle, error: updateError } = await supabase
      .from('battles')
      .update({ status: 'active' })
      .eq('id', id)
      .select(`
        *,
        challenger:profiles!challenger_id(nickname),
        opponent:profiles!opponent_id(nickname)
      `)
      .single();

    if (updateError || !updatedBattle) {
      res.status(500).json({
        success: false,
        error: '도전 상태를 변경하지 못했습니다.',
      } as ApiResponse<null>);
      return;
    }

    res.status(200).json({
      success: true,
      data: mapDbBattleToModel(updatedBattle),
      message: '도전을 수락했습니다! 고스트를 향해 달리세요! 🔥',
    } as ApiResponse<Battle>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '서버 내부 오류가 발생했습니다.',
    } as ApiResponse<null>);
  }
};

// PATCH /api/battles/:id/complete
// Complete opponent's run for battle, determine winner
export const completeBattle = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { opponentRunId } = req.body;

  if (!opponentRunId) {
    res.status(400).json({
      success: false,
      error: '도전 완료 정보(러닝 기록 ID)가 누락되었습니다.',
    } as ApiResponse<null>);
    return;
  }

  try {
    // 1. Fetch battle info
    const { data: battle, error: battleError } = await supabase
      .from('battles')
      .select('*')
      .eq('id', id)
      .single();

    if (battleError || !battle) {
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

    // 2. Fetch opponent's run info
    const { data: run, error: runError } = await supabase
      .from('runs')
      .select('*')
      .eq('id', opponentRunId)
      .single();

    if (runError || !run) {
      res.status(404).json({
        success: false,
        error: '도전 러닝 기록을 찾을 수 없습니다.',
      } as ApiResponse<null>);
      return;
    }

    const opponentProgress = run.distance_m / 1000;
    const opponentDuration = run.duration_sec;

    // Opponent wins if opponent duration is less than or equal to challenger target duration
    const winnerId = opponentDuration <= battle.target_duration
      ? battle.opponent_id // Defender (opponent) wins
      : battle.challenger_id; // Challenger wins

    // 3. Update battle record
    const { data: updatedBattle, error: updateError } = await supabase
      .from('battles')
      .update({
        status: 'done',
        opponent_run_id: opponentRunId,
        opponent_progress: opponentProgress,
        opponent_duration: opponentDuration,
        winner_id: winnerId,
      })
      .eq('id', id)
      .select(`
        *,
        challenger:profiles!challenger_id(nickname),
        opponent:profiles!opponent_id(nickname)
      `)
      .single();

    if (updateError || !updatedBattle) {
      res.status(500).json({
        success: false,
        error: '대결 결과 저장에 실패했습니다.',
      } as ApiResponse<null>);
      return;
    }

    const defenderWon = winnerId === battle.opponent_id;
    const diffSec = Math.abs(opponentDuration - battle.target_duration);
    const diffMin = Math.floor(diffSec / 60);
    const diffS = diffSec % 60;
    const diffText = diffMin > 0 ? `${diffMin}분 ${diffS}초` : `${diffS}초`;

    const message = defenderWon
      ? `🎉 축하합니다! 친구의 기록보다 ${diffText} 단축하여 도전에서 승리했습니다! 🏆`
      : `아쉽네요! 친구의 기록보다 ${diffText} 초과했습니다. 다음 기회에 다시 도전해 보세요! 💪`;

    res.status(200).json({
      success: true,
      data: mapDbBattleToModel(updatedBattle),
      message,
    } as ApiResponse<Battle>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '서버 내부 오류가 발생했습니다.',
    } as ApiResponse<null>);
  }
};

