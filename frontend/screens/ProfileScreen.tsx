// ============================================
// 👤 Profile Screen
// ============================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { User, RunStats, RootStackParamList } from '../types';
import { supabase } from '../lib/supabase';

interface ProfileScreenProps {
  user: User;
  onLogout: () => void;
}

export default function ProfileScreen({ user, onLogout }: ProfileScreenProps) {
  const [stats, setStats] = useState<RunStats | null>(null);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data, error } = await supabase
        .from('runs')
        .select('distance_m, duration_sec, calories_kcal, avg_pace_sec_per_km, started_at')
        .eq('user_id', user.id);

      if (error || !data) return;

      const totalDistance = data.reduce((s, r) => s + r.distance_m / 1000, 0);
      const totalDuration = data.reduce((s, r) => s + r.duration_sec, 0);
      const totalCalories = data.reduce((s, r) => s + (r.calories_kcal ?? 0), 0);
      const paceRuns = data.filter((r) => r.avg_pace_sec_per_km && r.avg_pace_sec_per_km > 0);
      const averagePace = paceRuns.length > 0
        ? paceRuns.reduce((s, r) => s + (r.avg_pace_sec_per_km ?? 0), 0) / paceRuns.length
        : 0;

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weeklyDistance = data
        .filter((r) => new Date(r.started_at) >= weekStart)
        .reduce((s, r) => s + r.distance_m / 1000, 0);

      setStats({
        totalDistance,
        totalDuration,
        totalCalories,
        totalRuns: data.length,
        averagePace,
        weeklyDistance,
      });
    } catch {
      // ignore
    }
  };

  const getLevelText = (level: string): string => {
    const map: Record<string, string> = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    };
    return map[level] || level;
  };

  const formatHours = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const menuItems = [
    {
      icon: 'person-outline' as const,
      label: 'Personal parameters',
      color: '#5B5FEF',
      onPress: () => navigation.navigate('PersonalParameters', { userId: user.id }),
    },
    {
      icon: 'trophy-outline' as const,
      label: 'Achievements',
      color: '#FF9500',
      onPress: () => Alert.alert('준비 중', '업적 기능은 곧 추가됩니다!'),
    },
    {
      icon: 'settings-outline' as const,
      label: 'Settings',
      color: '#34C759',
      onPress: () => navigation.navigate('Settings'),
    },
    {
      icon: 'heart-outline' as const,
      label: 'Our contact',
      color: '#FF6B6B',
      onPress: () => Alert.alert('문의하기', 'support@runmate.app'),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity>
            <Ionicons name="create-outline" size={22} color="#8E8EA0" />
          </TouchableOpacity>
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          {user.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{user.nickname[0]}</Text>
            </View>
          )}
          <Text style={styles.nickname}>{user.nickname}</Text>
          <Text style={styles.levelBadge}>{getLevelText(user.level)}</Text>
        </View>

        {/* Total Progress Card */}
        <TouchableOpacity style={styles.progressCard} activeOpacity={0.8} onPress={() => navigation.navigate('RunHistory', { userId: user.id })}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Total progress</Text>
            <Ionicons name="chevron-forward" size={18} color="#8E8EA0" />
          </View>
          <View style={styles.progressStats}>
            <View style={styles.progressItem}>
              <Ionicons name="flash" size={18} color="#5B5FEF" />
              <Text style={styles.progressValue}>
                {stats ? stats.totalDistance.toFixed(1) : '0'}
              </Text>
              <Text style={styles.progressLabel}>km</Text>
            </View>
            <View style={styles.progressItem}>
              <Ionicons name="body" size={18} color="#5B5FEF" />
              <Text style={styles.progressValue}>
                {stats ? formatHours(stats.totalDuration) : '0'}
              </Text>
              <Text style={styles.progressLabel}>hr</Text>
            </View>
            <View style={styles.progressItem}>
              <Ionicons name="flame" size={18} color="#FF9500" />
              <Text style={styles.progressValue}>
                {stats ? (stats.totalCalories >= 1000
                  ? (stats.totalCalories / 1000).toFixed(1) + 'k'
                  : stats.totalCalories.toString()) : '0'}
              </Text>
              <Text style={styles.progressLabel}>kcal</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.menuItem} activeOpacity={0.7} onPress={item.onPress}>
              <View style={[styles.menuIconBg, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#D0D0D8" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden' as const,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 26,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#5B5FEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
  },
  nickname: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  levelBadge: {
    fontSize: 14,
    color: '#5B5FEF',
    fontWeight: '500',
    marginTop: 2,
  },
  progressCard: {
    marginHorizontal: 26,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EBEBF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressItem: {
    alignItems: 'center',
    gap: 4,
  },
  progressValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  progressLabel: {
    fontSize: 12,
    color: '#8E8EA0',
  },
  menuSection: {
    marginHorizontal: 26,
    gap: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5FA',
  },
  menuIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A2E',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    marginHorizontal: 26,
    paddingVertical: 14,
    gap: 8,
    backgroundColor: '#FFF0F0',
    borderRadius: 14,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
  },
});
