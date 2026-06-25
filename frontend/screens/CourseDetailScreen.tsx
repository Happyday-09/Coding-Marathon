// ============================================
// 🗺️ Course Detail Screen — Map + Info
// ============================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Course } from '../types';
import { courseService } from '../services/api';

const { width } = Dimensions.get('window');

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

interface CourseDetailScreenProps {
  route: { params: { courseId: string } };
  navigation: any;
}

export default function CourseDetailScreen({ route, navigation }: CourseDetailScreenProps) {
  const { courseId } = route.params;
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourse();
  }, []);

  const loadCourse = async () => {
    try {
      const res = await courseService.getById(courseId);
      if (res.success) setCourse(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (loading || !course) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#5B5FEF" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const midPoint = course.coordinates[Math.floor(course.coordinates.length / 2)];

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: midPoint.latitude,
          longitude: midPoint.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        <Polyline
          coordinates={course.coordinates}
          strokeColor="#5B5FEF"
          strokeWidth={4}
        />
        <Marker coordinate={course.coordinates[0]}>
          <View style={styles.startMarker}>
            <Text style={styles.markerText}>S</Text>
          </View>
        </Marker>
        <Marker coordinate={course.coordinates[course.coordinates.length - 1]}>
          <View style={styles.endMarker}>
            <Text style={styles.markerText}>E</Text>
          </View>
        </Marker>
      </MapView>

      {/* Back Button */}
      <SafeAreaView style={styles.backButtonContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={22} color="#1A1A2E" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Info Card */}
      <ScrollView style={styles.infoCard} showsVerticalScrollIndicator={false}>
        <View style={styles.infoContent}>
          <Text style={styles.courseName}>{course.name}</Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color="#8E8EA0" />
            <Text style={styles.locationText}>{course.location}</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Ionicons name="resize-outline" size={20} color="#5B5FEF" />
              <Text style={styles.statBoxValue}>{course.distance} km</Text>
              <Text style={styles.statBoxLabel}>거리</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="time-outline" size={20} color="#5B5FEF" />
              <Text style={styles.statBoxValue}>{course.estimatedTime}분</Text>
              <Text style={styles.statBoxLabel}>예상 시간</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="trending-up" size={20} color={difficultyColors[course.difficulty]} />
              <Text style={[styles.statBoxValue, { color: difficultyColors[course.difficulty] }]}>
                {difficultyLabels[course.difficulty]}
              </Text>
              <Text style={styles.statBoxLabel}>난이도</Text>
            </View>
          </View>

          <Text style={styles.descriptionTitle}>코스 설명</Text>
          <Text style={styles.description}>{course.description}</Text>

          <View style={styles.tagRow}>
            {course.tags.map((tag, idx) => (
              <View key={idx} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.startRunButton} activeOpacity={0.8}>
            <Ionicons name="play" size={20} color="#FFFFFF" />
            <Text style={styles.startRunText}>이 코스로 러닝 시작</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  map: {
    width: width,
    height: 300,
  },
  backButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#5B5FEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
  infoContent: {
    padding: 24,
    paddingBottom: 40,
  },
  courseName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  locationText: {
    fontSize: 14,
    color: '#8E8EA0',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F5F5FA',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statBoxValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  statBoxLabel: {
    fontSize: 11,
    color: '#8E8EA0',
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#5A5A6E',
    lineHeight: 22,
    marginBottom: 16,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 24,
  },
  tag: {
    backgroundColor: '#F0F0FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#5B5FEF',
    fontWeight: '500',
  },
  startRunButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5B5FEF',
    borderRadius: 16,
    height: 54,
    gap: 8,
    shadowColor: '#5B5FEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startRunText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
