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
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (
    email: string,
    password: string,
    nickname: string,
    level: 'beginner' | 'intermediate' | 'advanced'
  ) => Promise<void>;
  onGoogleLogin: () => Promise<void>;
}

export default function LoginScreen({ onLogin, onRegister, onGoogleLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('알림', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      await onLogin(email.trim(), password);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password || !nickname.trim()) {
      Alert.alert('알림', '이메일, 비밀번호, 닉네임을 모두 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('알림', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    try {
      await onRegister(email.trim(), password, nickname.trim(), level);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await onGoogleLogin();
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setPassword('');
    setNickname('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoArea}>
            <View style={styles.logoCircle}>
              <Ionicons name="fitness" size={48} color="#FFFFFF" />
            </View>
            <Text style={styles.appName}>RunMate</Text>
            <Text style={styles.tagline}>당신의 러닝 파트너</Text>
          </View>

          <View style={styles.inputArea}>
            {/* Email */}
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

            {/* Password */}
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#8E8EA0" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="비밀번호를 입력하세요"
                placeholderTextColor="#B0B0C0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#8E8EA0"
                />
              </TouchableOpacity>
            </View>

            {/* SignUp only: Nickname + Level */}
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

            {/* Main Action Button */}
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

            {/* Toggle Login/SignUp */}
            <TouchableOpacity onPress={switchMode} disabled={loading}>
              <Text style={styles.toggleText}>
                {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>또는</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Login */}
            <TouchableOpacity
              style={[styles.googleButton, loading && styles.loginButtonDisabled]}
              onPress={handleGoogleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleButtonText}>Google 계정으로 계속하기</Text>
            </TouchableOpacity>
          </View>
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
    marginBottom: 40,
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
    gap: 12,
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
  eyeIcon: {
    paddingLeft: 8,
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
    marginTop: 4,
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
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
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
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 54,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#DDDDE8',
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleButtonText: {
    color: '#1A1A2E',
    fontSize: 16,
    fontWeight: '600',
  },
});
