import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { runService } from '../services/api';
import { RootStackParamList } from '../types';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'AIFeedback'>;
  userId: string;
  nickname: string;
};

interface FeedbackData {
  overall: string;
  strength: string;
  improvement: string;
  nextGoal: string;
}

interface Stats {
  totalKm: number;
  avgPaceMin: number;
  avgPaceSecRem: number;
  thisWeekKm: number;
  lastWeekKm: number;
  longestKm: number;
  totalRuns: number;
}

export default function AIFeedbackScreen({ navigation, userId, nickname }: Props) {
  const { height } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    setLoading(true);
    setError(null);
    setFeedback(null);
    setStats(null);

    try {
      const res = await runService.getAIFeedback(userId);
      if (res.success && res.data) {
        setStats(res.data.stats);
        setFeedback(res.data.feedback);
      } else {
        throw new Error('AI 피드백 조회 실패');
      }
    } catch (e: any) {
      setError(e?.message ?? '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const weekTrend = stats ? stats.thisWeekKm - stats.lastWeekKm : 0;

  return (
    <View style={{ height, backgroundColor: '#F5F5FA' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color="#1A1A2E" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>AI 러닝 코치</Text>
            <TouchableOpacity onPress={fetchFeedback} style={styles.refreshBtn} disabled={loading}>
              <Ionicons name="refresh" size={20} color={loading ? '#C0C0CC' : '#5B5FEF'} />
            </TouchableOpacity>
          </View>

          {/* Hero */}
          <View style={styles.heroCard}>
            <View style={styles.heroIconBg}>
              <Ionicons name="sparkles" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>{nickname}님 맞춤 주간 분석</Text>
            <Text style={styles.heroSub}>AI가 최근 러닝 기록을 분석했어요</Text>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#5B5FEF" />
              <Text style={styles.loadingText}>AI가 기록을 분석하는 중...</Text>
              <Text style={styles.loadingSubText}>맞춤 코치가 열심히 분석 중이에요 </Text>
            </View>
          ) : error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={44} color="#FF6B6B" />
              <Text style={styles.errorText}>{error}</Text>
              {!error.includes('기록이 없') && (
                <TouchableOpacity style={styles.retryBtn} onPress={fetchFeedback}>
                  <Text style={styles.retryBtnText}>다시 시도</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              {/* Quick Stats */}
              {stats && (
                <View style={styles.statsRow}>
                  <View style={styles.statChip}>
                    <Ionicons name="flash" size={14} color="#5B5FEF" />
                    <Text style={styles.statChipValue}>{stats.totalKm}km</Text>
                    <Text style={styles.statChipLabel}>총 거리</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Ionicons name="fitness" size={14} color="#FF9500" />
                    <Text style={styles.statChipValue}>{stats.totalRuns}회</Text>
                    <Text style={styles.statChipLabel}>총 러닝</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Ionicons name="trending-up" size={14} color={weekTrend >= 0 ? '#34C759' : '#FF6B6B'} />
                    <Text style={[styles.statChipValue, { color: weekTrend >= 0 ? '#34C759' : '#FF6B6B' }]}>
                      {weekTrend >= 0 ? '+' : ''}{weekTrend.toFixed(1)}km
                    </Text>
                    <Text style={styles.statChipLabel}>주간 변화</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Ionicons name="speedometer-outline" size={14} color="#5B5FEF" />
                    <Text style={styles.statChipValue}>
                      {stats.avgPaceMin}'{String(stats.avgPaceSecRem).padStart(2, '0')}"
                    </Text>
                    <Text style={styles.statChipLabel}>평균 페이스</Text>
                  </View>
                </View>
              )}

              {/* Feedback Cards */}
              {feedback && (
                <>
                  <FeedbackCard
                    icon="analytics-outline"
                    color="#5B5FEF"
                    title="전반적인 평가"
                    content={feedback.overall}
                  />
                  <FeedbackCard
                    icon="thumbs-up-outline"
                    color="#34C759"
                    title="잘 하고 있는 점 💪"
                    content={feedback.strength}
                  />
                  <FeedbackCard
                    icon="build-outline"
                    color="#FF9500"
                    title="개선 포인트 🎯"
                    content={feedback.improvement}
                  />
                  <FeedbackCard
                    icon="flag-outline"
                    color="#FF6B6B"
                    title="다음 주 목표 🚀"
                    content={feedback.nextGoal}
                    highlight
                  />
                </>
              )}

              <Text style={styles.disclaimer}>
                * AI 분석은 참고용이며, 개인 신체 상태에 따라 다를 수 있습니다.
              </Text>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function FeedbackCard({ icon, color, title, content, highlight }: {
  icon: any; color: string; title: string; content: string; highlight?: boolean;
}) {
  return (
    <View style={[styles.feedbackCard, highlight && { borderWidth: 1.5, borderColor: color }]}>
      <View style={styles.feedbackCardHeader}>
        <View style={[styles.feedbackIcon, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={[styles.feedbackTitle, highlight && { color }]}>{title}</Text>
      </View>
      <Text style={styles.feedbackContent}>{content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  backBtn: { padding: 4 },
  refreshBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  heroCard: {
    backgroundColor: '#5B5FEF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  heroIconBg: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  loadingBox: { alignItems: 'center', paddingVertical: 60, gap: 14 },
  loadingText: { fontSize: 16, fontWeight: '600', color: '#1A1A2E' },
  loadingSubText: { fontSize: 13, color: '#8E8EA0' },
  errorBox: { alignItems: 'center', paddingVertical: 48, gap: 14 },
  errorText: { fontSize: 14, color: '#8E8EA0', textAlign: 'center', paddingHorizontal: 20, lineHeight: 22 },
  retryBtn: { backgroundColor: '#5B5FEF', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statChip: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12,
    padding: 10, alignItems: 'center', gap: 3,
  },
  statChipValue: { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  statChipLabel: { fontSize: 10, color: '#8E8EA0' },
  feedbackCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 18, marginBottom: 12, gap: 10,
  },
  feedbackCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  feedbackIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  feedbackTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  feedbackContent: { fontSize: 14, color: '#3A3A4E', lineHeight: 22 },
  disclaimer: { fontSize: 11, color: '#C0C0CC', textAlign: 'center', marginTop: 4 },
});
