// ============================================
// 🏃 Running App — API Service
// ============================================

import axios from 'axios';
import { User, Run, RunStats, Course, Battle } from '../types';

// Change this to your backend URL
const API_BASE = 'http://192.168.25.105:3000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Auth ────────────────────────────────────
export const authService = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (email: string, password: string, nickname: string, level: string) => {
    const res = await api.post('/auth/register', { email, password, nickname, level });
    return res.data;
  },
  getUsers: async () => {
    const res = await api.get('/auth/users');
    return res.data;
  },
};

// ── Runs ────────────────────────────────────
export const runService = {
  getByUser: async (userId: string): Promise<{ success: boolean; data: Run[] }> => {
    const res = await api.get(`/runs/${userId}`);
    return res.data;
  },
  getStats: async (userId: string): Promise<{ success: boolean; data: RunStats }> => {
    const res = await api.get(`/runs/${userId}/stats`);
    return res.data;
  },
  getLatest: async (userId: string): Promise<{ success: boolean; data: Run | null }> => {
    const res = await api.get(`/runs/${userId}/latest`);
    return res.data;
  },
  create: async (runData: Partial<Run>) => {
    const res = await api.post('/runs', runData);
    return res.data;
  },
  getAIFeedback: async (userId: string): Promise<{ success: boolean; data: { feedback: any; stats: any } }> => {
    const res = await api.get(`/runs/${userId}/ai-feedback`);
    return res.data;
  },
};

// ── Courses ─────────────────────────────────
export const courseService = {
  getAll: async (): Promise<{ success: boolean; data: Course[] }> => {
    const res = await api.get('/courses');
    return res.data;
  },
  getById: async (id: string): Promise<{ success: boolean; data: Course }> => {
    const res = await api.get(`/courses/${id}`);
    return res.data;
  },
  recommend: async (
    level: string,
    preferredDistance?: number,
    options?: {
      routeStyle?: 'one_way' | 'round_trip';
      radiusKm?: number;
      province?: string; // e.g. '서울특별시', '경기도', '전라남도', '전체'
    }
  ) => {
    const res = await api.post('/courses/recommend', {
      level,
      preferredDistance,
      ...options,
    });
    return res.data;
  },
};

// ── Battles ─────────────────────────────────
export const battleService = {
  getByUser: async (userId: string): Promise<{ success: boolean; data: Battle[] }> => {
    const res = await api.get(`/battles/${userId}`);
    return res.data;
  },
  create: async (challengerId: string, opponentId: string, challengerRunId: string) => {
    const res = await api.post('/battles', { challengerId, opponentId, challengerRunId });
    return res.data;
  },
  accept: async (battleId: string) => {
    const res = await api.patch(`/battles/${battleId}/accept`);
    return res.data;
  },
  complete: async (battleId: string, opponentRunId: string) => {
    const res = await api.patch(`/battles/${battleId}/complete`, { opponentRunId });
    return res.data;
  },
};

export default api;
