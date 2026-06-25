// ============================================
// 🏠 Home Screen — Dashboard
// ============================================

import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User, Run, RunStats } from '../types';
import { runService } from '../services/api';

interface HomeScreenProps {
  user: User;
  navigation: any;
}

export default function HomeScreen({ user, navigation }: HomeScreenProps) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [stats, setStats] = useState<RunStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [runsRes, statsRes] = await Promise.all([
        runService.getByUser(user.id),
        runService.getStats(user.id),
      ]);
      if (runsRes.success) setRuns(runsRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch {
      // Use empty data on error
    } finally {
      setLoading(false);
    }
  };

  const latestRun = runs.length > 0 ? runs[0] : null;
  const weeklyDone = stats?.weeklyDistance || 0;
  const weeklyGoal = user.weeklyGoalKm;
  const weeklyLeft = Math.max(0, weeklyGoal - weeklyDone);
  const weeklyProgress = weeklyGoal > 0 ? Math.min(1, weeklyDone / weeklyGoal) : 0;

  const weeklyChartData = useMemo(() => {
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    const distances = [0, 0, 0, 0, 0, 0, 0];

    const now = new Date();
    const currentDay = now.getDay(); // 0: Sun, 1: Mon
    const startOfWeek = new Date(now);
    const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    runs.forEach((run) => {
      const runDate = new Date(run.createdAt);
      if (runDate >= startOfWeek && runDate <= now) {
        let dayIdx = runDate.getDay() - 1; // Mon: 0, Tue: 1... Sun: -1 -> 6
        if (dayIdx === -1) dayIdx = 6;
        if (dayIdx >= 0 && dayIdx < 7) {
          distances[dayIdx] += run.distance;
        }
      }
    });

    const maxDist = Math.max(...distances, 1);

    return days.map((day, idx) => ({
      day,
      distance: distances[idx],
      heightPercent: Math.min(100, Math.round((distances[idx] / maxDist) * 100)),
    }));
  }, [runs]);

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  const getLevelText = (level: string): string => {
    const map: Record<string, string> = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    };
    return map[level] || level;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              {user.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>{user.nickname[0]}</Text>
                </View>
              )}
            </View>
            <View>
              <Text style={styles.greeting}>Hello, {user.nickname}</Text>
              <Text style={styles.level}>{getLevelText(user.level)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={22} color="#8E8EA0" />
          </TouchableOpacity>
        </View>

        {/* Week Goal Card */}
        <TouchableOpacity style={styles.weekGoalCard} activeOpacity={0.8}>
          <View style={styles.weekGoalHeader}>
            <Text style={styles.weekGoalLabel}>Week goal</Text>
            <Text style={styles.weekGoalValue}>{weeklyGoal} km</Text>
            <Ionicons name="chevron-forward" size={18} color="#8E8EA0" style={{ marginLeft: 'auto' }} />
          </View>
          <View style={styles.weekGoalProgress}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${weeklyProgress * 100}%` }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressDone}>{weeklyDone.toFixed(1)} km done</Text>
              <Text style={styles.progressLeft}>{weeklyLeft.toFixed(1)} km left</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Weekly Stats Bar Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>이번 주 러닝 분석</Text>
          <View style={styles.chartContainer}>
            {weeklyChartData.map((data, idx) => (
              <View key={idx} style={styles.chartColumn}>
                <Text style={styles.barValueText}>
                  {data.distance > 0 ? `${data.distance.toFixed(1)}k` : ''}
                </Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${data.heightPercent}%` }]} />
                </View>
                <Text style={styles.barLabel}>{data.day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Current Jogging Card */}
        {latestRun && (
          <TouchableOpacity
            style={styles.currentJoggingCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Run')}
          >
            <View style={styles.currentJoggingLeft}>
              <View style={styles.runnerIconBg}>
                <Ionicons name="walk" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.currentJoggingLabel}>Current jogging</Text>
                <Text style={styles.currentJoggingTime}>
                  {formatDuration(latestRun.duration)}
                </Text>
              </View>
            </View>
            <View style={styles.currentJoggingRight}>
              <Text style={styles.currentJoggingDistance}>
                {latestRun.distance.toFixed(1)} km
              </Text>
              <Text style={styles.currentJoggingCal}>
                {latestRun.calories} kcal
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityList}>
          {runs.slice(0, 5).map((run) => (
            <TouchableOpacity key={run.id} style={styles.activityItem} activeOpacity={0.7}>
              <View style={styles.activityIcon}>
                <Ionicons name="body" size={28} color="#5B5FEF" />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityDate}>{formatDate(run.createdAt)}</Text>
                <Text style={styles.activityDistance}>{run.distance.toFixed(2)} km</Text>
                <Text style={styles.activityMeta}>
                  {run.calories} kcal  {(run.distance / (run.duration / 3600)).toFixed(1)} km/hr
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D0D0D8" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {},
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: '#5B5FEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  level: {
    fontSize: 13,
    color: '#5B5FEF',
    fontWeight: '500',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekGoalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EBEBF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  weekGoalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  weekGoalLabel: {
    fontSize: 15,
    color: '#1A1A2E',
    fontWeight: '600',
  },
  weekGoalValue: {
    fontSize: 15,
    color: '#5B5FEF',
    fontWeight: '700',
    marginLeft: 8,
  },
  weekGoalProgress: {},
  progressBarBg: {
    height: 8,
    backgroundColor: '#EBEBF0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: 8,
    backgroundColor: '#5B5FEF',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressDone: {
    fontSize: 12,
    color: '#1A1A2E',
    fontWeight: '500',
  },
  progressLeft: {
    fontSize: 12,
    color: '#8E8EA0',
  },
  currentJoggingCard: {
    backgroundColor: '#5B5FEF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#5B5FEF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  currentJoggingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  runnerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentJoggingLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  currentJoggingTime: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  currentJoggingRight: {
    alignItems: 'flex-end',
  },
  currentJoggingDistance: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  currentJoggingCal: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  seeAll: {
    fontSize: 14,
    color: '#5B5FEF',
    fontWeight: '600',
  },
  activityList: {
    gap: 2,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5FA',
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F0F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  activityInfo: {
    flex: 1,
  },
  activityDate: {
    fontSize: 12,
    color: '#8E8EA0',
    marginBottom: 2,
  },
  activityDistance: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  activityMeta: {
    fontSize: 12,
    color: '#8E8EA0',
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EBEBF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 16,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barValueText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#5B5FEF',
    marginBottom: 4,
    height: 14,
  },
  barTrack: {
    width: 14,
    height: 70,
    backgroundColor: '#F5F5FA',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#5B5FEF',
    borderRadius: 7,
  },
  barLabel: {
    fontSize: 12,
    color: '#8E8EA0',
    marginTop: 6,
    fontWeight: '600',
  },
});
