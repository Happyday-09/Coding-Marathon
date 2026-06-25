// ============================================
// 🏃 Run Screen — Running Tracker with Map (Challenge Mode Supported)
// ============================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
  Modal,
  ScrollView,
  StatusBar,
} from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { User, RoutePoint } from '../types';
import { battleService } from '../services/api';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

// Haversine formula: distance in km between two GPS coords
function haversineKm(a: RoutePoint, b: RoutePoint): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

interface RunScreenProps {
  user: User;
  route?: {
    params?: {
      battleId?: string;
      challengeMode?: boolean;
      targetDistance?: number;
      targetDuration?: number;
      challengerName?: string;
      courseCoordinates?: RoutePoint[];
    };
  };
  navigation?: any;
}

export default function RunScreen({ user, route, navigation }: RunScreenProps) {
  const battleId = route?.params?.battleId;
  const challengeMode = route?.params?.challengeMode;
  const targetDistance = route?.params?.targetDistance;
  const targetDuration = route?.params?.targetDuration;
  const challengerName = route?.params?.challengerName;
  const courseCoordinates = route?.params?.courseCoordinates;

  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [calories, setCalories] = useState(0);
  const [trackedRoute, setTrackedRoute] = useState<RoutePoint[]>([]);
  const [currentLocation, setCurrentLocation] = useState<RoutePoint | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [pendingRun, setPendingRun] = useState<{ distance: number; elapsed: number; calories: number } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<MapView>(null);
  const summaryMapRef = useRef<MapView>(null);

  // Animate summary map to zoom in on modal load
  useEffect(() => {
    if (showSummary) {
      const lat = trackedRoute.length > 0
        ? trackedRoute[Math.floor(trackedRoute.length / 2)].latitude
        : (currentLocation?.latitude ?? 37.5665);
      const lng = trackedRoute.length > 0
        ? trackedRoute[Math.floor(trackedRoute.length / 2)].longitude
        : (currentLocation?.longitude ?? 126.978);

      // Give a tiny timeout for modal rendering to complete before running animation
      setTimeout(() => {
        summaryMapRef.current?.animateToRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.0006,
          longitudeDelta: 0.0006,
        }, 800);
      }, 300);
    }
  }, [showSummary, trackedRoute, currentLocation]);

  // Request GPS permission on mount
  useEffect(() => {
    requestLocationPermission();
    return () => {
      locationSubRef.current?.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission('granted');
        // Get initial position
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const point: RoutePoint = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setCurrentLocation(point);
        mapRef.current?.animateToRegion({
          latitude: point.latitude,
          longitude: point.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      } else {
        setLocationPermission('denied');
        Alert.alert(
          'GPS 권한 필요',
          '러닝 트래킹을 위해 위치 권한이 필요합니다. 설정에서 권한을 허용해주세요.',
          [{ text: '확인' }]
        );
      }
    } catch (e) {
      setLocationPermission('denied');
    }
  };

  const startGpsTracking = async () => {
    try {
      locationSubRef.current?.remove();
      locationSubRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (loc) => {
          const newPoint: RoutePoint = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            timestamp: new Date(loc.timestamp).toISOString(),
          };
          setGpsAccuracy(loc.coords.accuracy ?? null);
          setCurrentLocation(newPoint);

          setTrackedRoute((prev) => {
            const updated = [...prev, newPoint];
            if (prev.length > 0) {
              const last = prev[prev.length - 1];
              const delta = haversineKm(last, newPoint);
              if (delta < 0.1) {
                setDistance((d) => Math.round((d + delta) * 1000) / 1000);
                setCalories((c) => c + Math.round(delta * 60));
              }
            }
            return updated;
          });

          mapRef.current?.animateToRegion({
            latitude: newPoint.latitude,
            longitude: newPoint.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 500);
        }
      );
    } catch (e: any) {
      console.error('GPS 추적 시작 실패:', e?.message);
    }
  };

  const stopGpsTracking = () => {
    locationSubRef.current?.remove();
    locationSubRef.current = null;
  };

  // Course coordinates used only for ghost competitor display / map overlay
  const activeRoute = courseCoordinates && courseCoordinates.length > 0
    ? courseCoordinates
    : [];

  // Center map on course start point when course is selected
  useEffect(() => {
    if (activeRoute.length > 0 && mapRef.current) {
      const startPoint = activeRoute[0];
      mapRef.current.animateToRegion({
        latitude: startPoint.latitude,
        longitude: startPoint.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
  }, [route?.params]);

  const [coachMessage, setCoachMessage] = useState<string | null>(null);

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

  // Calculate Ghost Coordinate along activeRoute based on ratio of distance
  const ghostCoordinate = useMemo(() => {
    if (!challengeMode || !targetDistance || activeRoute.length === 0) return null;
    const ratio = Math.min(1, ghostProgress / targetDistance);
    const index = Math.min(activeRoute.length - 1, Math.floor(ratio * activeRoute.length));
    return activeRoute[index] || activeRoute[0] || null;
  }, [challengeMode, ghostProgress, targetDistance, activeRoute]);

  const playCoachingVoice = (message: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'ko-KR';
      utterance.rate = 1.15; // Slightly faster for dynamic guidance
      window.speechSynthesis.speak(utterance);
    }
  };

  // Start Coaching Guidance
  useEffect(() => {
    if (isRunning && elapsed === 0) {
      const startMsg = challengeMode
        ? `${challengerName || '친구'}의 기록에 도전을 시작합니다. 화이팅!`
        : '러닝을 시작합니다. 즐거운 러닝 되세요!';
      setCoachMessage(startMsg);
      playCoachingVoice(startMsg);

      const timeout = setTimeout(() => {
        setCoachMessage(null);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [isRunning, elapsed]);

  // Periodic Coaching Guidance (every 30 seconds)
  useEffect(() => {
    if (isRunning && !isPaused && challengeMode && elapsed > 0 && elapsed % 30 === 0) {
      let msg = '';
      if (diffMeters > 50) {
        msg = `잘하고 계십니다! 상대방보다 ${diffMeters}미터 앞서 달리는 중입니다. 페이스를 유지하세요!`;
      } else if (diffMeters > 0) {
        msg = `상대방보다 ${diffMeters}미터 앞서고 있습니다. 조금만 더 힘내세요!`;
      } else if (diffMeters < -50) {
        msg = `상대방보다 ${Math.abs(diffMeters)}미터 뒤처지고 있습니다. 속도를 더 내셔야 합니다!`;
      } else {
        msg = `상대방보다 ${Math.abs(diffMeters)}미터 뒤처져 있습니다. 포기하지 마세요.`;
      }
      setCoachMessage(msg);
      playCoachingVoice(msg);

      const timeout = setTimeout(() => {
        setCoachMessage(null);
      }, 6000);
      return () => clearTimeout(timeout);
    }
  }, [elapsed, isRunning, isPaused, challengeMode]);

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

  // Automated Win/Loss Trigger when reaching the target distance
  useEffect(() => {
    if (challengeMode && isRunning && targetDistance && distance >= targetDistance) {
      setIsRunning(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
      stopGpsTracking();
      setPendingRun({ distance, elapsed, calories });
      setShowSummary(true);
    }
  }, [distance, challengeMode, isRunning, targetDistance]);

  const formatTime = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Pace in min/km
  const paceDisplay = elapsed > 0 && distance > 0
    ? (() => {
        const minPerKm = elapsed / 60 / distance;
        const m = Math.floor(minPerKm);
        const s = Math.round((minPerKm - m) * 60);
        return `${m}'${String(s).padStart(2, '0')}"`;
      })()
    : "--'--\"";

  const handleStartStop = async () => {
    if (!isRunning) {
      // Start run
      if (locationPermission === 'denied' || locationPermission === 'pending') {
        Alert.alert('GPS 권한 없음', '위치 권한을 허용해야 러닝을 시작할 수 있습니다.', [
          { text: '확인' },
        ]);
        return;
      }
      setIsRunning(true);
      setIsPaused(false);
      setElapsed(0);
      setDistance(0);
      setCalories(0);
      setTrackedRoute(currentLocation ? [currentLocation] : []);
      await startGpsTracking();
    } else if (!isPaused) {
      // First stop: pause the run
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
      stopGpsTracking();
    }
  };

  const handleFinishRun = () => {
    setIsRunning(false);
    setIsPaused(false);
    if (timerRef.current) clearInterval(timerRef.current);
    stopGpsTracking();
    setPendingRun({ distance, elapsed, calories });
    setShowSummary(true);
  };

  const handleConfirmSave = async () => {
    if (!pendingRun) return;
    setShowSummary(false);
    if (challengeMode) {
      await handleCompleteChallenge(pendingRun.distance, pendingRun.elapsed, pendingRun.calories);
      setPendingRun(null);
    } else {
      const id = await saveRunToSupabase(pendingRun.distance, pendingRun.elapsed, pendingRun.calories);
      setPendingRun(null);
      if (id) {
        resetRunState();
        Alert.alert('기록 완료 🏃', '오늘의 러닝이 성공적으로 저장되었습니다!');
      } else {
        Alert.alert('저장 실패', '러닝 기록 저장에 실패했습니다.\n인터넷 연결과 로그인을 확인해주세요.');
      }
    }
  };

  const handleDiscard = () => {
    setShowSummary(false);
    setPendingRun(null);
    resetRunState();
  };

  const handlePauseResume = () => {
    if (isPaused) {
      setIsPaused(false);
      startGpsTracking();
    } else {
      setIsPaused(true);
      stopGpsTracking();
    }
  };

  const saveRunToSupabase = async (d: number, t: number, c: number): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('저장 실패', '로그인 세션이 없습니다. 다시 로그인해주세요.');
        return null;
      }

      const endedAt = new Date();
      const startedAt = new Date(endedAt.getTime() - t * 1000);
      const avgPaceSec = d > 0 ? Math.round(t / d) : 0;

      const { data: runData, error: runError } = await supabase
        .from('runs')
        .insert({
          user_id: session.user.id,
          distance_m: Math.round(d * 1000),
          duration_sec: t,
          avg_pace_sec_per_km: avgPaceSec,
          calories_kcal: c,
          started_at: startedAt.toISOString(),
          ended_at: endedAt.toISOString(),
          visibility: 'private',
        })
        .select('id')
        .single();

      if (runError) {
        Alert.alert('DB 저장 실패', runError.message);
        return null;
      }

      const runId = runData?.id;

      // Save GPS route points
      if (runId && trackedRoute.length > 0) {
        const validPoints = trackedRoute.filter(
          (pt) => pt.latitude !== 0 && pt.longitude !== 0 &&
            Math.abs(pt.latitude) <= 90 && Math.abs(pt.longitude) <= 180
        );
        if (validPoints.length > 0) {
          const points = validPoints.map((pt, idx) => ({
            run_id: runId,
            seq: idx,
            lng: pt.longitude,
            lat: pt.latitude,
            recorded_at: pt.timestamp ?? null,
            segment_distance_m: 0,
            distance_from_start_m: 0,
          }));
          const { error: ptErr } = await supabase.from('run_points').insert(points);
          if (ptErr) {
            console.error('run_points 저장 실패:', ptErr.message, ptErr.code);
          }
        } else {
          console.log('유효한 GPS 좌표 없음');
        }
      } else {
        console.log('trackedRoute 없음:', trackedRoute.length);
      }

      return runId ?? null;
    } catch (e: any) {
      Alert.alert('저장 오류', String(e?.message ?? e));
      return null;
    }
  };

  const resetRunState = () => {
    setElapsed(0);
    setDistance(0);
    setCalories(0);
    setTrackedRoute([]);
    setIsRunning(false);
    setIsPaused(false);
  };

  const handleCompleteChallenge = async (d: number, t: number, c: number) => {
    const runId = await saveRunToSupabase(d, t, c);

    if (!runId) {
      Alert.alert('저장 실패', '러닝 기록 저장에 실패했습니다.');
      return;
    }

    resetRunState();

    if (battleId) {
      try {
        const battleRes = await battleService.complete(battleId, runId);
        Alert.alert('결과 정산 ⚔️', battleRes.success ? battleRes.message : '도전이 완료되었습니다!');
      } catch {
        Alert.alert('기록 완료 🏃', '러닝 기록은 저장되었습니다. 배틀 정산은 나중에 확인해주세요.');
      }
    } else {
      Alert.alert('기록 완료 🏃', '도전 기록이 저장되었습니다!');
    }

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
  };

  const currentPosition = trackedRoute.length > 0
    ? trackedRoute[trackedRoute.length - 1]
    : currentLocation ?? { latitude: 37.5665, longitude: 126.978 };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: currentLocation?.latitude ?? 37.5665,
          longitude: currentLocation?.longitude ?? 126.978,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={locationPermission === 'granted'}
        followsUserLocation={isRunning && !isPaused}
      >
        {trackedRoute.length > 1 && (
          <Polyline
            coordinates={trackedRoute}
            strokeColor="#5B5FEF"
            strokeWidth={4}
          />
        )}
        {currentPosition?.latitude != null && currentPosition?.longitude != null && (
          <Marker coordinate={currentPosition}>
            <View style={styles.markerDot}>
              <View style={styles.markerInner} />
            </View>
          </Marker>
        )}
        {challengeMode && isRunning && ghostCoordinate && (
          <Marker coordinate={ghostCoordinate}>
            <View style={styles.ghostMarkerDot}>
              <View style={styles.ghostMarkerInner}>
                <Ionicons name="person" size={12} color="#FFFFFF" />
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Coaching Overlay Message */}
      {coachMessage && (
        <View style={styles.coachCard}>
          <View style={styles.coachIconBg}>
            <Ionicons name="sparkles" size={18} color="#FF9500" />
          </View>
          <Text style={styles.coachText}>{coachMessage}</Text>
        </View>
      )}

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
            <View style={[
              styles.gpsDot,
              { backgroundColor: locationPermission === 'granted' ? '#34C759' : '#FF3B30' }
            ]} />
            <Text style={[
              styles.gpsText,
              { color: locationPermission === 'granted' ? '#34C759' : '#FF3B30' }
            ]}>
              {locationPermission === 'pending' ? 'GPS...' : locationPermission === 'granted'
                ? gpsAccuracy != null ? `GPS ±${Math.round(gpsAccuracy)}m` : 'GPS 연결됨'
                : 'GPS 없음'}
            </Text>
          </View>
        </View>

        {/* Ghost Competitor Progress HUD */}
        {challengeMode && isRunning && (
          <View style={styles.ghostHUD}>
            <Ionicons name="person" size={20} color="#5B5FEF" style={{ marginTop: 2 }} />
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
                style={[styles.stopButton, isPaused && styles.stopButtonActive]}
                onPress={isPaused ? handleFinishRun : handleStartStop}
                activeOpacity={0.8}
              >
                <Ionicons name="stop" size={20} color={isPaused ? '#FFFFFF' : '#FF6B6B'} />
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
            <Text style={styles.statValue}>{paceDisplay}</Text>
            <Text style={styles.statLabel}>min/km</Text>
          </View>
        </View>
      </View>

      {/* Run Summary Modal */}
      <Modal visible={showSummary} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>러닝 요약</Text>
              <TouchableOpacity onPress={handleDiscard}>
                <Ionicons name="close" size={24} color="#1A1A2E" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              {/* Route Map */}
              {trackedRoute.length > 0 || currentLocation ? (
                <MapView
                  ref={summaryMapRef}
                  style={styles.summaryMap}
                  scrollEnabled={true}
                  zoomEnabled={true}
                  initialRegion={{
                    latitude: trackedRoute.length > 0 
                      ? trackedRoute[Math.floor(trackedRoute.length / 2)].latitude 
                      : (currentLocation?.latitude ?? 37.5665),
                    longitude: trackedRoute.length > 0 
                      ? trackedRoute[Math.floor(trackedRoute.length / 2)].longitude 
                      : (currentLocation?.longitude ?? 126.978),
                    latitudeDelta: 0.0006,
                    longitudeDelta: 0.0006,
                  }}
                >
                  {trackedRoute.length > 1 && (
                    <Polyline coordinates={trackedRoute} strokeColor="#5B5FEF" strokeWidth={5} />
                  )}
                  {(trackedRoute.length === 1 || (trackedRoute.length === 0 && currentLocation)) && (
                    <Marker coordinate={trackedRoute[0] ?? currentLocation!} />
                  )}
                </MapView>
              ) : (
                <View style={styles.summaryMapEmpty}>
                  <Ionicons name="map-outline" size={24} color="#C0C0D0" />
                  <Text style={styles.summaryMapEmptyText}>GPS 경로 없음</Text>
                </View>
              )}

              {/* Stats Grid */}
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Ionicons name="flash" size={24} color="#5B5FEF" />
                  <Text style={styles.summaryValue}>{pendingRun?.distance.toFixed(2)}</Text>
                  <Text style={styles.summaryLabel}>km</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Ionicons name="time-outline" size={24} color="#FF9500" />
                  <Text style={styles.summaryValue}>{formatTime(pendingRun?.elapsed ?? 0)}</Text>
                  <Text style={styles.summaryLabel}>시간</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Ionicons name="speedometer" size={24} color="#5B5FEF" />
                  <Text style={styles.summaryValue}>
                    {pendingRun && pendingRun.distance > 0
                      ? (() => {
                          const minPerKm = (pendingRun.elapsed / 60) / pendingRun.distance;
                          const m = Math.floor(minPerKm);
                          const s = Math.round((minPerKm - m) * 60);
                          return `${m}'${String(s).padStart(2, '0')}"`;
                        })()
                      : '--\'--"'}
                  </Text>
                  <Text style={styles.summaryLabel}>페이스</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Ionicons name="flame" size={24} color="#FF6B6B" />
                  <Text style={styles.summaryValue}>{pendingRun?.calories}</Text>
                  <Text style={styles.summaryLabel}>kcal</Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              {/* Details */}
              <View style={styles.detailsSection}>
                <Text style={styles.detailsTitle}>상세 정보</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>거리</Text>
                  <Text style={styles.detailValue}>{pendingRun?.distance.toFixed(3)} km</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>소요 시간</Text>
                  <Text style={styles.detailValue}>{formatTime(pendingRun?.elapsed ?? 0)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>칼로리 소모</Text>
                  <Text style={styles.detailValue}>{pendingRun?.calories} kcal</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>GPS 포인트</Text>
                  <Text style={styles.detailValue}>{trackedRoute.length}개</Text>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard}>
                <Text style={styles.discardBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleConfirmSave}>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>{challengeMode ? '결과 전송' : '저장하기'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 26,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 12 : 12,
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
    gap: 6,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gpsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34C759',
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
  stopButtonActive: {
    backgroundColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
  ghostMarkerDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(142, 142, 160, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  ghostMarkerInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#8E8EA0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  coachCard: {
    position: 'absolute',
    top: 150,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#FF9500',
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
  },
  coachIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF0D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachText: {
    flex: 1,
    fontSize: 13,
    color: '#1A1A2E',
    fontWeight: '700',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  summaryMap: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  summaryMapEmpty: {
    width: '100%',
    height: 150,
    borderRadius: 16,
    backgroundColor: '#F5F5FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 6,
  },
  summaryMapEmptyText: { fontSize: 12, color: '#C0C0D0' },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: '#F5F5FA',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#8E8EA0',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F0F0F5',
    marginVertical: 16,
  },
  detailsSection: {
    paddingBottom: 20,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5FA',
  },
  detailLabel: {
    fontSize: 13,
    color: '#8E8EA0',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1A1A2E',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  discardBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F5F5FA',
    alignItems: 'center',
  },
  discardBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8EA0',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#5B5FEF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
