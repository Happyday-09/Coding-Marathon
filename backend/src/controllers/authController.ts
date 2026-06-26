import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { createClient } from '@supabase/supabase-js';
import { User, ApiResponse } from '../types';

// Anon client for password-based auth (not service role)
const supabaseAnon = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || '',
  { auth: { persistSession: false } }
);

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({
      success: false,
      error: '이메일과 비밀번호를 입력해주세요.',
    } as ApiResponse<null>);
    return;
  }

  try {
    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      res.status(401).json({
        success: false,
        error: '이메일 또는 비밀번호가 올바르지 않습니다.',
      } as ApiResponse<null>);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    const user: User = {
      id: data.user.id,
      email: data.user.email || '',
      nickname: profile?.nickname || '러너',
      level: (profile?.running_level as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
      weeklyGoalKm: 20,
      createdAt: profile?.created_at || data.user.created_at,
    };

    res.status(200).json({
      success: true,
      data: { user, token: data.session?.access_token || `token-${user.id}` },
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
  const { email, password, nickname, level } = req.body;

  if (!email || !password || !nickname) {
    res.status(400).json({
      success: false,
      error: '이메일, 비밀번호, 닉네임을 모두 입력해주세요.',
    } as ApiResponse<null>);
    return;
  }

  if (password.length < 6) {
    res.status(400).json({
      success: false,
      error: '비밀번호는 6자 이상이어야 합니다.',
    } as ApiResponse<null>);
    return;
  }

  try {
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nickname },
    });

    if (createError || !newUser.user) {
      const isDuplicate = createError?.message?.includes('already');
      res.status(isDuplicate ? 409 : 500).json({
        success: false,
        error: isDuplicate ? '이미 등록된 이메일입니다.' : '사용자 생성에 실패했습니다.',
      } as ApiResponse<null>);
      return;
    }

    await supabase.from('profiles').upsert({
      id: newUser.user.id,
      nickname,
      running_level: level || 'beginner',
    });

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
      data: { user, token: `token-${user.id}` },
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
