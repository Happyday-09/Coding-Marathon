import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

import { User } from './types';
import LoginScreen from './screens/LoginScreen';
import AppNavigator from './navigation/AppNavigator';
import { supabase } from './lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user.id, session.user.email || '');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserProfile(session.user.id, session.user.email || '');
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string, email: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    setUser({
      id: userId,
      email,
      nickname: profile?.nickname || email.split('@')[0],
      level: (profile?.running_level as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
      weeklyGoalKm: profile?.weekly_goal_km || 20,
      createdAt: profile?.created_at || new Date().toISOString(),
    });
  };

  const reloadUserProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadUserProfile(session.user.id, session.user.email || '');
    }
  };

  const handleLogin = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      Alert.alert('로그인 실패', error.message === 'Invalid login credentials'
        ? '이메일 또는 비밀번호가 올바르지 않습니다.'
        : error.message);
    }
  };

  const handleRegister = async (
    email: string,
    password: string,
    nickname: string,
    level: 'beginner' | 'intermediate' | 'advanced'
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname, running_level: level } },
    });

    if (error) {
      const msg = error.message.includes('already registered')
        ? '이미 가입된 이메일입니다. 로그인을 이용해주세요.'
        : error.message.includes('rate limit')
        ? '잠시 후 다시 시도해주세요. (이메일 발송 한도 초과)'
        : error.message;
      Alert.alert('회원가입 실패', msg);
      return;
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        nickname,
        running_level: level,
      });

      const needsConfirmation = !data.session;
      if (needsConfirmation) {
        Alert.alert(
          '이메일 확인 필요',
          `${email}로 확인 메일을 보냈습니다.\n메일함에서 링크를 클릭한 후 로그인해주세요.`
        );
      } else {
        Alert.alert('회원가입 완료', `${nickname}님, 가입을 환영합니다!`);
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      // Generate redirect URI dynamically per platform
      const redirectTo = makeRedirectUri({ path: 'auth/callback' });
      console.log('[Google OAuth] redirectTo =', redirectTo); // ← 터미널/콘솔에서 이 값 확인!

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data.url) {
        Alert.alert('Google 로그인 실패', error?.message || '로그인 URL을 가져올 수 없습니다.');
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success' && result.url) {
        // Safe regex parsing for URL query/hash parameters to prevent 'Invalid URL' crashes on custom protocols
        const urlString = result.url;
        const getParam = (name: string) => {
          const regex = new RegExp('[#?&]' + name + '=([^&#]*)');
          const match = urlString.match(regex);
          return match ? match[1] : undefined;
        };

        const accessToken = getParam('access_token');
        const refreshToken = getParam('refresh_token');

        if (accessToken && refreshToken) {
          const { error: sessionErr } = await supabase.auth.setSession({ 
            access_token: accessToken, 
            refresh_token: refreshToken 
          });
          if (sessionErr) {
            Alert.alert('세션 설정 실패', sessionErr.message);
          }
        } else {
          Alert.alert('인증 오류', '인증 토큰을 찾을 수 없습니다.');
        }
      } else {
        console.log('[Google OAuth] result:', result.type); // 'cancel' or 'dismiss'
      }
    } catch (err: any) {
      console.error('[Google OAuth] Unexpected error:', err);
      Alert.alert('Google 로그인 오류', err?.message || '로그인 중 예기치 않은 오류가 발생했습니다.');
    }
  };

  const handleLogout = async () => {
    setUser(null);
    await supabase.auth.signOut();
  };

  return (
    <>
      <StatusBar style="dark" />
      {user ? (
        <NavigationContainer>
          <AppNavigator user={user} onLogout={handleLogout} reloadUserProfile={reloadUserProfile} />
        </NavigationContainer>
      ) : (
        <LoginScreen
          onLogin={handleLogin}
          onRegister={handleRegister}
          onGoogleLogin={handleGoogleLogin}
        />
      )}
    </>
  );
}
