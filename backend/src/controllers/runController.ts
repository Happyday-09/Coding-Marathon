// ============================================
// Run Controller — Running Records CRUD + Stats (Supabase Integrated)
// ============================================

import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { Run, RunStats, ApiResponse, RoutePoint } from '../types';

const coordsToLineStringWKT = (coords: RoutePoint[]): string => {
  if (!coords || coords.length < 2) return '';
  return `SRID=4326;LINESTRING(${coords.map((c) => `${c.longitude} ${c.latitude}`).join(', ')})`;
};

// GET /api/runs/:userId
export const getRunsByUser = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;

  try {
    const { data: runsData, error } = await supabase
      .from('runs')
      .select('*, run_points(lng, lat, seq)')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (error) {
      res.status(500).json({
        success: false,
        error: '러닝 기록을 가져오는 중 오류가 발생했습니다.',
      } as ApiResponse<null>);
      return;
    }

    const runs: Run[] = (runsData || []).map((r) => {
      const routePoints = (r.run_points || [])
        .sort((a: any, b: any) => a.seq - b.seq)
        .map((p: any) => ({
          latitude: p.lat,
          longitude: p.lng,
        }));

      const km = r.distance_m / 1000;
      const paceMinKm = r.avg_pace_sec_per_km ? r.avg_pace_sec_per_km / 60 : 0;

      return {
        id: r.id,
        userId: r.user_id,
        distance: Math.round(km * 100) / 100,
        duration: r.duration_sec,
        pace: Math.round(paceMinKm * 100) / 100,
        calories: Math.round(km * 70),
        route: routePoints,
        createdAt: r.ended_at || r.started_at || r.created_at,
      };
    });

    res.status(200).json({
      success: true,
      data: runs,
    } as ApiResponse<Run[]>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '서버 내부 오류가 발생했습니다.',
    } as ApiResponse<null>);
  }
};

// GET /api/runs/:userId/stats
export const getRunStats = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;

  try {
    const { data: runs, error } = await supabase
      .from('runs')
      .select('distance_m, duration_sec, avg_pace_sec_per_km, started_at')
      .eq('user_id', userId);

    if (error) {
      res.status(500).json({
        success: false,
        error: '통계 정보를 불러오지 못했습니다.',
      } as ApiResponse<null>);
      return;
    }

    if (!runs || runs.length === 0) {
      res.status(200).json({
        success: true,
        data: {
          totalDistance: 0,
          totalDuration: 0,
          totalCalories: 0,
          totalRuns: 0,
          averagePace: 0,
          weeklyDistance: 0,
        },
      } as ApiResponse<RunStats>);
      return;
    }

    const totalRuns = runs.length;
    const totalDistanceKm = runs.reduce((sum, r) => sum + (r.distance_m / 1000), 0);
    const totalDuration = runs.reduce((sum, r) => sum + r.duration_sec, 0);
    const totalCalories = Math.round(totalDistanceKm * 70);

    const validPaceRuns = runs.filter((r) => r.avg_pace_sec_per_km && r.avg_pace_sec_per_km > 0);
    const averagePaceMinKm = validPaceRuns.length > 0
      ? validPaceRuns.reduce((sum, r) => sum + (r.avg_pace_sec_per_km! / 60), 0) / validPaceRuns.length
      : 0;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weeklyDistanceKm = runs
      .filter((r) => new Date(r.started_at) >= oneWeekAgo)
      .reduce((sum, r) => sum + (r.distance_m / 1000), 0);

    res.status(200).json({
      success: true,
      data: {
        totalDistance: Math.round(totalDistanceKm * 100) / 100,
        totalDuration,
        totalCalories,
        totalRuns,
        averagePace: Math.round(averagePaceMinKm * 100) / 100,
        weeklyDistance: Math.round(weeklyDistanceKm * 100) / 100,
      },
    } as ApiResponse<RunStats>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '서버 내부 오류가 발생했습니다.',
    } as ApiResponse<null>);
  }
};

// POST /api/runs
export const createRun = async (req: Request, res: Response): Promise<void> => {
  const { userId, distance, duration, pace, calories, route } = req.body;

  if (!userId || distance === undefined || duration === undefined) {
    res.status(400).json({
      success: false,
      error: '필수 정보가 누락되었습니다.',
    } as ApiResponse<null>);
    return;
  }

  try {
    const distanceM = Math.round(distance * 1000);
    const avgPaceSec = pace ? Math.round(pace * 60) : Math.round((duration / distance) * 60);
    const routeWKT = route && route.length >= 2 ? coordsToLineStringWKT(route) : null;
    const endedAt = new Date();
    const startedAt = new Date(endedAt.getTime() - duration * 1000);

    const { data: runData, error: runError } = await supabase
      .from('runs')
      .insert({
        user_id: userId,
        distance_m: distanceM,
        duration_sec: duration,
        avg_pace_sec_per_km: avgPaceSec,
        route: routeWKT || null,
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        visibility: 'private',
      })
      .select()
      .single();

    if (runError || !runData) {
      res.status(500).json({
        success: false,
        error: `기록 저장에 실패했습니다: ${runError?.message}`,
      } as ApiResponse<null>);
      return;
    }

    const newRunId = runData.id;

    // Save run points if coordinates are provided
    if (route && route.length > 0) {
      const pointsData = route.map((coord: RoutePoint, idx: number) => ({
        run_id: newRunId,
        seq: idx,
        lng: coord.longitude,
        lat: coord.latitude,
      }));

      const { error: pointsError } = await supabase.from('run_points').insert(pointsData);
      if (pointsError) {
        console.error('Failed to insert run points:', pointsError.message);
      }
    }

    const finalKm = runData.distance_m / 1000;
    const finalPaceMin = runData.avg_pace_sec_per_km ? runData.avg_pace_sec_per_km / 60 : 0;

    const savedRun: Run = {
      id: runData.id,
      userId: runData.user_id,
      distance: Math.round(finalKm * 100) / 100,
      duration: runData.duration_sec,
      pace: Math.round(finalPaceMin * 100) / 100,
      calories: calories || Math.round(finalKm * 70),
      route: route || [],
      createdAt: runData.ended_at || runData.started_at,
    };

    res.status(201).json({
      success: true,
      data: savedRun,
      message: '러닝 기록이 저장되었습니다!',
    } as ApiResponse<Run>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '서버 내부 오류가 발생했습니다.',
    } as ApiResponse<null>);
  }
};

// GET /api/runs/:userId/latest
export const getLatestRun = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;

  try {
    const { data: runsData, error } = await supabase
      .from('runs')
      .select('*, run_points(lng, lat, seq)')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(1);

    if (error) {
      res.status(500).json({
        success: false,
        error: '최근 러닝 기록을 가져오는 중 오류가 발생했습니다.',
      } as ApiResponse<null>);
      return;
    }

    if (!runsData || runsData.length === 0) {
      res.status(200).json({
        success: true,
        data: null,
        message: '아직 러닝 기록이 없습니다.',
      } as ApiResponse<null>);
      return;
    }

    const r = runsData[0];
    const routePoints = (r.run_points || [])
      .sort((a: any, b: any) => a.seq - b.seq)
      .map((p: any) => ({
        latitude: p.lat,
        longitude: p.lng,
      }));

    const km = r.distance_m / 1000;
    const paceMinKm = r.avg_pace_sec_per_km ? r.avg_pace_sec_per_km / 60 : 0;

    const run: Run = {
      id: r.id,
      userId: r.user_id,
      distance: Math.round(km * 100) / 100,
      duration: r.duration_sec,
      pace: Math.round(paceMinKm * 100) / 100,
      calories: Math.round(km * 70),
      route: routePoints,
      createdAt: r.ended_at || r.started_at || r.created_at,
    };

    res.status(200).json({
      success: true,
      data: run,
    } as ApiResponse<Run>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '서버 내부 오류가 발생했습니다.',
    } as ApiResponse<null>);
  }
};

