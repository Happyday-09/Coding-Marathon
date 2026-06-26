import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Alert, Platform } from 'react-native';
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
        // Dismiss the browser session immediately when authenticated to resolve Custom Tabs hang in Android (Mobile only)
        if (Platform.OS !== 'web') {
          WebBrowser.dismissBrowser();
        }
        loadUserProfile(session.user.id, session.user.email || '');
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string, email: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('[App] Failed to load profile:', error.message);
      }

      setUser({
        id: userId,
        email,
        nickname: profile?.nickname || email.split('@')[0],
        level: (profile?.running_level as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
        weeklyGoalKm: profile?.weekly_goal_km || 20,
        createdAt: profile?.created_at || new Date().toISOString(),
      });
    } catch (err) {
      console.error('[App] loadUserProfile error:', err);
      // Fallback user object to prevent infinite loading spinner
      setUser({
        id: userId,
        email,
        nickname: email.split('@')[0],
        level: 'beginner',
        weeklyGoalKm: 20,
        createdAt: new Date().toISOString(),
      });
    }
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
      const isWeb = Platform.OS === 'web';
      // Generate redirect URI dynamically: use window origin on Web, Expo deep link scheme on mobile
      const redirectTo = isWeb 
        ? window.location.origin 
        : makeRedirectUri();
      console.log('[Google OAuth] redirectTo =', redirectTo); // ← 터미널/콘솔에서 이 값 확인!

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true, // Always skip auto-redirect so we can manually control the single redirect path
        },
      });

      if (error || !data.url) {
        Alert.alert('Google 로그인 실패', error?.message || '로그인 URL을 가져올 수 없습니다.');
        return;
      }

      if (isWeb && data.url) {
        // Explicitly redirect the window to ensure the browser navigates to the OAuth URL
        window.location.href = data.url;
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

        const code = getParam('code');
        const accessToken = getParam('access_token');
        const refreshToken = getParam('refresh_token');

        if (code) {
          // PKCE flow: Exchange authorization code for session
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) {
            Alert.alert('인증 코드 교환 실패', exchangeErr.message);
          }
        } else if (accessToken && refreshToken) {
          // Implicit flow: Set session directly with tokens
          const { error: sessionErr } = await supabase.auth.setSession({ 
            access_token: accessToken, 
            refresh_token: refreshToken 
          });
          if (sessionErr) {
            Alert.alert('세션 설정 실패', sessionErr.message);
          }
        } else {
          Alert.alert('인증 오류', '인증 코드 또는 토큰을 찾을 수 없습니다.');
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
