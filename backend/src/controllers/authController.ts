// ============================================
// Auth Controller — Supabase Integrated Login/Register
// ============================================

import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { User, ApiResponse } from '../types';

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({
      success: false,
      error: '이메일을 입력해주세요.',
    } as ApiResponse<null>);
    return;
  }

  try {
    // Look up auth user via Supabase admin list
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError || !authData) {
      res.status(500).json({
        success: false,
        error: '인증 서버 오류가 발생했습니다.',
      } as ApiResponse<null>);
      return;
    }

    const authUser = authData.users.find((u) => u.email === email);
    if (!authUser) {
      res.status(401).json({
        success: false,
        error: '등록되지 않은 이메일입니다.',
      } as ApiResponse<null>);
      return;
    }

    // Fetch user profile from public.profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      res.status(404).json({
        success: false,
        error: '프로필 정보를 찾을 수 없습니다.',
      } as ApiResponse<null>);
      return;
    }

    const user: User = {
      id: profile.id,
      email: authUser.email || '',
      nickname: profile.nickname || '러너',
      level: (profile.running_level as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
      weeklyGoalKm: 20, // default placeholder
      createdAt: profile.created_at,
    };

    res.status(200).json({
      success: true,
      data: {
        user,
        token: `token-${user.id}`,
      },
      message: '로그인 성공!',
    } as ApiResponse<{ user: User; token: string }>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '서버 내부 오류가 발생했습니다.',
    } as ApiResponse<null>);
  }
};

// POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, nickname, level } = req.body;

  if (!email || !nickname) {
    res.status(400).json({
      success: false,
      error: '이메일과 닉네임을 입력해주세요.',
    } as ApiResponse<null>);
    return;
  }

  try {
    // Check if email already registered
    const { data: authData } = await supabase.auth.admin.listUsers();
    const existing = authData?.users.find((u) => u.email === email);
    if (existing) {
      res.status(409).json({
        success: false,
        error: '이미 등록된 이메일입니다.',
      } as ApiResponse<null>);
      return;
    }

    // Create auth user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: 'password123', // default test password
      email_confirm: true,
      user_metadata: { nickname },
    });

    if (createError || !newUser.user) {
      res.status(500).json({
        success: false,
        error: '사용자 생성에 실패했습니다.',
      } as ApiResponse<null>);
      return;
    }

    // Update profile with level (profile was automatically created by trigger)
    await supabase
      .from('profiles')
      .update({ running_level: level || 'beginner' })
      .eq('id', newUser.user.id);

    const user: User = {
      id: newUser.user.id,
      email,
      nickname,
      level: level || 'beginner',
      weeklyGoalKm: 20,
      createdAt: newUser.user.created_at,
    };

    res.status(201).json({
      success: true,
      data: {
        user,
        token: `token-${user.id}`,
      },
      message: '회원가입 성공!',
    } as ApiResponse<{ user: User; token: string }>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '서버 내부 오류가 발생했습니다.',
    } as ApiResponse<null>);
  }
};

// GET /api/auth/users
export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('*');
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

    if (profileError || authError || !profiles) {
      res.status(500).json({
        success: false,
        error: '사용자 목록을 불러오지 못했습니다.',
      } as ApiResponse<null>);
      return;
    }

    const users: User[] = profiles.map((p) => {
      const authUser = authData?.users.find((u) => u.id === p.id);
      return {
        id: p.id,
        email: authUser?.email || '',
        nickname: p.nickname || '러너',
        level: (p.running_level as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
        weeklyGoalKm: 20,
        createdAt: p.created_at,
      };
    });

    res.status(200).json({
      success: true,
      data: users,
    } as ApiResponse<User[]>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '서버 내부 오류가 발생했습니다.',
    } as ApiResponse<null>);
  }
};

