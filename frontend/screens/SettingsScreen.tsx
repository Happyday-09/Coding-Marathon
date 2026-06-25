import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Settings'>;
};

interface SettingItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  type: 'toggle' | 'navigate' | 'action';
  key?: string;
  value?: boolean;
  subtitle?: string;
  danger?: boolean;
}

export default function SettingsScreen({ navigation }: Props) {
  const { height } = useWindowDimensions();
  const [notifications, setNotifications] = useState({
    runReminder: true,
    battleAlert: true,
    courseRecommend: false,
    weeklyReport: true,
  });
  const [unitKm, setUnitKm] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '계정 삭제',
      '정말로 계정을 삭제하시겠습니까?\n삭제된 계정과 모든 데이터는 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  return (
    <View style={{ height, backgroundColor: '#F5F5FA' }}>
      <SafeAreaView style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#1A1A2E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* 알림 설정 */}
        <Text style={styles.groupLabel}>알림</Text>
        <View style={styles.card}>
          <ToggleRow
            icon="notifications-outline"
            color="#5B5FEF"
            label="러닝 리마인더"
            subtitle="설정한 시간에 러닝 알림"
            value={notifications.runReminder}
            onToggle={() => toggleNotification('runReminder')}
          />
          <Divider />
          <ToggleRow
            icon="people-outline"
            color="#FF9500"
            label="배틀 알림"
            subtitle="도전 요청 및 결과 알림"
            value={notifications.battleAlert}
            onToggle={() => toggleNotification('battleAlert')}
          />
          <Divider />
          <ToggleRow
            icon="map-outline"
            color="#34C759"
            label="코스 추천"
            subtitle="새로운 코스 추천 알림"
            value={notifications.courseRecommend}
            onToggle={() => toggleNotification('courseRecommend')}
          />
          <Divider />
          <ToggleRow
            icon="bar-chart-outline"
            color="#007AFF"
            label="주간 리포트"
            subtitle="매주 월요일 지난 주 요약"
            value={notifications.weeklyReport}
            onToggle={() => toggleNotification('weeklyReport')}
          />
        </View>

        {/* 표시 설정 */}
        <Text style={styles.groupLabel}>표시</Text>
        <View style={styles.card}>
          <ToggleRow
            icon="speedometer-outline"
            color="#FF6B6B"
            label="거리 단위"
            subtitle={unitKm ? 'km 사용 중' : 'miles 사용 중'}
            value={unitKm}
            onToggle={() => setUnitKm(!unitKm)}
            labelOn="km"
            labelOff="mi"
          />
          <Divider />
          <ToggleRow
            icon="moon-outline"
            color="#5856D6"
            label="다크 모드"
            subtitle="어두운 테마 사용"
            value={darkMode}
            onToggle={() => setDarkMode(!darkMode)}
          />
        </View>

        {/* 앱 정보 */}
        <Text style={styles.groupLabel}>앱 정보</Text>
        <View style={styles.card}>
          <InfoRow
            icon="information-circle-outline"
            color="#8E8EA0"
            label="버전"
            value="1.0.0"
          />
          <Divider />
          <NavRow
            icon="document-text-outline"
            color="#8E8EA0"
            label="개인정보처리방침"
            onPress={() => Alert.alert('개인정보처리방침', '준비 중입니다.')}
          />
          <Divider />
          <NavRow
            icon="code-slash-outline"
            color="#8E8EA0"
            label="오픈소스 라이선스"
            onPress={() => Alert.alert('오픈소스 라이선스', '준비 중입니다.')}
          />
          <Divider />
          <NavRow
            icon="mail-outline"
            color="#8E8EA0"
            label="문의하기"
            onPress={() => Alert.alert('문의하기', 'support@runmate.app')}
          />
        </View>

        {/* 계정 */}
        <Text style={styles.groupLabel}>계정</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.actionRow} onPress={handleDeleteAccount}>
            <View style={[styles.iconBg, { backgroundColor: '#FF3B3015' }]}>
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </View>
            <Text style={[styles.actionLabel, { color: '#FF3B30' }]}>계정 삭제</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ToggleRow({
  icon, color, label, subtitle, value, onToggle, labelOn, labelOff,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  subtitle?: string;
  value: boolean;
  onToggle: () => void;
  labelOn?: string;
  labelOff?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconBg, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {labelOn && labelOff ? (
        <TouchableOpacity onPress={onToggle} style={styles.unitToggle}>
          <Text style={[styles.unitLabel, value && styles.unitLabelActive]}>{labelOn}</Text>
          <Text style={styles.unitSep}>/</Text>
          <Text style={[styles.unitLabel, !value && styles.unitLabelActive]}>{labelOff}</Text>
        </TouchableOpacity>
      ) : (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#E0E0EA', true: '#5B5FEF' }}
          thumbColor="#FFFFFF"
        />
      )}
    </View>
  );
}

function NavRow({
  icon, color, label, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconBg, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.rowLabel, { flex: 1 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#D0D0D8" />
    </TouchableOpacity>
  );
}

function InfoRow({
  icon, color, label, value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconBg, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.rowLabel, { flex: 1 }]}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5FA', overflow: 'hidden' as const },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1A1A2E', textAlign: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },
  groupLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8EA0',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: '#1A1A2E' },
  rowSubtitle: { fontSize: 12, color: '#8E8EA0', marginTop: 1 },
  divider: { height: 1, backgroundColor: '#F5F5FA', marginLeft: 64 },
  infoValue: { fontSize: 14, color: '#8E8EA0', fontWeight: '500' },
  unitToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  unitLabel: { fontSize: 14, fontWeight: '600', color: '#C0C0CC' },
  unitLabelActive: { color: '#5B5FEF' },
  unitSep: { fontSize: 14, color: '#D0D0D8' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionLabel: { fontSize: 15, fontWeight: '600' },
});
