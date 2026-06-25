// ============================================
// 🏃 Run Screen — Running Tracker with Map (Challenge Mode Supported)
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { User, RoutePoint } from '../types';
import { runService, battleService } from '../services/api';

const { width, height } = Dimensions.get('window');

interface RunScreenProps {
  user: User;
  route?: {
    params?: {
      battleId?: string;
      challengeMode?: boolean;
      targetDistance?: number;
      targetDuration?: number;
      challengerName?: string;
    };
  };
  navigation?: any;
}

// Dummy route simulation around 여의도
const simulatedRoute: RoutePoint[] = [
  { latitude: 37.5283, longitude: 126.9340 },
  { latitude: 37.5275, longitude: 126.9360 },
  { latitude: 37.5268, longitude: 126.9385 },
  { latitude: 37.5260, longitude: 126.9410 },
  { latitude: 37.5252, longitude: 126.9440 },
  { latitude: 37.5245, longitude: 126.9470 },
  { latitude: 37.5238, longitude: 126.9500 },
  { latitude: 37.5230, longitude: 126.9530 },
  { latitude: 37.5223, longitude: 126.9560 },
  { latitude: 37.5215, longitude: 126.9590 },
  { latitude: 37.5208, longitude: 126.9620 },
  { latitude: 37.5200, longitude: 126.9650 },
];

export default function RunScreen({ user, route, navigation }: RunScreenProps) {
  const battleId = route?.params?.battleId;
  const challengeMode = route?.params?.challengeMode;
  const targetDistance = route?.params?.targetDistance;
  const targetDuration = route?.params?.targetDuration;
  const challengerName = route?.params?.challengerName;

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [calories, setCalories] = useState(0);
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const [trackedRoute, setTrackedRoute] = useState<RoutePoint[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<MapView>(null);

  // Ghost Competitor Progress (in km)
  // Challenger runs targetDistance over targetDuration seconds.
  // At any second 'elapsed', ghost competitor distance is: (targetDistance / targetDuration) * elapsed
  const ghostProgress =
    challengeMode && targetDistance && targetDuration
      ? Math.min(targetDistance, (targetDistance / targetDuration) * elapsed)
      : 0;

  // Lead / Lag difference in meters
  const diffDistance = distance - ghostProgress;
  const diffMeters = Math.round(diffDistance * 1000);

  useEffect(() => {
    if (isRunning && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isPaused]);

  // Simulate movement every 3 seconds
  useEffect(() => {
    if (isRunning && !isPaused && elapsed > 0 && elapsed % 3 === 0) {
      if (currentRouteIndex < simulatedRoute.length) {
        const nextPoint = simulatedRoute[currentRouteIndex];
        setTrackedRoute((prev) => [...prev, nextPoint]);
        setCurrentRouteIndex((prev) => prev + 1);

        // Update distance (roughly 0.3km per segment)
        setDistance((prev) => Math.round((prev + 0.28 + Math.random() * 0.1) * 100) / 100);
        setCalories((prev) => prev + Math.floor(15 + Math.random() * 10));

        // Animate map to current position
        mapRef.current?.animateToRegion({
          latitude: nextPoint.latitude,
          longitude: nextPoint.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }, 1000);
      }
    }
  }, [elapsed, isRunning, isPaused]);

  // Automated Win/Loss Trigger when reaching the target distance
  useEffect(() => {
    if (challengeMode && isRunning && targetDistance && distance >= targetDistance) {
      setIsRunning(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);

      Alert.alert(
        '도전 완주! 🏁',
        `도전 타겟 거리인 ${targetDistance.toFixed(2)}km를 돌파했습니다! 결과를 정산합니다.`,
        [
          {
            text: '결과 보기',
            onPress: () => handleCompleteChallenge(distance, elapsed, calories),
          },
        ],
        { cancelable: false }
      );
    }
  }, [distance, challengeMode, isRunning, targetDistance]);

  const formatTime = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const pace = elapsed > 0 && distance > 0 ? (distance / (elapsed / 3600)).toFixed(1) : '0.0';

  const handleStartStop = async () => {
    if (!isRunning) {
      setIsRunning(true);
      setIsPaused(false);
      setElapsed(0);
      setDistance(0);
      setCalories(0);
      setCurrentRouteIndex(0);
      setTrackedRoute([simulatedRoute[0]]);
    } else {
      // Stop button clicked manually
      setIsRunning(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);

      if (challengeMode) {
        // Manually stopped challenge
        Alert.alert(
          '러닝 종료 🏁',
          '도전을 중도 종료하고 결과를 전송하시겠습니까?',
          [
            {
              text: '취소',
              onPress: () => {
                setIsRunning(true);
              },
              style: 'cancel',
            },
            {
              text: '전송 및 종료',
              onPress: () => handleCompleteChallenge(distance, elapsed, calories),
            },
          ]
        );
      } else {
        // Normal Run stop
        await handleSaveNormalRun(distance, elapsed, calories);
      }
    }
  };

  const handleSaveNormalRun = async (d: number, t: number, c: number) => {
    if (d < 0.1) {
      Alert.alert('알림', '러닝 거리가 너무 짧아 기록을 저장하지 않습니다.');
      return;
    }

    try {
      const paceVal = t > 0 && d > 0 ? (t / 60) / d : 0;
      const res = await runService.create({
        userId: user.id,
        distance: d,
        duration: t,
        pace: Math.round(paceVal * 100) / 100,
        calories: c,
        route: trackedRoute,
      });
      if (res.success) {
        Alert.alert('기록 완료 🏃', '오늘의 러닝이 성공적으로 저장되었습니다!');
      }
    } catch {
      Alert.alert('오류', '러닝 기록 저장에 실패했습니다.');
    }
  };

  const handleCompleteChallenge = async (d: number, t: number, c: number) => {
    try {
      const paceVal = t > 0 && d > 0 ? (t / 60) / d : 0;
      // 1. Submit the run
      const runRes = await runService.create({
        userId: user.id,
        distance: d,
        duration: t,
        pace: Math.round(paceVal * 100) / 100,
        calories: c,
        route: trackedRoute,
      });

      if (runRes.success && runRes.data && battleId) {
        // 2. Submit run reference to complete the battle challenge
        const battleRes = await battleService.complete(battleId, runRes.data.id);
        if (battleRes.success) {
          Alert.alert('결과 정산 ⚔️', battleRes.message);
          
          // Clear route params & go back
          if (navigation) {
            navigation.setParams({
              battleId: undefined,
              challengeMode: undefined,
              targetDistance: undefined,
              targetDuration: undefined,
              challengerName: undefined,
            });
            navigation.navigate('Battle');
          }
        }
      }
    } catch {
      Alert.alert('오류', '도전 결과 정산 처리에 실패했습니다.');
    }
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  const currentPosition = trackedRoute.length > 0
    ? trackedRoute[trackedRoute.length - 1]
    : simulatedRoute[0];

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 37.5283,
          longitude: 126.9480,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        }}
      >
        {trackedRoute.length > 1 && (
          <Polyline
            coordinates={trackedRoute}
            strokeColor="#5B5FEF"
            strokeWidth={4}
          />
        )}
        {trackedRoute.length > 0 && (
          <Marker coordinate={currentPosition}>
            <View style={styles.markerDot}>
              <View style={styles.markerInner} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Top Bar */}
      <SafeAreaView style={styles.topBar}>
        <View style={styles.topBarContent}>
          <Text style={styles.topBarTitle}>
            {isRunning
              ? challengeMode
                ? '기록 돌파 도전 중!'
                : 'Current jogging'
              : challengeMode
              ? '도전 대기 완료'
              : 'Ready to run'}
          </Text>
          <View style={styles.gpsIndicator}>
            <Text style={styles.gpsText}>GPS</Text>
            <Ionicons name="cellular" size={14} color="#5B5FEF" />
          </View>
        </View>

        {/* Ghost Competitor Progress HUD */}
        {challengeMode && isRunning && (
          <View style={styles.ghostHUD}>
            <Ionicons name="ghost" size={20} color="#5B5FEF" style={{ marginTop: 2 }} />
            <View style={styles.ghostHUDTextContainer}>
              <Text style={styles.ghostHUDTitle}>{challengerName}님 고스트 페이스 비교</Text>
              <Text style={styles.ghostHUDValue}>
                내 위치가 고스트보다{' '}
                <Text style={{ color: diffMeters >= 0 ? '#34C759' : '#FF6B6B', fontWeight: 'bold' }}>
                  {Math.abs(diffMeters)}m {diffMeters >= 0 ? '앞서 달리는 중! ⚡' : '뒤처짐! 👻'}
                </Text>
              </Text>
            </View>
            <View style={[styles.ghostHUDIndicator, { backgroundColor: diffMeters >= 0 ? '#34C759' : '#FF6B6B' }]} />
          </View>
        )}
      </SafeAreaView>

      {/* Bottom Card */}
      <View style={styles.bottomCard}>
        {challengeMode && (
          <View style={styles.challengeProgressHeader}>
            <Text style={styles.progressText}>
              도전 목표: {targetDistance?.toFixed(2)} km ({formatTime(targetDuration || 0)})
            </Text>
            <Text style={styles.progressText}>
              달성율: {Math.min(100, Math.round((distance / (targetDistance || 1)) * 100))}%
            </Text>
          </View>
        )}

        <View style={styles.timeRow}>
          <View>
            <Text style={styles.timeLabel}>Running time</Text>
            <Text style={styles.timeValue}>{formatTime(elapsed)}</Text>
          </View>
          {isRunning ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.pauseButton}
                onPress={handlePauseResume}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isPaused ? 'play' : 'pause'}
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStartStop}
                activeOpacity={0.8}
              >
                <Ionicons name="stop" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartStop}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="flash" size={16} color="#5B5FEF" />
            <Text style={styles.statValue}>{distance.toFixed(2)}</Text>
            <Text style={styles.statLabel}>km</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="flame" size={16} color="#FF9500" />
            <Text style={styles.statValue}>{calories}</Text>
            <Text style={styles.statLabel}>kcal</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="speedometer" size={16} color="#5B5FEF" />
            <Text style={styles.statValue}>{pace}</Text>
            <Text style={styles.statLabel}>km/hr</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  gpsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gpsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5B5FEF',
  },
  markerDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(91, 95, 239, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#5B5FEF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  bottomCard: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  challengeProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
    paddingBottom: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#5B5FEF',
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  timeLabel: {
    fontSize: 13,
    color: '#8E8EA0',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 40,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: -1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  startButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5B5FEF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5B5FEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pauseButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  stopButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8EA0',
  },

  // Ghost HUD styles
  ghostHUD: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EBEBF0',
    gap: 10,
  },
  ghostHUDTextContainer: {
    flex: 1,
  },
  ghostHUDTitle: {
    fontSize: 11,
    color: '#8E8EA0',
    fontWeight: '600',
  },
  ghostHUDValue: {
    fontSize: 13,
    color: '#1A1A2E',
    marginTop: 2,
    fontWeight: '500',
  },
  ghostHUDIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
