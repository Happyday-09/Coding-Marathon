// ============================================
// 🔐 Login Screen
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LoginScreenProps {
  onLogin: (email: string) => void;
  onRegister: (email: string, nickname: string, level: 'beginner' | 'intermediate' | 'advanced') => Promise<void>;
}

export default function LoginScreen({ onLogin, onRegister }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert('알림', '이메일을 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      await onLogin(email.trim());
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !nickname.trim()) {
      Alert.alert('알림', '이메일과 닉네임을 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      await onRegister(email.trim(), nickname.trim(), level);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setLoading(true);
    setTimeout(() => {
      onLogin('runner@example.com');
      setLoading(false);
    }, 500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo Area */}
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Ionicons name="fitness" size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.appName}>RunMate</Text>
            <Text style={styles.tagline}>당신의 러닝 파트너</Text>
          </View>

          {/* Input Area */}
          <View style={styles.inputArea}>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#8E8EA0" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="이메일을 입력하세요"
                placeholderTextColor="#B0B0C0"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Nickname Input & Level Selector for SignUp */}
            {isSignUp && (
              <>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#8E8EA0" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="닉네임을 입력하세요"
                    placeholderTextColor="#B0B0C0"
                    value={nickname}
                    onChangeText={setNickname}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <Text style={styles.sectionLabel}>러닝 레벨</Text>
                <View style={styles.levelContainer}>
                  {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      style={[
                        styles.levelChip,
                        level === lvl ? styles.activeLevelChip : styles.inactiveLevelChip,
                      ]}
                      onPress={() => setLevel(lvl)}
                    >
                      <Text
                        style={[
                          styles.levelChipText,
                          level === lvl ? styles.activeLevelChipText : styles.inactiveLevelChipText,
                        ]}
                      >
                        {lvl === 'beginner' ? '초보' : lvl === 'intermediate' ? '중급' : '고급'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Action Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={isSignUp ? handleRegister : handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.loginButtonText}>{isSignUp ? '회원가입' : '로그인'}</Text>
              )}
            </TouchableOpacity>

            {/* Toggle Mode */}
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} disabled={loading}>
              <Text style={styles.toggleText}>
                {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
              </Text>
            </TouchableOpacity>

            {!isSignUp && (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>또는</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.demoButton}
                  onPress={handleDemoLogin}
                  activeOpacity={0.8}
                >
                  <Ionicons name="flash" size={18} color="#5B5FEF" />
                  <Text style={styles.demoButtonText}>데모 계정으로 시작하기</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Demo Accounts Info */}
          {!isSignUp && (
            <View style={styles.demoInfo}>
              <Text style={styles.demoInfoTitle}>테스트 계정</Text>
              <Text style={styles.demoInfoText}>runner@example.com (중급)</Text>
              <Text style={styles.demoInfoText}>speedy@example.com (고급)</Text>
              <Text style={styles.demoInfoText}>newbie@example.com (초보)</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#5B5FEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#5B5FEF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    color: '#8E8EA0',
    marginTop: 4,
  },
  inputArea: {
    gap: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5FA',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A2E',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8EA0',
    marginTop: 4,
    marginBottom: -4,
  },
  levelContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  levelChip: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeLevelChip: {
    borderColor: '#5B5FEF',
    backgroundColor: '#F0F0FF',
  },
  inactiveLevelChip: {
    borderColor: '#EBEBF0',
    backgroundColor: '#FFFFFF',
  },
  levelChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeLevelChipText: {
    color: '#5B5FEF',
  },
  inactiveLevelChipText: {
    color: '#8E8EA0',
  },
  loginButton: {
    backgroundColor: '#5B5FEF',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5B5FEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 6,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  toggleText: {
    color: '#5B5FEF',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EBEBF0',
  },
  dividerText: {
    color: '#8E8EA0',
    fontSize: 13,
    marginHorizontal: 16,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0FF',
    borderRadius: 14,
    height: 54,
    gap: 8,
  },
  demoButtonText: {
    color: '#5B5FEF',
    fontSize: 16,
    fontWeight: '600',
  },
  demoInfo: {
    marginTop: 40,
    alignItems: 'center',
    gap: 4,
  },
  demoInfoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8EA0',
    marginBottom: 4,
  },
  demoInfoText: {
    fontSize: 12,
    color: '#B0B0C0',
  },
});
