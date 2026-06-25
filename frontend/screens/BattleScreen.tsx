// ============================================
// ⚔️ Battle Screen — Friend Battles (Ghost Challenger Mode)
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
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User, Battle, Run } from '../types';
import { battleService, authService, runService } from '../services/api';

interface BattleScreenProps {
  user: User;
  navigation: any;
}

const statusColors: Record<string, string> = {
  pending: '#FF9500',
  active: '#5B5FEF',
  done: '#34C759',
};

const statusLabels: Record<string, string> = {
  pending: '도전대기',
  active: '도전진행',
  done: '도전완료',
};

const formatDuration = (secs: number): string => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}분 ${s}초`;
};

export default function BattleScreen({ user, navigation }: BattleScreenProps) {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);

  // Challenge creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [friends, setFriends] = useState<User[]>([]);
  const [myRuns, setMyRuns] = useState<Run[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBattles();
    // Poll list every 10 seconds for real-time updates when testing
    const interval = setInterval(loadBattles, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showCreateModal) {
      loadFriendsAndRuns();
    }
  }, [showCreateModal]);

  const loadBattles = async () => {
    try {
      const res = await battleService.getByUser(user.id);
      if (res.success) setBattles(res.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const loadFriendsAndRuns = async () => {
    try {
      const usersRes = await authService.getUsers();
      if (usersRes.success) {
        setFriends(usersRes.data.filter((u: User) => u.id !== user.id));
      }
      const runsRes = await runService.getByUser(user.id);
      if (runsRes.success) {
        // Sort runs: latest first
        const sortedRuns = [...runsRes.data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setMyRuns(sortedRuns);
      }
    } catch (e) {
      console.error('Failed to load friends and runs:', e);
    }
  };

  const handleAcceptAndStart = async (battle: Battle) => {
    try {
      const res = await battleService.accept(battle.id);
      if (res.success) {
        Alert.alert('🔥 도전 수락!', res.message || '고스트를 꺾고 신기록을 세워보세요!');
        loadBattles();
        // Navigate to Run Tab and pass challenge parameters
        navigation.navigate('Run', {
          battleId: battle.id,
          challengeMode: true,
          targetDistance: battle.targetDistance,
          targetDuration: battle.targetDuration,
          challengerName: battle.challengerName,
        });
      }
    } catch {
      Alert.alert('오류', '도전 수락에 실패했습니다.');
    }
  };

  const handleStartChallenge = (battle: Battle) => {
    navigation.navigate('Run', {
      battleId: battle.id,
      challengeMode: true,
      targetDistance: battle.targetDistance,
      targetDuration: battle.targetDuration,
      challengerName: battle.challengerName,
    });
  };

  const handleCreateChallenge = async () => {
    if (!selectedFriend || !selectedRun) {
      Alert.alert('알림', '도전할 상대와 보낼 내 러닝 기록을 선택해 주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await battleService.create(user.id, selectedFriend.id, selectedRun.id);
      if (res.success) {
        Alert.alert('발송 성공 ⚔️', res.message || '친구에게 기록 도전장을 보냈습니다!');
        setShowCreateModal(false);
        setSelectedFriend(null);
        setSelectedRun(null);
        loadBattles();
      }
    } catch (error) {
      Alert.alert('오류', '도전장 발송에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderBattle = ({ item }: { item: Battle }) => {
    const isChallenger = item.challengerId === user.id;
    const opponentName = isChallenger ? item.opponentName : item.challengerName;
    const defenderWon = item.winnerId === item.opponentId;
    const resultText = item.winnerId
      ? item.winnerId === user.id
        ? '도전 격파! 승리 🎉'
        : `${isChallenger ? '내 기록 수성 성공 👑' : '도전 실패... 💪'}`
      : '';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '18' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColors[item.status] }]} />
            <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
              {statusLabels[item.status]}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString('ko-KR', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>

        {/* Challenge Goal Info */}
        <View style={styles.challengeBox}>
          <Text style={styles.challengeLabel}>
            {isChallenger ? '내가 보낸 도전 기록' : `${opponentName}님의 기록 도전장`}
          </Text>
          <View style={styles.recordRow}>
            <View style={styles.recordItem}>
              <Text style={styles.recordValue}>{item.targetDistance.toFixed(2)}</Text>
              <Text style={styles.recordUnit}>km</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.recordItem}>
              <Text style={styles.recordValue}>{formatDuration(item.targetDuration)}</Text>
              <Text style={styles.recordUnit}>목표 시간</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.recordItem}>
              <Text style={styles.recordValue}>{item.targetPace.toFixed(2)}</Text>
              <Text style={styles.recordUnit}>페이스</Text>
            </View>
          </View>
        </View>

        {/* Current status display based on battle status */}
        {item.status === 'pending' && (
          <View style={styles.actionSection}>
            {isChallenger ? (
              <View style={styles.infoBadge}>
                <Ionicons name="hourglass-outline" size={16} color="#8E8EA0" />
                <Text style={styles.infoBadgeText}>친구가 도전을 수락하길 기다리는 중</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAcceptAndStart(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.acceptButtonText}>기록 깨기 도전장 수락</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {item.status === 'active' && (
          <View style={styles.actionSection}>
            {isChallenger ? (
              <View style={[styles.infoBadge, styles.activeInfoBadge]}>
                <Ionicons name="play-outline" size={16} color="#5B5FEF" />
                <Text style={[styles.infoBadgeText, styles.activeInfoText]}>
                  친구가 현재 내 기록에 도전하고 있습니다!
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.runButton}
                onPress={() => handleStartChallenge(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="play" size={16} color="#FFFFFF" />
                <Text style={styles.runButtonText}>기록 깨기 달리기 시작</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {item.status === 'done' && (
          <View style={styles.doneSection}>
            <View style={styles.doneDivider} />
            <View style={styles.vsResults}>
              <View style={styles.vsResultItem}>
                <Text style={styles.resultLabel}>{item.challengerName}</Text>
                <Text style={styles.resultVal}>{formatDuration(item.targetDuration)}</Text>
              </View>
              <Text style={styles.vsSymbol}>VS</Text>
              <View style={styles.vsResultItem}>
                <Text style={styles.resultLabel}>{item.opponentName} (도전)</Text>
                <Text style={styles.resultVal}>
                  {item.opponentDuration ? formatDuration(item.opponentDuration) : 'DNF'}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.resultBanner,
                {
                  backgroundColor:
                    item.winnerId === user.id ? '#E8E9FD' : '#FFF0F0',
                },
              ]}
            >
              <Ionicons
                name={item.winnerId === user.id ? 'trophy' : 'close-circle-outline'}
                size={18}
                color={item.winnerId === user.id ? '#5B5FEF' : '#FF6B6B'}
              />
              <Text
                style={[
                  styles.resultText,
                  { color: item.winnerId === user.id ? '#5B5FEF' : '#FF6B6B' },
                ]}
              >
                {resultText}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>친구 기록 도전</Text>
          <Text style={styles.subtitle}>친구가 등록한 기록을 깨고 승리해 보세요!</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#5B5FEF" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={battles}
          renderItem={renderBattle}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color="#D0D0D8" />
              <Text style={styles.emptyText}>참여 중인 도전이 없습니다</Text>
              <Text style={styles.emptySubtext}>+ 버튼을 눌러 친구에게 기록 도전장을 보내세요!</Text>
            </View>
          }
        />
      )}

      {/* Create Challenge Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚔️ 신규 기록 도전장 발송</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#1A1A2E" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Step 1: Choose Friend */}
              <Text style={styles.sectionTitle}>1. 도전할 친구 선택</Text>
              <View style={styles.friendList}>
                {friends.length === 0 ? (
                  <Text style={styles.emptyMiniText}>도전할 친구가 없습니다.</Text>
                ) : (
                  friends.map((friend) => (
                    <TouchableOpacity
                      key={friend.id}
                      style={[
                        styles.friendChip,
                        selectedFriend?.id === friend.id && styles.selectedChip,
                      ]}
                      onPress={() => setSelectedFriend(friend)}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.friendAvatar,
                          selectedFriend?.id === friend.id && styles.selectedAvatar,
                        ]}
                      >
                        <Text style={styles.avatarText}>{friend.nickname[0]}</Text>
                      </View>
                      <Text
                        style={[
                          styles.friendName,
                          selectedFriend?.id === friend.id && styles.selectedText,
                        ]}
                      >
                        {friend.nickname}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>

              {/* Step 2: Choose My Run Record */}
              <Text style={[styles.sectionTitle, { marginTop: 24 }]}>2. 보낼 도전 기록 선택</Text>
              <View style={styles.runList}>
                {myRuns.length === 0 ? (
                  <View style={styles.emptyRunBox}>
                    <Text style={styles.emptyMiniText}>아직 완료한 러닝 기록이 없습니다.</Text>
                    <Text style={styles.emptySubMiniText}>
                      러닝 탭에서 달리기를 완료한 후에 도전장을 보낼 수 있습니다!
                    </Text>
                  </View>
                ) : (
                  myRuns.map((run) => (
                    <TouchableOpacity
                      key={run.id}
                      style={[
                        styles.runCard,
                        selectedRun?.id === run.id && styles.selectedRunCard,
                      ]}
                      onPress={() => setSelectedRun(run)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.runCardHeader}>
                        <Text
                          style={[
                            styles.runDate,
                            selectedRun?.id === run.id && styles.selectedText,
                          ]}
                        >
                          {new Date(run.createdAt).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </Text>
                        {selectedRun?.id === run.id && (
                          <Ionicons name="checkmark-circle" size={20} color="#5B5FEF" />
                        )}
                      </View>
                      <View style={styles.runCardStats}>
                        <View style={styles.runCardStatItem}>
                          <Text style={styles.statValText}>{run.distance.toFixed(2)} km</Text>
                        </View>
                        <View style={styles.runCardStatItem}>
                          <Text style={styles.statValText}>{formatDuration(run.duration)}</Text>
                        </View>
                        <View style={styles.runCardStatItem}>
                          <Text style={styles.statValText}>{run.pace.toFixed(2)} /km</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </ScrollView>

            {/* Step 3: Action Buttons */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!selectedFriend || !selectedRun) && styles.disabledButton,
                ]}
                onPress={handleCreateChallenge}
                disabled={!selectedFriend || !selectedRun || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
                    <Text style={styles.sendButtonText}>도전장 보내기</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontSize: 13,
    color: '#8E8EA0',
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#5B5FEF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5B5FEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EBEBF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 13,
    color: '#8E8EA0',
    fontWeight: '500',
  },
  challengeBox: {
    backgroundColor: '#F8F9FE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  challengeLabel: {
    fontSize: 12,
    color: '#8E8EA0',
    fontWeight: '600',
    marginBottom: 8,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordItem: {
    flex: 1,
    alignItems: 'center',
  },
  recordValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  recordUnit: {
    fontSize: 11,
    color: '#8E8EA0',
    marginTop: 2,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#EBEBF0',
  },
  actionSection: {
    marginTop: 8,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F5F5F7',
    paddingVertical: 10,
    borderRadius: 12,
  },
  infoBadgeText: {
    fontSize: 13,
    color: '#8E8EA0',
    fontWeight: '500',
  },
  activeInfoBadge: {
    backgroundColor: '#E8E9FD',
  },
  activeInfoText: {
    color: '#5B5FEF',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5B5FEF',
    borderRadius: 12,
    height: 44,
    gap: 6,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    height: 44,
    gap: 6,
  },
  runButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  doneSection: {
    marginTop: 4,
  },
  doneDivider: {
    height: 1,
    backgroundColor: '#F0F0F5',
    marginVertical: 10,
  },
  vsResults: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  vsResultItem: {
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 12,
    color: '#8E8EA0',
    fontWeight: '500',
    marginBottom: 4,
  },
  resultVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  vsSymbol: {
    fontSize: 14,
    fontWeight: '800',
    color: '#D0D0D8',
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    marginTop: 100,
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
    textAlign: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  modalBody: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 12,
  },
  friendList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  friendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F5F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F5F5F7',
  },
  selectedChip: {
    backgroundColor: '#E8E9FD',
    borderColor: '#5B5FEF',
  },
  friendAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8E8EA0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedAvatar: {
    backgroundColor: '#5B5FEF',
  },
  avatarText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  friendName: {
    fontSize: 13,
    color: '#1A1A2E',
    fontWeight: '500',
  },
  selectedText: {
    color: '#5B5FEF',
    fontWeight: '700',
  },
  emptyMiniText: {
    fontSize: 13,
    color: '#8E8EA0',
    fontStyle: 'italic',
  },
  runList: {
    gap: 10,
  },
  runCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EBEBF0',
  },
  selectedRunCard: {
    borderColor: '#5B5FEF',
    backgroundColor: '#F8F9FE',
  },
  runCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  runDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8EA0',
  },
  runCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  runCardStatItem: {
    flex: 1,
  },
  statValText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  emptyRunBox: {
    padding: 20,
    backgroundColor: '#F8F9FE',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D0D0D8',
    gap: 4,
  },
  emptySubMiniText: {
    fontSize: 11,
    color: '#B0B0C0',
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8EA0',
  },
  sendButton: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#5B5FEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: '#C0C0CC',
  },
});
