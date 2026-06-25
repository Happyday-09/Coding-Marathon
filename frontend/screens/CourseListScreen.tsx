import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User, Course } from '../types';
import { courseService } from '../services/api';
import { supabase } from '../lib/supabase';

interface CourseListScreenProps {
  user: User;
  navigation: any;
}

const difficultyColors: Record<string, string> = {
  easy: '#34C759',
  medium: '#FF9500',
  hard: '#FF3B30',
};

const difficultyLabels: Record<string, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};

// Strip markdown symbols for plain text display
const stripMarkdown = (text: string): string =>
  text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^\s*\*+\s*/gm, '• ')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const DISTANCE_OPTIONS = [3, 5, 7, 10];
const RADIUS_OPTIONS = [5, 10, 20];
const SAMPLE_LOCATION = {
  userLat: 37.5665,
  userLng: 126.978,
};

export default function CourseListScreen({ user, navigation }: CourseListScreenProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [aiMessage, setAiMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [aiExpanded, setAiExpanded] = useState(false);
  const [selectedDistance, setSelectedDistance] = useState(5);
  const [selectedRouteStyle, setSelectedRouteStyle] = useState<'one_way' | 'round_trip'>('one_way');
  const [selectedRadius, setSelectedRadius] = useState(20);
  const [userPaceMin, setUserPaceMin] = useState(5);
  const [userPaceSec, setUserPaceSec] = useState(30);

  useEffect(() => {
    loadUserPace();
  }, []);

  const loadUserPace = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('target_pace_min, target_pace_sec')
      .eq('id', user.id)
      .single();
    if (data?.target_pace_min != null) setUserPaceMin(data.target_pace_min);
    if (data?.target_pace_sec != null) setUserPaceSec(data.target_pace_sec);
  };

  const calcEstimatedTime = (distanceKm: number): string => {
    const totalSec = (userPaceMin * 60 + userPaceSec) * distanceKm;
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    if (h > 0) return `${h}시간 ${m}분`;
    return `${m}분`;
  };

  useEffect(() => {
    loadCourses();
  }, [selectedDistance, selectedRouteStyle, selectedRadius]);

  const loadCourses = async () => {
    try {
      setRecommendationLoading(true);
      const [allRes, recRes] = await Promise.all([
        courseService.getAll(),
        courseService.recommend(user.level, selectedDistance, {
          routeStyle: selectedRouteStyle,
          radiusKm: selectedRadius,
          ...SAMPLE_LOCATION,
        }),
      ]);
      if (allRes.success) setCourses(allRes.data);
      if (recRes.success) {
        setRecommendedCourses(recRes.data.recommendations || []);
        setAiMessage(recRes.data.aiMessage);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRecommendationLoading(false);
    }
  };

  const provinces = useMemo(() => {
    const list = courses.map((c) => c.province).filter((p): p is string => !!p);
    return ['전체', ...Array.from(new Set(list)).sort()];
  }, [courses]);

  const regionCounts = useMemo(() => {
    const counts: Record<string, number> = { 전체: courses.length };
    courses.forEach((c) => {
      if (c.province) counts[c.province] = (counts[c.province] || 0) + 1;
    });
    return counts;
  }, [courses]);

  const filteredCourses = useMemo(
    () => (selectedRegion === '전체' ? courses : courses.filter((c) => c.province === selectedRegion)),
    [courses, selectedRegion]
  );

  const cleanedAiMessage = useMemo(() => (aiMessage ? stripMarkdown(aiMessage) : ''), [aiMessage]);

  const renderCourse = ({ item }: { item: Course }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <Ionicons name="chevron-forward" size={18} color="#D0D0D8" />
        </View>
        <View style={styles.cardLocation}>
          <Ionicons name="location-outline" size={14} color="#8E8EA0" />
          <Text style={styles.cardLocationText}>{item.location}</Text>
        </View>
      </View>

      <View style={styles.cardStats}>
        <View style={styles.statChip}>
          <Ionicons name="resize-outline" size={14} color="#5B5FEF" />
          <Text style={styles.statChipText}>{item.distance} km</Text>
        </View>
        <View style={styles.statChip}>
          <Ionicons name="time-outline" size={14} color="#5B5FEF" />
          <Text style={styles.statChipText}>{calcEstimatedTime(item.distance)}</Text>
        </View>
        <View style={[styles.difficultyChip, { backgroundColor: difficultyColors[item.difficulty] + '18' }]}>
          <Text style={[styles.difficultyText, { color: difficultyColors[item.difficulty] }]}>
            {difficultyLabels[item.difficulty]}
          </Text>
        </View>
      </View>

      {item.tags && item.tags.length > 0 ? (
        <View style={styles.tagRow}>
          {item.tags.slice(0, 3).map((tag, idx) => (
            <View key={idx} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );

  const renderRecommendedCourse = (item: Course, index: number) => (
    <TouchableOpacity
      key={item.id}
      style={styles.recommendCard}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
    >
      <View style={styles.recommendRank}>
        <Text style={styles.recommendRankText}>{index + 1}</Text>
      </View>
      <View style={styles.recommendContent}>
        <Text style={styles.recommendName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.recommendMeta}>
          {item.distance}km {item.routeStyle === 'round_trip' ? '왕복' : '편도'}
          {item.totalDistance ? ` · 전체 ${item.totalDistance}km` : ''}
        </Text>
        {!!item.recommendationReason ? (
          <Text style={styles.recommendReason} numberOfLines={2}>{item.recommendationReason}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#B9BBC8" />
    </TouchableOpacity>
  );

  const renderOptionChip = (label: string, active: boolean, onPress: () => void) => (
    <TouchableOpacity
      key={label}
      style={[styles.optionChip, active ? styles.activeOptionChip : styles.inactiveOptionChip]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Text style={[styles.optionChipText, active ? styles.activeOptionText : styles.inactiveOptionText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const ListHeader = (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>추천 코스</Text>
        <Text style={styles.subtitle}>AI가 추천하는 러닝 코스</Text>
      </View>

      <View style={styles.filterPanel}>
        <View style={styles.filterHeader}>
          <View>
            <Text style={styles.filterTitle}>추천 조건</Text>
            <Text style={styles.filterCaption}>샘플 위치: 서울 시청 기준</Text>
          </View>
          {recommendationLoading ? <ActivityIndicator size="small" color="#5B5FEF" /> : null}
        </View>

        <Text style={styles.filterLabel}>거리</Text>
        <View style={styles.optionRow}>
          {DISTANCE_OPTIONS.map((distance) =>
              renderOptionChip(`${distance}km`, selectedDistance === distance, () => setSelectedDistance(distance))
          )}
        </View>

        <Text style={styles.filterLabel}>복귀 스타일</Text>
        <View style={styles.optionRow}>
          {renderOptionChip('편도', selectedRouteStyle === 'one_way', () => setSelectedRouteStyle('one_way'))}
          {renderOptionChip('왕복', selectedRouteStyle === 'round_trip', () => setSelectedRouteStyle('round_trip'))}
        </View>

        <Text style={styles.filterLabel}>시작점 반경</Text>
        <View style={styles.optionRow}>
          {RADIUS_OPTIONS.map((radius) =>
              renderOptionChip(`${radius}km`, selectedRadius === radius, () => setSelectedRadius(radius))
          )}
        </View>
      </View>

      {!!cleanedAiMessage ? (
        <TouchableOpacity
          style={styles.aiCard}
          activeOpacity={0.85}
          onPress={() => setAiExpanded((v) => !v)}
        >
          <View style={styles.aiIconBg}>
            <Ionicons name="sparkles" size={16} color="#5B5FEF" />
          </View>
          <View style={styles.aiTextContainer}>
            <Text style={styles.aiMessage} numberOfLines={aiExpanded ? undefined : 2}>
              {cleanedAiMessage}
            </Text>
            <Text style={styles.aiToggle}>{aiExpanded ? '접기 ▲' : '더 보기 ▼'}</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      {recommendedCourses.length > 0 ? (
        <View style={styles.recommendSection}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>AI 추천 결과</Text>
            <Text style={styles.sectionMeta}>{recommendedCourses.length}개</Text>
          </View>
          {recommendedCourses.map(renderRecommendedCourse)}
        </View>
      ) : null}
    </>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#5B5FEF" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab bar — stays fixed at top */}
      <View style={styles.tabBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {provinces.map((region) => (
            <TouchableOpacity
              key={region}
              style={[
                styles.regionTab,
                selectedRegion === region ? styles.activeRegionTab : styles.inactiveRegionTab,
              ]}
              activeOpacity={0.8}
              onPress={() => setSelectedRegion(region)}
            >
              <Text
                style={[
                  styles.regionTabText,
                  selectedRegion === region ? styles.activeRegionTabText : styles.inactiveRegionTabText,
                ]}
              >
                {region}
                <Text
                  style={
                    selectedRegion === region ? styles.activeRegionCountText : styles.inactiveRegionCountText
                  }
                >
                  {` ${regionCounts[region] || 0}`}
                </Text>
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* FlatList — header + courses scroll together */}
      <FlatList
        data={filteredCourses}
        renderItem={renderCourse}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: 26,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8EA0',
    marginTop: 2,
  },
  aiCard: {
    flexDirection: 'row',
    marginHorizontal: 26,
    marginTop: 10,
    marginBottom: 10,
    padding: 12,
    backgroundColor: '#F0F0FF',
    borderRadius: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  aiIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  aiTextContainer: {
    flex: 1,
  },
  aiMessage: {
    fontSize: 13,
    color: '#1A1A2E',
    lineHeight: 19,
  },
  aiToggle: {
    fontSize: 11,
    color: '#5B5FEF',
    fontWeight: '600',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 26,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EBEBF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A2E',
    flex: 1,
    marginRight: 8,
  },
  cardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cardLocationText: {
    fontSize: 13,
    color: '#8E8EA0',
  },
  cardStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F5FA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statChipText: {
    fontSize: 13,
    color: '#1A1A2E',
    fontWeight: '500',
  },
  difficultyChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    backgroundColor: '#F5F5FA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#8E8EA0',
  },
  filterPanel: {
    marginHorizontal: 26,
    marginTop: 10,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FAFAFC',
    borderWidth: 1,
    borderColor: '#EBEBF0',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  filterTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  filterCaption: {
    fontSize: 11,
    color: '#8E8EA0',
    marginTop: 2,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4E4E61',
    marginTop: 8,
    marginBottom: 6,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  activeOptionChip: {
    backgroundColor: '#5B5FEF',
  },
  inactiveOptionChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E2EA',
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  activeOptionText: {
    color: '#FFFFFF',
  },
  inactiveOptionText: {
    color: '#4E4E61',
  },
  recommendSection: {
    marginHorizontal: 26,
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  sectionMeta: {
    fontSize: 12,
    color: '#8E8EA0',
    fontWeight: '600',
  },
  recommendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBEBF0',
    gap: 10,
  },
  recommendRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#5B5FEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendRankText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  recommendContent: {
    flex: 1,
  },
  recommendName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  recommendMeta: {
    fontSize: 12,
    color: '#5B5FEF',
    fontWeight: '700',
    marginTop: 2,
  },
  recommendReason: {
    fontSize: 12,
    color: '#5A5A6E',
    lineHeight: 17,
    marginTop: 4,
  },
  tabBarContainer: {
    paddingTop: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5FA',
    backgroundColor: '#FFFFFF',
  },
  tabBarContent: {
    paddingHorizontal: 26,
    gap: 8,
  },
  regionTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  activeRegionTab: {
    backgroundColor: '#5B5FEF',
    shadowColor: '#5B5FEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  inactiveRegionTab: {
    backgroundColor: '#F5F5FA',
  },
  regionTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeRegionTabText: {
    color: '#FFFFFF',
  },
  inactiveRegionTabText: {
    color: '#4E4E61',
  },
  activeRegionCountText: {
    fontSize: 11,
    color: '#E0E0FF',
    fontWeight: '500',
  },
  inactiveRegionCountText: {
    fontSize: 11,
    color: '#8E8EA0',
    fontWeight: '500',
  },
});
