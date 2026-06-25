// ============================================
// 🗺️ Course List Screen — AI Recommended Courses
// ============================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
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

export default function CourseListScreen({ user, navigation }: CourseListScreenProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [aiMessage, setAiMessage] = useState('');
  const [loading, setLoading] = useState(true);

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

  const renderCourse = ({ item }: { item: Course }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardName}>{item.name}</Text>
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

      <View style={styles.tagRow}>
        {item.tags.slice(0, 3).map((tag, idx) => (
          <View key={idx} style={styles.tag}>
            <Text style={styles.tagText}>#{tag}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
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
      <View style={styles.header}>
        <Text style={styles.title}>추천 코스</Text>
        <Text style={styles.subtitle}>AI가 추천하는 러닝 코스</Text>
      </View>

      {/* AI Recommendation Message */}
      {aiMessage ? (
        <View style={styles.aiCard}>
          <View style={styles.aiIconBg}>
            <Ionicons name="sparkles" size={18} color="#5B5FEF" />
          </View>
          <Text style={styles.aiMessage}>{aiMessage}</Text>
        </View>
      ) : null}

      <FlatList
        data={courses}
        renderItem={renderCourse}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
    marginTop: 12,
    marginBottom: 8,
    padding: 14,
    backgroundColor: '#F0F0FF',
    borderRadius: 14,
    gap: 10,
    alignItems: 'flex-start',
  },
  aiIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiMessage: {
    flex: 1,
    fontSize: 13,
    color: '#1A1A2E',
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 8,
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
});
