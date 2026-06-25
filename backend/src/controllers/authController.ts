// ============================================
// Auth Controller — Dummy Login/Register
// ============================================

import { Request, Response } from 'express';
import { dummyUsers } from '../data/dummyData';
import { User, ApiResponse } from '../types';

// POST /api/auth/login
export const login = (req: Request, res: Response): void => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({
      success: false,
      error: '이메일을 입력해주세요.',
    } as ApiResponse<null>);
    return;
  }

  const user = dummyUsers.find((u) => u.email === email);

  if (!user) {
    res.status(401).json({
      success: false,
      error: '등록되지 않은 이메일입니다.',
    } as ApiResponse<null>);
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      user,
      token: `dummy-token-${user.id}`,
    },
    message: '로그인 성공!',
  } as ApiResponse<{ user: User; token: string }>);
};

// POST /api/auth/register
export const register = (req: Request, res: Response): void => {
  const { email, nickname, level } = req.body;

  if (!email || !nickname) {
    res.status(400).json({
      success: false,
      error: '이메일과 닉네임을 입력해주세요.',
    } as ApiResponse<null>);
    return;
  }

  const existing = dummyUsers.find((u) => u.email === email);
  if (existing) {
    res.status(409).json({
      success: false,
      error: '이미 등록된 이메일입니다.',
    } as ApiResponse<null>);
    return;
  }

  const newUser: User = {
    id: `user-${Date.now()}`,
    email,
    nickname,
    level: level || 'beginner',
    weeklyGoalKm: 20,
    createdAt: new Date().toISOString(),
  };

  dummyUsers.push(newUser);

  res.status(201).json({
    success: true,
    data: {
      user: newUser,
      token: `dummy-token-${newUser.id}`,
    },
    message: '회원가입 성공!',
  } as ApiResponse<{ user: User; token: string }>);
};

// GET /api/auth/users (for demo — list all dummy users)
export const getUsers = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: dummyUsers,
  } as ApiResponse<User[]>);
};
