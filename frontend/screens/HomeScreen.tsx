// ============================================
// 🏠 Home Screen — Dashboard
// ============================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Polyline } from 'react-native-maps';
import { Platform, StatusBar } from 'react-native';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface RunRecord {
  id: string;
  distance_m: number;
  duration_sec: number;
  avg_pace_sec_per_km: number | null;
  calories_kcal: number | null;
  started_at: string;
}

interface HomeScreenProps {
  user: User;
  navigation: any;
}

export default function HomeScreen({ user, navigation }: HomeScreenProps) {
  const { height } = useWindowDimensions();
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunRecord | null>(null);
  const [routePoints, setRoutePoints] = useState<{ latitude: number; longitude: number }[]>([]);
  const detailMapRef = useRef<MapView>(null);

  // Zoom map in detail modal dynamically when loaded
  useEffect(() => {
    if (selectedRun && routePoints.length > 0) {
      const midPoint = routePoints[Math.floor(routePoints.length / 2)];
      setTimeout(() => {
        detailMapRef.current?.animateToRegion({
          latitude: midPoint.latitude,
          longitude: midPoint.longitude,
          latitudeDelta: 0.0006,
          longitudeDelta: 0.0006,
        }, 800);
      }, 300);
    }
  }, [selectedRun, routePoints]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user.id])
  );

  const loadData = async () => {
    const { data } = await supabase
      .from('runs')
      .select('id, distance_m, duration_sec, avg_pace_sec_per_km, calories_kcal, started_at')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(10);
    if (data) setRuns(data);
  };

  const openRunDetail = async (run: RunRecord) => {
    setSelectedRun(run);
    setRoutePoints([]);
    const { data, error } = await supabase
      .from('run_points')
      .select('lat, lng')
      .eq('run_id', run.id)
      .order('seq', { ascending: true });
    if (error) {
      console.error('run_points fetch 실패:', error.message, error.code);
    }
    if (data && data.length > 0) {
      setRoutePoints(data.map((p) => ({ latitude: p.lat, longitude: p.lng })));
    }
  };

  const totalKmThisWeek = (() => {
    const start = new Date();
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    return runs
      .filter((r) => new Date(r.started_at) >= start)
      .reduce((s, r) => s + r.distance_m / 1000, 0);
  })();

  const weeklyGoal = user.weeklyGoalKm || 20;
  const weeklyLeft = Math.max(0, weeklyGoal - totalKmThisWeek);
  const weeklyProgress = weeklyGoal > 0 ? Math.min(1, totalKmThisWeek / weeklyGoal) : 0;

  const weeklyBars = (() => {
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    return days.map((day, i) => {
      const d = new Date();
      const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
      d.setDate(d.getDate() + diff + i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const km = runs
        .filter((r) => { const t = new Date(r.started_at); return t >= d && t < next; })
        .reduce((s, r) => s + r.distance_m / 1000, 0);
      return { day, km };
    });
  })();

  const maxKm = Math.max(...weeklyBars.map((b) => b.km), 1);

  const formatDuration = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  };

  const formatPace = (secPerKm: number) => {
    const m = Math.floor(secPerKm / 60);
    const s = secPerKm % 60;
    return `${m}'${String(s).padStart(2, '0')}"`;
  };

  const getLevelText = (level: string) =>
    ({ beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }[level] || level);

  const latestRun = runs[0] ?? null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              {user.profileImage
                ? <Image source={{ uri: user.profileImage }} style={styles.avatar} />
                : <Text style={styles.avatarText}>{user.nickname[0]}</Text>}
            </View>
            <View>
              <Text style={styles.greeting}>Hello, {user.nickname}</Text>
              <Text style={styles.level}>{getLevelText(user.level)}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={22} color="#8E8EA0" />
          </TouchableOpacity>
        </View>

        {/* Week Goal Card */}
        <View style={styles.weekGoalCard}>
          <View style={styles.weekGoalHeader}>
            <Text style={styles.weekGoalLabel}>Week goal</Text>
            <Text style={styles.weekGoalValue}>{weeklyGoal} km</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${weeklyProgress * 100}%` as any }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressDone}>{totalKmThisWeek.toFixed(1)} km done</Text>
            <Text style={styles.progressLeft}>{weeklyLeft.toFixed(1)} km left</Text>
          </View>
        </View>

        {/* Weekly Bar Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>이번 주 러닝</Text>
          <View style={styles.chartContainer}>
            {weeklyBars.map((bar, idx) => (
              <View key={idx} style={styles.chartColumn}>
                <Text style={styles.barValueText}>{bar.km > 0 ? `${bar.km.toFixed(1)}k` : ''}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${Math.max(4, (bar.km / maxKm) * 100)}%` as any, backgroundColor: bar.km > 0 ? '#5B5FEF' : '#EBEBF0' }]} />
                </View>
                <Text style={[styles.barLabel, bar.km > 0 && { color: '#5B5FEF', fontWeight: '700' as const }]}>{bar.day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Latest Run Card */}
        {latestRun && (
          <TouchableOpacity style={styles.currentJoggingCard} activeOpacity={0.8} onPress={() => navigation.navigate('Run')}>
            <View style={styles.currentJoggingLeft}>
              <View style={styles.runnerIconBg}>
                <Ionicons name="fitness" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.currentJoggingLabel}>Last run</Text>
                <Text style={styles.currentJoggingTime}>{formatDuration(latestRun.duration_sec)}</Text>
              </View>
            </View>
            <View style={styles.currentJoggingRight}>
              <Text style={styles.currentJoggingDistance}>{(latestRun.distance_m / 1000).toFixed(2)} km</Text>
              {latestRun.avg_pace_sec_per_km && latestRun.avg_pace_sec_per_km > 0 ? (
                <Text style={styles.currentJoggingCal}>{formatPace(latestRun.avg_pace_sec_per_km)}/km</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}

        {/* Recent Activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <TouchableOpacity onPress={() => navigation.navigate('RunHistory', { userId: user.id })}>
            <Text style={styles.seeAll}>All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityList}>
          {runs.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Ionicons name="footsteps-outline" size={36} color="#D0D0D8" />
              <Text style={styles.emptyText}>아직 러닝 기록이 없습니다</Text>
              <TouchableOpacity style={styles.startRunBtn} onPress={() => navigation.navigate('Run')}>
                <Text style={styles.startRunBtnText}>첫 러닝 시작하기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            runs.slice(0, 5).map((run) => (
              <TouchableOpacity key={run.id} style={styles.activityItem} activeOpacity={0.7} onPress={() => openRunDetail(run)}>
                <View style={styles.activityIcon}>
                  <Ionicons name="body" size={26} color="#5B5FEF" />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityDate}>{formatDate(run.started_at)}</Text>
                  <Text style={styles.activityDistance}>{(run.distance_m / 1000).toFixed(2)} km</Text>
                  <Text style={styles.activityMeta}>
                    {formatDuration(run.duration_sec)}
                    {run.avg_pace_sec_per_km && run.avg_pace_sec_per_km > 0
                      ? `  ·  ${formatPace(run.avg_pace_sec_per_km)}/km` : ''}
                    {(run.calories_kcal ?? 0) > 0 ? `  ·  ${run.calories_kcal} kcal` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D0D0D8" />
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Run Detail Modal */}
      <Modal visible={!!selectedRun} transparent animationType="slide" onRequestClose={() => setSelectedRun(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSelectedRun(null)} />
          <View style={[styles.modalSheet, { maxHeight: height * 0.7 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>러닝 상세 기록</Text>
              <TouchableOpacity onPress={() => setSelectedRun(null)}>
                <Ionicons name="close" size={24} color="#1A1A2E" />
              </TouchableOpacity>
            </View>
            {selectedRun && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalDate}>
                  {new Date(selectedRun.started_at).toLocaleDateString('ko-KR', {
                    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
                  })}
                </Text>

                {/* Route Map */}
                {routePoints.length > 1 ? (
                  <MapView
                    ref={detailMapRef}
                    style={styles.modalMap}
                    scrollEnabled={true}
                    zoomEnabled={true}
                    initialRegion={{
                      latitude: routePoints[Math.floor(routePoints.length / 2)].latitude,
                      longitude: routePoints[Math.floor(routePoints.length / 2)].longitude,
                      latitudeDelta: 0.0006,
                      longitudeDelta: 0.0006,
                    }}
                  >
                    <Polyline coordinates={routePoints} strokeColor="#5B5FEF" strokeWidth={4} />
                  </MapView>
                ) : (
                  <View style={styles.modalMapEmpty}>
                    <Ionicons name="map-outline" size={28} color="#C0C0D0" />
                    <Text style={styles.modalMapEmptyText}>경로 데이터 없음</Text>
                  </View>
                )}

                <View style={styles.modalStatsGrid}>
                  <View style={styles.modalStatItem}>
                    <View style={[styles.modalStatIcon, { backgroundColor: '#EEF0FF' }]}>
                      <Ionicons name="flash" size={20} color="#5B5FEF" />
                    </View>
                    <Text style={styles.modalStatValue}>{(selectedRun.distance_m / 1000).toFixed(2)}</Text>
                    <Text style={styles.modalStatUnit}>km</Text>
                    <Text style={styles.modalStatLabel}>거리</Text>
                  </View>
                  <View style={styles.modalStatItem}>
                    <View style={[styles.modalStatIcon, { backgroundColor: '#FFF4E6' }]}>
                      <Ionicons name="time-outline" size={20} color="#FF9500" />
                    </View>
                    <Text style={styles.modalStatValue}>{formatDuration(selectedRun.duration_sec)}</Text>
                    <Text style={styles.modalStatUnit}></Text>
                    <Text style={styles.modalStatLabel}>시간</Text>
                  </View>
                  <View style={styles.modalStatItem}>
                    <View style={[styles.modalStatIcon, { backgroundColor: '#EEF0FF' }]}>
                      <Ionicons name="speedometer-outline" size={20} color="#5B5FEF" />
                    </View>
                    <Text style={styles.modalStatValue}>
                      {selectedRun.avg_pace_sec_per_km && selectedRun.avg_pace_sec_per_km > 0
                        ? formatPace(selectedRun.avg_pace_sec_per_km) : '-'}
                    </Text>
                    <Text style={styles.modalStatUnit}>/km</Text>
                    <Text style={styles.modalStatLabel}>페이스</Text>
                  </View>
                  <View style={styles.modalStatItem}>
                    <View style={[styles.modalStatIcon, { backgroundColor: '#FFF0F0' }]}>
                      <Ionicons name="flame" size={20} color="#FF6B6B" />
                    </View>
                    <Text style={styles.modalStatValue}>{selectedRun.calories_kcal ?? 0}</Text>
                    <Text style={styles.modalStatUnit}>kcal</Text>
                    <Text style={styles.modalStatLabel}>칼로리</Text>
                  </View>
                </View>
                <View style={styles.modalDivider} />
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>시작 시간</Text>
                  <Text style={styles.modalDetailValue}>
                    {new Date(selectedRun.started_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>평균 페이스</Text>
                  <Text style={styles.modalDetailValue}>
                    {selectedRun.avg_pace_sec_per_km && selectedRun.avg_pace_sec_per_km > 0
                      ? `${formatPace(selectedRun.avg_pace_sec_per_km)} /km` : '-'}
                  </Text>
                </View>
                <View style={[styles.modalDetailRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.modalDetailLabel}>소모 칼로리</Text>
                  <Text style={styles.modalDetailValue}>{selectedRun.calories_kcal ?? 0} kcal</Text>
                </View>
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  scrollContent: { paddingHorizontal: 26, paddingBottom: 30 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    backgroundColor: '#5B5FEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  greeting: { fontSize: 20, fontWeight: '700', color: '#1A1A2E' },
  level: { fontSize: 13, color: '#5B5FEF', fontWeight: '500' },
  settingsButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F5F5FA', alignItems: 'center', justifyContent: 'center',
  },
  weekGoalCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: '#EBEBF0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  weekGoalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  weekGoalLabel: { fontSize: 15, color: '#1A1A2E', fontWeight: '600' },
  weekGoalValue: { fontSize: 15, color: '#5B5FEF', fontWeight: '700' },
  progressBarBg: {
    height: 8, backgroundColor: '#EBEBF0', borderRadius: 4,
    overflow: 'hidden', marginBottom: 8,
  },
  progressBarFill: { height: 8, backgroundColor: '#5B5FEF', borderRadius: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressDone: { fontSize: 12, color: '#1A1A2E', fontWeight: '500' },
  progressLeft: { fontSize: 12, color: '#8E8EA0' },
  chartCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: '#EBEBF0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  chartTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 16 },
  chartContainer: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', height: 120, paddingTop: 16,
  },
  chartColumn: { alignItems: 'center', flex: 1 },
  barValueText: { fontSize: 10, fontWeight: '600', color: '#5B5FEF', marginBottom: 4, height: 14 },
  barTrack: {
    width: 14, height: 70, backgroundColor: '#F5F5FA',
    borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 7 },
  barLabel: { fontSize: 12, color: '#8E8EA0', marginTop: 6, fontWeight: '600' },
  currentJoggingCard: {
    backgroundColor: '#5B5FEF', borderRadius: 16, padding: 18, marginBottom: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#5B5FEF', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  currentJoggingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  runnerIconBg: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  currentJoggingLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  currentJoggingTime: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  currentJoggingRight: { alignItems: 'flex-end' },
  currentJoggingDistance: { fontSize: 18, color: '#FFFFFF', fontWeight: '700' },
  currentJoggingCal: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  seeAll: { fontSize: 14, color: '#5B5FEF', fontWeight: '600' },
  activityList: { gap: 2 },
  activityItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F5F5FA',
  },
  activityIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#F0F0FF', alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  activityInfo: { flex: 1 },
  activityDate: { fontSize: 12, color: '#8E8EA0', marginBottom: 2 },
  activityDistance: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },
  activityMeta: { fontSize: 12, color: '#8E8EA0', marginTop: 2 },
  emptyActivity: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 14, color: '#8E8EA0' },
  startRunBtn: {
    marginTop: 4, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: '#5B5FEF', borderRadius: 12,
  },
  startRunBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E0E0E8', alignSelf: 'center', marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  modalDate: { fontSize: 13, color: '#8E8EA0', marginBottom: 20, marginTop: 4 },
  modalStatsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalStatItem: { alignItems: 'center', flex: 1 },
  modalStatIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  modalStatValue: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  modalStatUnit: { fontSize: 11, color: '#8E8EA0' },
  modalStatLabel: { fontSize: 11, color: '#8E8EA0', marginTop: 2 },
  modalDivider: { height: 1, backgroundColor: '#F0F0F5', marginBottom: 16 },
  modalDetailRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5FA',
  },
  modalDetailLabel: { fontSize: 14, color: '#8E8EA0' },
  modalDetailValue: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  modalMap: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  modalMapEmpty: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    backgroundColor: '#F5F5FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  modalMapEmptyText: { fontSize: 13, color: '#C0C0D0' },
});
