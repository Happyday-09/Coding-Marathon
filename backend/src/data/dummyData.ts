// ============================================
// 🏃 Running App — Dummy Data
// ============================================

import { User, Run, Course, Battle, RoutePoint } from '../types';

// ── Users ──────────────────────────────────
export const dummyUsers: User[] = [
  {
    id: 'user-001',
    email: 'runner@example.com',
    nickname: '달리는 사람',
    level: 'intermediate',
    profileImage: 'https://api.dicebear.com/7.x/avataaars/png?seed=runner1',
    weeklyGoalKm: 50,
    createdAt: '2024-01-15T09:00:00Z',
  },
  {
    id: 'user-002',
    email: 'speedy@example.com',
    nickname: '스피드 러너',
    level: 'advanced',
    profileImage: 'https://api.dicebear.com/7.x/avataaars/png?seed=runner2',
    weeklyGoalKm: 70,
    createdAt: '2024-02-20T09:00:00Z',
  },
  {
    id: 'user-003',
    email: 'newbie@example.com',
    nickname: '러닝 초보',
    level: 'beginner',
    profileImage: 'https://api.dicebear.com/7.x/avataaars/png?seed=runner3',
    weeklyGoalKm: 20,
    createdAt: '2024-06-01T09:00:00Z',
  },
];

// ── Hangang (여의도~반포) Route Points ─────
const hangangRoute: RoutePoint[] = [
  { latitude: 37.5283, longitude: 126.9340 },
  { latitude: 37.5270, longitude: 126.9380 },
  { latitude: 37.5255, longitude: 126.9430 },
  { latitude: 37.5240, longitude: 126.9490 },
  { latitude: 37.5225, longitude: 126.9550 },
  { latitude: 37.5210, longitude: 126.9610 },
  { latitude: 37.5195, longitude: 126.9670 },
  { latitude: 37.5180, longitude: 126.9730 },
  { latitude: 37.5165, longitude: 126.9790 },
  { latitude: 37.5150, longitude: 126.9850 },
];

// ── 올림픽공원 Route Points ─────────────────
const olympicParkRoute: RoutePoint[] = [
  { latitude: 37.5202, longitude: 127.1212 },
  { latitude: 37.5215, longitude: 127.1235 },
  { latitude: 37.5230, longitude: 127.1260 },
  { latitude: 37.5240, longitude: 127.1290 },
  { latitude: 37.5235, longitude: 127.1320 },
  { latitude: 37.5220, longitude: 127.1340 },
  { latitude: 37.5205, longitude: 127.1330 },
  { latitude: 37.5195, longitude: 127.1300 },
  { latitude: 37.5190, longitude: 127.1260 },
  { latitude: 37.5202, longitude: 127.1212 },
];

// ── 남산 Route Points ───────────────────────
const namsanRoute: RoutePoint[] = [
  { latitude: 37.5512, longitude: 126.9882 },
  { latitude: 37.5525, longitude: 126.9900 },
  { latitude: 37.5540, longitude: 126.9920 },
  { latitude: 37.5555, longitude: 126.9935 },
  { latitude: 37.5570, longitude: 126.9930 },
  { latitude: 37.5580, longitude: 126.9910 },
  { latitude: 37.5575, longitude: 126.9885 },
  { latitude: 37.5560, longitude: 126.9870 },
  { latitude: 37.5540, longitude: 126.9865 },
  { latitude: 37.5512, longitude: 126.9882 },
];

// ── 서울숲 Route Points ─────────────────────
const seoulForestRoute: RoutePoint[] = [
  { latitude: 37.5443, longitude: 127.0374 },
  { latitude: 37.5455, longitude: 127.0390 },
  { latitude: 37.5470, longitude: 127.0405 },
  { latitude: 37.5480, longitude: 127.0425 },
  { latitude: 37.5475, longitude: 127.0445 },
  { latitude: 37.5460, longitude: 127.0450 },
  { latitude: 37.5445, longitude: 127.0440 },
  { latitude: 37.5435, longitude: 127.0420 },
  { latitude: 37.5435, longitude: 127.0395 },
  { latitude: 37.5443, longitude: 127.0374 },
];

// ── 뚝섬 한강공원 Route Points ──────────────
const ttukseomRoute: RoutePoint[] = [
  { latitude: 37.5310, longitude: 127.0660 },
  { latitude: 37.5320, longitude: 127.0690 },
  { latitude: 37.5325, longitude: 127.0730 },
  { latitude: 37.5330, longitude: 127.0770 },
  { latitude: 37.5335, longitude: 127.0810 },
  { latitude: 37.5330, longitude: 127.0850 },
  { latitude: 37.5320, longitude: 127.0870 },
  { latitude: 37.5310, longitude: 127.0850 },
  { latitude: 37.5305, longitude: 127.0810 },
  { latitude: 37.5310, longitude: 127.0660 },
];

// ── Runs ───────────────────────────────────
export const dummyRuns: Run[] = [
  {
    id: 'run-001',
    userId: 'user-001',
    distance: 10.12,
    duration: 3420,   // 57min
    pace: 5.63,
    calories: 701,
    route: hangangRoute,
    createdAt: '2024-06-26T07:00:00Z',
  },
  {
    id: 'run-002',
    userId: 'user-001',
    distance: 9.89,
    duration: 3300,   // 55min
    pace: 5.56,
    calories: 669,
    route: olympicParkRoute,
    createdAt: '2024-06-21T06:30:00Z',
  },
  {
    id: 'run-003',
    userId: 'user-001',
    distance: 9.12,
    duration: 3240,   // 54min
    pace: 5.92,
    calories: 608,
    route: namsanRoute,
    createdAt: '2024-06-16T07:15:00Z',
  },
  {
    id: 'run-004',
    userId: 'user-001',
    distance: 5.34,
    duration: 1800,   // 30min
    pace: 5.62,
    calories: 372,
    route: seoulForestRoute,
    createdAt: '2024-06-14T18:00:00Z',
  },
  {
    id: 'run-005',
    userId: 'user-001',
    distance: 7.65,
    duration: 2580,   // 43min
    pace: 5.62,
    calories: 530,
    route: ttukseomRoute,
    createdAt: '2024-06-10T06:00:00Z',
  },
  {
    id: 'run-006',
    userId: 'user-002',
    distance: 15.30,
    duration: 4200,   // 70min
    pace: 4.58,
    calories: 1050,
    route: hangangRoute,
    createdAt: '2024-06-25T05:30:00Z',
  },
  {
    id: 'run-007',
    userId: 'user-002',
    distance: 12.80,
    duration: 3600,   // 60min
    pace: 4.69,
    calories: 890,
    route: olympicParkRoute,
    createdAt: '2024-06-22T06:00:00Z',
  },
  {
    id: 'run-008',
    userId: 'user-002',
    distance: 8.50,
    duration: 2400,   // 40min
    pace: 4.71,
    calories: 595,
    route: namsanRoute,
    createdAt: '2024-06-18T17:00:00Z',
  },
  {
    id: 'run-009',
    userId: 'user-003',
    distance: 3.20,
    duration: 1500,   // 25min
    pace: 7.81,
    calories: 220,
    route: seoulForestRoute,
    createdAt: '2024-06-24T08:00:00Z',
  },
  {
    id: 'run-010',
    userId: 'user-003',
    distance: 2.50,
    duration: 1200,   // 20min
    pace: 8.00,
    calories: 175,
    route: ttukseomRoute,
    createdAt: '2024-06-20T09:00:00Z',
  },
  {
    id: 'run-011',
    userId: 'user-001',
    distance: 6.20,
    duration: 2100,   // 35min
    pace: 5.65,
    calories: 430,
    route: hangangRoute,
    createdAt: '2024-06-08T07:00:00Z',
  },
  {
    id: 'run-012',
    userId: 'user-001',
    distance: 8.40,
    duration: 2820,   // 47min
    pace: 5.60,
    calories: 580,
    route: olympicParkRoute,
    createdAt: '2024-06-05T06:30:00Z',
  },
];

// ── Courses ────────────────────────────────
export const dummyCourses: Course[] = [
  {
    id: 'course-001',
    name: '한강 여의도 코스',
    location: '서울 영등포구',
    distance: 10.3,
    difficulty: 'easy',
    description: '여의도 한강공원에서 반포대교까지 이어지는 평탄한 리버사이드 코스. 넓은 자전거도로와 야경이 일품입니다.',
    estimatedTime: 60,
    coordinates: hangangRoute,
    tags: ['한강', '평지', '야경', '초보추천'],
  },
  {
    id: 'course-002',
    name: '올림픽공원 순환 코스',
    location: '서울 송파구',
    distance: 5.2,
    difficulty: 'easy',
    description: '올림픽공원 내부를 한 바퀴 도는 순환 코스. 나무 그늘이 많아 여름에도 쾌적합니다.',
    estimatedTime: 35,
    coordinates: olympicParkRoute,
    tags: ['공원', '순환', '그늘', '초보추천'],
  },
  {
    id: 'course-003',
    name: '남산 둘레길 코스',
    location: '서울 중구',
    distance: 7.8,
    difficulty: 'hard',
    description: '남산을 한 바퀴 도는 언덕 코스. 경사가 있지만 서울 시내 전망이 멋집니다.',
    estimatedTime: 55,
    coordinates: namsanRoute,
    tags: ['남산', '언덕', '전망', '중급이상'],
  },
  {
    id: 'course-004',
    name: '서울숲 산책 코스',
    location: '서울 성동구',
    distance: 4.5,
    difficulty: 'easy',
    description: '서울숲 내부의 편안한 러닝 코스. 자연 속에서 가볍게 달리기 좋습니다.',
    estimatedTime: 30,
    coordinates: seoulForestRoute,
    tags: ['서울숲', '자연', '평지', '초보추천'],
  },
  {
    id: 'course-005',
    name: '뚝섬 한강 리버사이드',
    location: '서울 광진구',
    distance: 8.0,
    difficulty: 'medium',
    description: '뚝섬 한강공원을 따라 달리는 코스. 중간에 체력 단련장도 있어 크로스 트레이닝이 가능합니다.',
    estimatedTime: 45,
    coordinates: ttukseomRoute,
    tags: ['한강', '리버사이드', '운동기구', '중급'],
  },
  {
    id: 'course-006',
    name: '잠실 석촌호수 코스',
    location: '서울 송파구',
    distance: 3.2,
    difficulty: 'easy',
    description: '석촌호수를 한 바퀴 도는 짧고 평탄한 코스. 벚꽃 시즌에 특히 아름답습니다.',
    estimatedTime: 20,
    coordinates: [
      { latitude: 37.5100, longitude: 127.1000 },
      { latitude: 37.5110, longitude: 127.1020 },
      { latitude: 37.5120, longitude: 127.1040 },
      { latitude: 37.5115, longitude: 127.1060 },
      { latitude: 37.5100, longitude: 127.1050 },
      { latitude: 37.5090, longitude: 127.1030 },
      { latitude: 37.5100, longitude: 127.1000 },
    ],
    tags: ['호수', '벚꽃', '짧은코스', '초보추천'],
  },
];

// ── Battles ────────────────────────────────
export const dummyBattles: Battle[] = [
  {
    id: 'battle-001',
    challengerId: 'user-001',
    challengerName: '달리는 사람',
    opponentId: 'user-002',
    opponentName: '스피드 러너',
    status: 'active',
    targetDistance: 5.23,
    targetDuration: 1860,
    targetPace: 5.93,
    opponentProgress: 3.1,
    challengerRunId: 'run-001',
    createdAt: '2024-06-20T10:00:00Z',
  },
  {
    id: 'battle-002',
    challengerId: 'user-003',
    challengerName: '러닝 초보',
    opponentId: 'user-001',
    opponentName: '달리는 사람',
    status: 'pending',
    targetDistance: 3.1,
    targetDuration: 1200,
    targetPace: 6.45,
    opponentProgress: 0,
    challengerRunId: 'run-011',
    createdAt: '2024-06-25T14:00:00Z',
  },
  {
    id: 'battle-003',
    challengerId: 'user-002',
    challengerName: '스피드 러너',
    opponentId: 'user-003',
    opponentName: '러닝 초보',
    status: 'done',
    targetDistance: 15.30,
    targetDuration: 4200,
    targetPace: 4.58,
    opponentProgress: 15.30,
    opponentDuration: 4600,
    winnerId: 'user-002',
    challengerRunId: 'run-006',
    opponentRunId: 'run-010',
    createdAt: '2024-06-10T08:00:00Z',
  },
  {
    id: 'battle-004',
    challengerId: 'user-001',
    challengerName: '달리는 사람',
    opponentId: 'user-003',
    opponentName: '러닝 초보',
    status: 'active',
    targetDistance: 5.34,
    targetDuration: 1800,
    targetPace: 5.62,
    opponentProgress: 2.1,
    challengerRunId: 'run-004',
    createdAt: '2024-06-23T16:00:00Z',
  },
];
