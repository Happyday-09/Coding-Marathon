// ============================================
// 🗺️ Course List Screen — AI Recommended Courses
// ============================================

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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User, Course } from '../types';
import { courseService } from '../services/api';

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

export default function CourseListScreen({ user, navigation }: CourseListScreenProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [aiMessage, setAiMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('전체');
  const [aiExpanded, setAiExpanded] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const [allRes, recRes] = await Promise.all([
        courseService.getAll(),
        courseService.recommend(user.level),
      ]);
      if (allRes.success) setCourses(allRes.data);
      if (recRes.success) setAiMessage(recRes.data.aiMessage);
    } catch {
      // ignore
    } finally {
      setLoading(false);
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
          <Text style={styles.statChipText}>{item.estimatedTime}분</Text>
        </View>
        <View style={[styles.difficultyChip, { backgroundColor: difficultyColors[item.difficulty] + '18' }]}>
          <Text style={[styles.difficultyText, { color: difficultyColors[item.difficulty] }]}>
            {difficultyLabels[item.difficulty]}
          </Text>
        </View>
      </View>

      {item.tags.length > 0 && (
        <View style={styles.tagRow}>
          {item.tags.slice(0, 3).map((tag, idx) => (
            <View key={idx} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  const ListHeader = (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>추천 코스</Text>
        <Text style={styles.subtitle}>AI가 추천하는 러닝 코스</Text>
      </View>

      {cleanedAiMessage ? (
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
  },
  header: {
    paddingHorizontal: 20,
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
    marginHorizontal: 20,
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
    paddingHorizontal: 20,
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
  tabBarContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5FA',
    backgroundColor: '#FFFFFF',
  },
  tabBarContent: {
    paddingHorizontal: 20,
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
