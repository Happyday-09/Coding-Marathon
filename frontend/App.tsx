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
      weeklyGoalKm: 20,
      createdAt: profile?.created_at || new Date().toISOString(),
    });
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
      Alert.alert('회원가입 실패', error.message);
      return;
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        nickname,
        running_level: level,
      });
      Alert.alert('회원가입 완료', `${nickname}님, 가입을 환영합니다!`);
    }
  };

  const handleGoogleLogin = async () => {
    const redirectTo = makeRedirectUri({ scheme: 'runmate', path: 'auth/callback' });

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
      const url = new URL(result.url);
      const accessToken = url.searchParams.get('access_token') ||
        url.hash.replace('#', '').split('&').find(p => p.startsWith('access_token='))?.split('=')[1];
      const refreshToken = url.searchParams.get('refresh_token') ||
        url.hash.replace('#', '').split('&').find(p => p.startsWith('refresh_token='))?.split('=')[1];

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <>
      <StatusBar style="dark" />
      {user ? (
        <NavigationContainer>
          <AppNavigator user={user} onLogout={handleLogout} />
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
