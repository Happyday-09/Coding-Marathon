import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'RunHistory'>;
  userId: string;
};

interface RunRecord {
  id: string;
  distance_m: number;
  duration_sec: number;
  avg_pace_sec_per_km: number | null;
  calories_kcal: number | null;
  started_at: string;
  ended_at: string | null;
}

type Period = 'week' | 'month' | 'all';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: '이번 주' },
  { key: 'month', label: '이번 달' },
  { key: 'all', label: '전체' },
];

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = secPerKm % 60;
  return `${m}'${String(s).padStart(2, '0')}"`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} (${['일','월','화','수','목','금','토'][d.getDay()]})`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function RunHistoryScreen({ navigation, userId }: Props) {
  const { height } = useWindowDimensions();
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('week');

  useFocusEffect(
    useCallback(() => {
      loadRuns();
    }, [userId])
  );

  const loadRuns = async () => {
    const { data, error } = await supabase
      .from('runs')
      .select('id, distance_m, duration_sec, avg_pace_sec_per_km, calories_kcal, started_at, ended_at')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (error) {
      Alert.alert('기록 로딩 실패', error.message);
    } else if (data) {
      setRuns(data);
    }
    setLoading(false);
  };

  const filteredRuns = useMemo(() => {
    const now = new Date();
    if (period === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay()); // 이번 주 일요일
      start.setHours(0, 0, 0, 0);
      return runs.filter((r) => new Date(r.started_at) >= start);
    }
    if (period === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return runs.filter((r) => new Date(r.started_at) >= start);
    }
    return runs;
  }, [runs, period]);

  const stats = useMemo(() => {
    const totalKm = filteredRuns.reduce((s, r) => s + r.distance_m / 1000, 0);
    const totalSec = filteredRuns.reduce((s, r) => s + r.duration_sec, 0);
    const totalCal = filteredRuns.reduce((s, r) => s + (r.calories_kcal ?? 0), 0);
    const paceRuns = filteredRuns.filter((r) => r.avg_pace_sec_per_km && r.avg_pace_sec_per_km > 0);
    const avgPace = paceRuns.length > 0
      ? Math.round(paceRuns.reduce((s, r) => s + (r.avg_pace_sec_per_km ?? 0), 0) / paceRuns.length)
      : 0;
    const bestPace = paceRuns.length > 0
      ? Math.min(...paceRuns.map((r) => r.avg_pace_sec_per_km ?? Infinity))
      : 0;
    const bestDist = filteredRuns.length > 0
      ? Math.max(...filteredRuns.map((r) => r.distance_m / 1000))
      : 0;
    return { totalKm, totalSec, totalCal, avgPace, bestPace, bestDist, count: filteredRuns.length };
  }, [filteredRuns]);

  // Last 7 days bar chart data
  const weeklyBars = useMemo(() => {
    const days: { label: string; km: number; date: Date }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const km = runs
        .filter((r) => {
          const t = new Date(r.started_at);
          return t >= d && t < next;
        })
        .reduce((s, r) => s + r.distance_m / 1000, 0);
      days.push({ label: ['일', '월', '화', '수', '목', '금', '토'][d.getDay()], km, date: d });
    }
    return days;
  }, [runs]);

  const maxBarKm = Math.max(...weeklyBars.map((d) => d.km), 1);

  if (loading) {
    return (
      <View style={{ height, backgroundColor: '#F5F5FA', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#5B5FEF" />
      </View>
    );
  }

  return (
    <View style={{ height, backgroundColor: '#F5F5FA' }}>
      <SafeAreaView style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#1A1A2E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>기록 분석</Text>
          <View style={{ width: 32 }} />
        </View>


        {/* Period Selector */}
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodChip, period === p.key && styles.periodChipActive]}
              onPress={() => setPeriod(p.key)}
            >
              <Text style={[styles.periodChipText, period === p.key && styles.periodChipTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Stats */}
        <View style={styles.summaryGrid}>
          <StatCard icon="flash" color="#5B5FEF" label="총 거리" value={`${stats.totalKm.toFixed(1)}`} unit="km" />
          <StatCard icon="time-outline" color="#FF9500" label="총 시간" value={formatDuration(stats.totalSec)} unit="" />
          <StatCard icon="flame" color="#FF6B6B" label="소모 칼로리" value={`${stats.totalCal}`} unit="kcal" />
          <StatCard icon="fitness" color="#34C759" label="러닝 횟수" value={`${stats.count}`} unit="회" />
        </View>

        {stats.count > 0 && (
          <View style={styles.summaryGrid}>
            <StatCard icon="speedometer-outline" color="#007AFF" label="평균 페이스" value={stats.avgPace > 0 ? formatPace(stats.avgPace) : '-'} unit="/km" />
            <StatCard icon="trophy-outline" color="#FF9500" label="최고 페이스" value={stats.bestPace > 0 ? formatPace(stats.bestPace) : '-'} unit="/km" />
            <StatCard icon="resize-outline" color="#5B5FEF" label="최장 거리" value={stats.bestDist.toFixed(2)} unit="km" />
            <StatCard icon="analytics-outline" color="#34C759" label="평균 거리" value={stats.count > 0 ? (stats.totalKm / stats.count).toFixed(2) : '0'} unit="km" />
          </View>
        )}

        {/* Weekly Bar Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>최근 7일 거리</Text>
          <View style={styles.barChart}>
            {weeklyBars.map((day, idx) => (
              <View key={idx} style={styles.barCol}>
                <Text style={styles.barValue}>{day.km > 0 ? day.km.toFixed(1) : ''}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: Math.max(4, (day.km / maxBarKm) * 100),
                        backgroundColor: day.km > 0 ? '#5B5FEF' : '#EBEBF0',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, day.km > 0 && { color: '#5B5FEF', fontWeight: '700' }]}>
                  {day.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Run List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기록 목록 ({filteredRuns.length}회)</Text>
          {filteredRuns.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="footsteps-outline" size={40} color="#D0D0D8" />
              <Text style={styles.emptyText}>이 기간에 러닝 기록이 없습니다</Text>
            </View>
          ) : (
            filteredRuns.map((run, idx) => (
              <View key={run.id} style={styles.runCard}>
                <View style={[styles.runIndex, { backgroundColor: idx % 2 === 0 ? '#F0F0FF' : '#FFF5F0' }]}>
                  <Ionicons name="body" size={20} color={idx % 2 === 0 ? '#5B5FEF' : '#FF6B6B'} />
                </View>
                <View style={styles.runInfo}>
                  <Text style={styles.runDate}>{formatDate(run.started_at)}</Text>
                  <View style={styles.runMetaRow}>
                    <Text style={styles.runDistance}>{(run.distance_m / 1000).toFixed(2)} km</Text>
                    <Text style={styles.runDot}>·</Text>
                    <Text style={styles.runMeta}>{formatDuration(run.duration_sec)}</Text>
                    {run.avg_pace_sec_per_km ? (
                      <>
                        <Text style={styles.runDot}>·</Text>
                        <Text style={styles.runMeta}>{formatPace(run.avg_pace_sec_per_km)}/km</Text>
                      </>
                    ) : null}
                  </View>
                  {(run.calories_kcal ?? 0) > 0 && (
                    <Text style={styles.runCal}>{run.calories_kcal} kcal 소모</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StatCard({ icon, color, label, value, unit }: {
  icon: any; color: string; label: string; value: string; unit: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}<Text style={styles.statUnit}> {unit}</Text></Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  scrollContent: { padding: 16 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EBEBF0',
  },
  periodChipActive: { backgroundColor: '#5B5FEF', borderColor: '#5B5FEF' },
  periodChipText: { fontSize: 14, fontWeight: '600', color: '#8E8EA0' },
  periodChipTextActive: { color: '#FFFFFF' },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    width: (width - 42) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  statUnit: { fontSize: 12, fontWeight: '400', color: '#8E8EA0' },
  statLabel: { fontSize: 12, color: '#8E8EA0' },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 14 },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 130,
    gap: 6,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barValue: { fontSize: 9, color: '#5B5FEF', fontWeight: '600', height: 12 },
  barTrack: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '70%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: { fontSize: 11, color: '#8E8EA0' },
  runCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5FA',
    gap: 12,
  },
  runIndex: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runInfo: { flex: 1 },
  runDate: { fontSize: 12, color: '#8E8EA0', marginBottom: 3 },
  runMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  runDistance: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  runDot: { fontSize: 12, color: '#D0D0D8' },
  runMeta: { fontSize: 13, color: '#5B5FEF', fontWeight: '500' },
  runCal: { fontSize: 11, color: '#FF9500', marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyText: { fontSize: 14, color: '#8E8EA0' },
});
