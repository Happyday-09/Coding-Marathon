import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { supabase } from '../lib/supabase';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'PersonalParameters'>;
  userId: string;
  onSaveSuccess?: () => void;
};

interface RunningParams {
  age: string;
  height: string;
  weight: string;
  maxHeartRate: string;
  restingHeartRate: string;
  weeklyGoalKm: string;
  targetPaceMin: string;
  targetPaceSec: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  hasRaceGoal: boolean;
  raceGoal: string;
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: '초보',
  intermediate: '중급',
  advanced: '고급',
};

export default function PersonalParametersScreen({ navigation, userId, onSaveSuccess }: Props) {
  const [params, setParams] = useState<RunningParams>({
    age: '',
    height: '',
    weight: '',
    maxHeartRate: '',
    restingHeartRate: '',
    weeklyGoalKm: '20',
    targetPaceMin: '5',
    targetPaceSec: '30',
    level: 'intermediate',
    hasRaceGoal: false,
    raceGoal: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadParams();
  }, []);

  const loadParams = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setParams((prev) => ({
        ...prev,
        age: data.age?.toString() || '',
        height: data.height?.toString() || '',
        weight: data.weight?.toString() || '',
        maxHeartRate: data.max_heart_rate?.toString() || '',
        restingHeartRate: data.resting_heart_rate?.toString() || '',
        weeklyGoalKm: data.weekly_goal_km?.toString() || '20',
        targetPaceMin: data.target_pace_min?.toString() || '5',
        targetPaceSec: data.target_pace_sec?.toString() || '30',
        level: data.running_level || 'intermediate',
        hasRaceGoal: !!data.race_goal,
        raceGoal: data.race_goal || '',
      }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      age: params.age ? parseInt(params.age) : null,
      height: params.height ? parseFloat(params.height) : null,
      weight: params.weight ? parseFloat(params.weight) : null,
      max_heart_rate: params.maxHeartRate ? parseInt(params.maxHeartRate) : null,
      resting_heart_rate: params.restingHeartRate ? parseInt(params.restingHeartRate) : null,
      weekly_goal_km: params.weeklyGoalKm ? parseFloat(params.weeklyGoalKm) : 20,
      target_pace_min: params.targetPaceMin ? parseInt(params.targetPaceMin) : 5,
      target_pace_sec: params.targetPaceSec ? parseInt(params.targetPaceSec) : 30,
      running_level: params.level,
      race_goal: params.hasRaceGoal ? params.raceGoal : null,
    }).eq('id', userId);

    setSaving(false);

    if (error) {
      Alert.alert('저장 실패', '저장 중 오류가 발생했습니다. 뒤로 가시겠습니까?', [
        { text: '계속 편집' },
        { text: '뒤로 가기', onPress: () => navigation.goBack() },
      ]);
    } else {
      Alert.alert('저장 완료', '개인 파라미터가 저장됐습니다.', [
        {
          text: '확인',
          onPress: () => {
            if (onSaveSuccess) onSaveSuccess();
            navigation.goBack();
          },
        },
      ]);
    }
  };

  const update = (key: keyof RunningParams, value: string | boolean) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const calcBMI = (): string => {
    const h = parseFloat(params.height) / 100;
    const w = parseFloat(params.weight);
    if (!h || !w) return '-';
    return (w / (h * h)).toFixed(1);
  };

  const calcMaxHR = (): string => {
    const age = parseInt(params.age);
    if (!age) return '-';
    return (220 - age).toString();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Parameters</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
          <Text style={[styles.saveBtnText, saving && { opacity: 0.5 }]}>
            {saving ? '저장 중...' : '저장'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* 기본 신체 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기본 신체 정보</Text>

          <View style={styles.rowInputs}>
            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>나이</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={params.age}
                  onChangeText={(v) => update('age', v)}
                  keyboardType="numeric"
                  placeholder="25"
                  placeholderTextColor="#C0C0CC"
                  maxLength={3}
                />
                <Text style={styles.unit}>세</Text>
              </View>
            </View>

            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>키</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={params.height}
                  onChangeText={(v) => update('height', v)}
                  keyboardType="numeric"
                  placeholder="170"
                  placeholderTextColor="#C0C0CC"
                  maxLength={5}
                />
                <Text style={styles.unit}>cm</Text>
              </View>
            </View>

            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>체중</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={params.weight}
                  onChangeText={(v) => update('weight', v)}
                  keyboardType="numeric"
                  placeholder="65"
                  placeholderTextColor="#C0C0CC"
                  maxLength={5}
                />
                <Text style={styles.unit}>kg</Text>
              </View>
            </View>
          </View>

          {/* BMI 계산 결과 */}
          {!!(params.height && params.weight) && (
            <View style={styles.calcCard}>
              <Ionicons name="body-outline" size={16} color="#5B5FEF" />
              <Text style={styles.calcText}>BMI: <Text style={styles.calcValue}>{calcBMI()}</Text></Text>
            </View>
          )}
        </View>

        {/* 심박수 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>심박수</Text>

          <View style={styles.rowInputs}>
            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>최대 심박수</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={params.maxHeartRate}
                  onChangeText={(v) => update('maxHeartRate', v)}
                  keyboardType="numeric"
                  placeholder={params.age ? calcMaxHR() : '190'}
                  placeholderTextColor="#C0C0CC"
                  maxLength={3}
                />
                <Text style={styles.unit}>bpm</Text>
              </View>
            </View>

            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>안정시 심박수</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={params.restingHeartRate}
                  onChangeText={(v) => update('restingHeartRate', v)}
                  keyboardType="numeric"
                  placeholder="60"
                  placeholderTextColor="#C0C0CC"
                  maxLength={3}
                />
                <Text style={styles.unit}>bpm</Text>
              </View>
            </View>
          </View>

          {!!(params.age && !params.maxHeartRate) && (
            <TouchableOpacity
              style={styles.calcCard}
              onPress={() => update('maxHeartRate', calcMaxHR())}
            >
              <Ionicons name="flash-outline" size={16} color="#FF9500" />
              <Text style={styles.calcText}>나이 기반 예상 최대 심박수: <Text style={styles.calcValue}>{calcMaxHR()} bpm</Text></Text>
              <Text style={styles.calcHint}>탭하여 적용</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 러닝 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>러닝 설정</Text>

          <Text style={styles.inputLabel}>러닝 레벨</Text>
          <View style={styles.levelRow}>
            {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
              <TouchableOpacity
                key={lvl}
                style={[styles.levelChip, params.level === lvl && styles.levelChipActive]}
                onPress={() => update('level', lvl)}
              >
                <Text style={[styles.levelChipText, params.level === lvl && styles.levelChipTextActive]}>
                  {LEVEL_LABELS[lvl]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.inputLabel, { marginTop: 16 }]}>주간 목표 거리</Text>
          <View style={styles.inputRowFull}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={params.weeklyGoalKm}
              onChangeText={(v) => update('weeklyGoalKm', v)}
              keyboardType="numeric"
              placeholder="20"
              placeholderTextColor="#C0C0CC"
            />
            <Text style={styles.unit}>km / 주</Text>
          </View>

          <Text style={[styles.inputLabel, { marginTop: 16 }]}>목표 페이스</Text>
          <View style={styles.paceRow}>
            <TextInput
              style={[styles.input, styles.paceInput]}
              value={params.targetPaceMin}
              onChangeText={(v) => update('targetPaceMin', v)}
              keyboardType="numeric"
              placeholder="5"
              placeholderTextColor="#C0C0CC"
              maxLength={2}
            />
            <Text style={styles.paceSep}>분</Text>
            <TextInput
              style={[styles.input, styles.paceInput]}
              value={params.targetPaceSec}
              onChangeText={(v) => update('targetPaceSec', v)}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor="#C0C0CC"
              maxLength={2}
            />
            <Text style={styles.paceSep}>초 / km</Text>
          </View>
        </View>

        {/* 목표 대회 */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>목표 대회</Text>
            <Switch
              value={params.hasRaceGoal}
              onValueChange={(v) => update('hasRaceGoal', v)}
              trackColor={{ false: '#E0E0EA', true: '#5B5FEF' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {params.hasRaceGoal && (
            <TextInput
              style={styles.textArea}
              value={params.raceGoal}
              onChangeText={(v) => update('raceGoal', v)}
              placeholder="예: 2026 서울 마라톤 풀코스 4시간 완주"
              placeholderTextColor="#C0C0CC"
              multiline
              numberOfLines={2}
            />
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  saveBtn: { padding: 4 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#5B5FEF' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  section: {
    backgroundColor: '#F8F8FC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 14 },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  rowInputs: { flexDirection: 'row', gap: 10 },
  inputBlock: { flex: 1 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#8E8EA0', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 44,
    borderWidth: 1,
    borderColor: '#EBEBF0',
  },
  inputRowFull: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 44,
    borderWidth: 1,
    borderColor: '#EBEBF0',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  unit: { fontSize: 13, color: '#8E8EA0', marginLeft: 4 },
  calcCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0FF',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    gap: 6,
  },
  calcText: { fontSize: 13, color: '#5B5FEF' },
  calcValue: { fontWeight: '700' },
  calcHint: { fontSize: 11, color: '#8E8EA0', flex: 1, textAlign: 'right' },
  levelRow: { flexDirection: 'row', gap: 8 },
  levelChip: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDDDE8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  levelChipActive: { borderColor: '#5B5FEF', backgroundColor: '#F0F0FF' },
  levelChipText: { fontSize: 14, fontWeight: '600', color: '#8E8EA0' },
  levelChipTextActive: { color: '#5B5FEF' },
  paceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  paceInput: {
    width: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EBEBF0',
    paddingHorizontal: 10,
    height: 44,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  paceSep: { fontSize: 14, color: '#8E8EA0' },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EBEBF0',
    padding: 12,
    fontSize: 15,
    color: '#1A1A2E',
    minHeight: 60,
  },
});
