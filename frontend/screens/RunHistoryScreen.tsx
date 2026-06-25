// ============================================
// 📋 Run History Screen
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
import { User, Run } from '../types';
import { runService } from '../services/api';

interface RunHistoryScreenProps {
  user: User;
}

export default function RunHistoryScreen({ user }: RunHistoryScreenProps) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    try {
      const res = await runService.getByUser(user.id);
      if (res.success) setRuns(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const months = ['1월', '2월', '3월', '4월', '5월', '6월',
      '7월', '8월', '9월', '10월', '11월', '12월'];
    return `${months[date.getMonth()]} ${date.getDate()}일`;
  };

  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}분 ${s}초`;
  };

  const renderItem = ({ item, index }: { item: Run; index: number }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.7}>
      <View style={styles.cardLeft}>
        <View style={[styles.iconBg, { backgroundColor: index % 2 === 0 ? '#F0F0FF' : '#FFF0F0' }]}>
          <Ionicons
            name="body"
            size={26}
            color={index % 2 === 0 ? '#5B5FEF' : '#FF6B6B'}
          />
        </View>
      </View>
      <View style={styles.cardCenter}>
        <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
        <Text style={styles.cardDistance}>{item.distance.toFixed(2)} km</Text>
        <Text style={styles.cardMeta}>
          {item.calories} kcal  ·  {(item.distance / (item.duration / 3600)).toFixed(1)} km/hr
        </Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardDuration}>{formatDuration(item.duration)}</Text>
        <Ionicons name="chevron-forward" size={16} color="#D0D0D8" />
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
        <Text style={styles.title}>러닝 기록</Text>
        <Text style={styles.subtitle}>총 {runs.length}회</Text>
      </View>
      <FlatList
        data={runs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="footsteps-outline" size={48} color="#D0D0D8" />
            <Text style={styles.emptyText}>아직 러닝 기록이 없어요</Text>
            <Text style={styles.emptySubtext}>첫 러닝을 시작해보세요!</Text>
          </View>
        }
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
    paddingBottom: 12,
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
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5FA',
  },
  cardLeft: {
    marginRight: 14,
  },
  iconBg: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCenter: {
    flex: 1,
  },
  cardDate: {
    fontSize: 12,
    color: '#8E8EA0',
    marginBottom: 2,
  },
  cardDistance: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  cardMeta: {
    fontSize: 12,
    color: '#8E8EA0',
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  cardDuration: {
    fontSize: 13,
    color: '#5B5FEF',
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    marginTop: 80,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8EA0',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#B0B0C0',
  },
});
