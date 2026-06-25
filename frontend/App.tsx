// ============================================
// 🏃 Running App — Root Component
// ============================================

import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';

import { User } from './types';
import LoginScreen from './screens/LoginScreen';
import AppNavigator from './navigation/AppNavigator';
import { authService } from './services/api';

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = async (email: string) => {
    try {
      const res = await authService.login(email);
      if (res.success) {
        setUser(res.data.user);
      } else {
        Alert.alert('로그인 실패', res.error || '이메일을 확인해주세요.');
      }
    } catch (error: any) {
      // If server is not available, use a fallback dummy user
      if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network')) {
        const fallbackUser: User = {
          id: 'user-001',
          email: email,
          nickname: '달리는 사람',
          level: 'intermediate',
          profileImage: 'https://api.dicebear.com/7.x/avataaars/png?seed=runner1',
          weeklyGoalKm: 50,
          createdAt: '2024-01-15T09:00:00Z',
        };
        setUser(fallbackUser);
        Alert.alert('오프라인 모드', '서버에 연결할 수 없어 오프라인 모드로 실행합니다.');
      } else {
        Alert.alert('오류', error.response?.data?.error || '로그인 중 오류가 발생했습니다.');
      }
    }
  };

  const handleRegister = async (
    email: string,
    nickname: string,
    level: 'beginner' | 'intermediate' | 'advanced'
  ) => {
    try {
      const res = await authService.register(email, nickname, level);
      if (res.success) {
        setUser(res.data.user);
        Alert.alert('회원가입 완료', `${res.data.user.nickname}님, 가입을 환영합니다!`);
      } else {
        Alert.alert('회원가입 실패', res.error || '회원가입에 실패했습니다.');
      }
    } catch (error: any) {
      Alert.alert('오류', error.response?.data?.error || '회원가입 중 오류가 발생했습니다.');
    }
  };

  const handleLogout = () => {
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
        <LoginScreen onLogin={handleLogin} onRegister={handleRegister} />
      )}
    </>
  );
}
