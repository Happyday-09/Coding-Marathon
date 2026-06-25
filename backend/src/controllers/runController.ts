// ============================================
// Run Controller — Running Records CRUD + Stats
// ============================================

import { Request, Response } from 'express';
import { dummyRuns } from '../data/dummyData';
import { Run, RunStats, ApiResponse } from '../types';

// GET /api/runs/:userId
export const getRunsByUser = (req: Request, res: Response): void => {
  const { userId } = req.params;
  const userRuns = dummyRuns
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.status(200).json({
    success: true,
    data: userRuns,
  } as ApiResponse<Run[]>);
};

// GET /api/runs/:userId/stats
export const getRunStats = (req: Request, res: Response): void => {
  const { userId } = req.params;
  const userRuns = dummyRuns.filter((r) => r.userId === userId);

  if (userRuns.length === 0) {
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

  const totalDistance = userRuns.reduce((sum, r) => sum + r.distance, 0);
  const totalDuration = userRuns.reduce((sum, r) => sum + r.duration, 0);
  const totalCalories = userRuns.reduce((sum, r) => sum + r.calories, 0);
  const averagePace = userRuns.reduce((sum, r) => sum + r.pace, 0) / userRuns.length;

  // Weekly distance: runs from last 7 days
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weeklyDistance = userRuns
    .filter((r) => new Date(r.createdAt) >= oneWeekAgo)
    .reduce((sum, r) => sum + r.distance, 0);

  res.status(200).json({
    success: true,
    data: {
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalDuration,
      totalCalories,
      totalRuns: userRuns.length,
      averagePace: Math.round(averagePace * 100) / 100,
      weeklyDistance: Math.round(weeklyDistance * 100) / 100,
    },
  } as ApiResponse<RunStats>);
};

// POST /api/runs
export const createRun = (req: Request, res: Response): void => {
  const { userId, distance, duration, pace, calories, route } = req.body;

  if (!userId || !distance || !duration) {
    res.status(400).json({
      success: false,
      error: '필수 정보가 누락되었습니다.',
    } as ApiResponse<null>);
    return;
  }

  const newRun: Run = {
    id: `run-${Date.now()}`,
    userId,
    distance,
    duration,
    pace: pace || distance / (duration / 60),
    calories: calories || Math.round(distance * 70),
    route: route || [],
    createdAt: new Date().toISOString(),
  };

  dummyRuns.push(newRun);

  res.status(201).json({
    success: true,
    data: newRun,
    message: '러닝 기록이 저장되었습니다!',
  } as ApiResponse<Run>);
};

// GET /api/runs/:userId/latest
export const getLatestRun = (req: Request, res: Response): void => {
  const { userId } = req.params;
  const userRuns = dummyRuns
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (userRuns.length === 0) {
    res.status(200).json({
      success: true,
      data: null,
      message: '아직 러닝 기록이 없습니다.',
    } as ApiResponse<null>);
    return;
  }

  res.status(200).json({
    success: true,
    data: userRuns[0],
  } as ApiResponse<Run>);
};
