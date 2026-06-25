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

const matchSimplifiedProvince = (canonical: string | null | undefined, simplified: string): boolean => {
  const safeCanonical = canonical || '전체';
  if (safeCanonical === '전체' && simplified === '전체') return true;
  if (safeCanonical === '전체' || simplified === '전체') return false;

  const provinceMap: Record<string, string[]> = {
    '서울': ['서울', '서울특별시', '서울별시'],
    '경기': ['경기', '경기도'],
    '인천': ['인천', '인천광역시'],
    '강원': ['강원', '강원도', '강원특별자치도'],
    '충북': ['충북', '충청북도'],
    '충남': ['충남', '충청남도'],
    '대전': ['대전', '대전광역시'],
    '세종': ['세종', '세종특별자치시'],
    '전북': ['전북', '전라북도', '전북특별자치도'],
    '전남': ['전남', '전라남도'],
    '광주': ['광주', '광주광역시'],
    '경북': ['경북', '경상북도', '경상도'],
    '경남': ['경남', '경상남도'],
    '대구': ['대구', '대구광역시'],
    '울산': ['울산', '울산광역시'],
    '부산': ['부산', '부산광역시'],
    '제주': ['제주', '제주특별자치도', '제주도'],
  };

  const aliases = provinceMap[simplified];
  if (!aliases) return false;
  return aliases.some(alias => safeCanonical.includes(alias));
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
  }, [selectedDistance, selectedRouteStyle, selectedRadius, selectedRegion]);

  const loadCourses = async () => {
    try {
      setRecommendationLoading(true);
      const [allRes, recRes] = await Promise.all([
        courseService.getAll(),
        courseService.recommend(user.level, selectedDistance, {
          routeStyle: selectedRouteStyle,
          radiusKm: selectedRadius,
          province: selectedRegion,
        }),
      ]);
      if (allRes.success) setCourses(allRes.data);
      if (recRes.success) {
        setRecommendedCourses(recRes.data.recommendations || []);
        setAiMessage(recRes.data.aiMessage);
      }
    } catch (error) {
      console.error('loadCourses failed:', error);
    } finally {
      setLoading(false);
      setRecommendationLoading(false);
    }
  };

  const provinces = ['전체'];

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
          <View style={{ flex: 1 }}>
            <Text style={styles.filterTitle}>추천 조건</Text>
            <Text style={styles.filterCaption}>📍 선택된 지역: {selectedRegion}</Text>
          </View>
          {recommendationLoading ? <ActivityIndicator size="small" color="#5B5FEF" /> : null}
        </View>

        <Text style={styles.filterLabel}>지역</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.innerProvinceScroll}
          contentContainerStyle={styles.innerProvinceScrollContent}
        >
          {['전체', '서울', '경기', '인천', '강원', '충북', '충남', '대전', '세종', '전북', '전남', '광주', '경북', '경남', '대구', '울산', '부산', '제주'].map((prov) => {
            const isSelected = matchSimplifiedProvince(selectedRegion, prov);
            
            const handlePress = () => {
              if (prov === '전체') {
                setSelectedRegion('전체');
              } else {
                const provinceMap: Record<string, string> = {
                  '서울': '서울특별시',
                  '경기': '경기도',
                  '인천': '인천광역시',
                  '강원': '강원도',
                  '충북': '충청북도',
                  '충남': '충청남도',
                  '대전': '대전광역시',
                  '세종': '세종특별자치시',
                  '전북': '전라북도',
                  '전남': '전라남도',
                  '광주': '광주광역시',
                  '경북': '경상북도',
                  '경남': '경상남도',
                  '대구': '대구광역시',
                  '울산': '울산광역시',
                  '부산': '부산광역시',
                  '제주': '제주특별자치도',
                };
                setSelectedRegion(provinceMap[prov] || prov);
              }
            };

            return renderOptionChip(prov, isSelected, handlePress);
          })}
        </ScrollView>

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
      ) : !recommendationLoading && !loading ? (
        <View style={styles.emptyRecommendCard}>
          <View style={styles.emptyRecommendIconBg}>
            <Ionicons name="map-outline" size={28} color="#5B5FEF" />
          </View>
          <Text style={styles.emptyRecommendTitle}>
            추천 코스가 없습니다
          </Text>
          <Text style={styles.emptyRecommendDesc}>
            {selectedRegion === '전체' ? '전국' : selectedRegion} 반경 {selectedRadius}km 내에{`\n`}해당하는 추천 코스가 없습니다
          </Text>
          <Text style={styles.emptyRecommendHint}>
            반경을 넓히거나 다른 조건을 변경해보세요
          </Text>
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
  // Empty recommendation state
  emptyRecommendCard: {
    marginHorizontal: 26,
    marginBottom: 14,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#F7F7FF',
    borderWidth: 1,
    borderColor: '#E0E0FF',
    alignItems: 'center',
    gap: 8,
  },
  emptyRecommendIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyRecommendTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  emptyRecommendDesc: {
    fontSize: 13,
    color: '#5A5A6E',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyRecommendHint: {
    fontSize: 12,
    color: '#8E8EA0',
    marginTop: 4,
  },
  innerProvinceScroll: {
    marginVertical: 4,
    minHeight: 40,
  },
  innerProvinceScrollContent: {
    paddingRight: 16,
    gap: 8,
  },
});
