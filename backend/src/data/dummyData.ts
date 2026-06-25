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

// ── Curved Route Generators ─────────────────
const generateHangangRoute = (): RoutePoint[] => {
  return [
    { latitude: 37.5270, longitude: 126.9340 }, // Yeouido Han River Park west start
    { latitude: 37.5273, longitude: 126.9380 }, // Under Mapo Bridge south end
    { latitude: 37.5268, longitude: 126.9415 }, // Multi-plaza east
    { latitude: 37.5255, longitude: 126.9448 }, // Under Wonhyo Bridge south end
    { latitude: 37.5222, longitude: 126.9505 }, // South of bend near 63 building
    { latitude: 37.5190, longitude: 126.9535 }, // Under Hangang Railway Bridge south end
    { latitude: 37.5173, longitude: 126.9570 }, // Nodeul Island south bank water trail
    { latitude: 37.5152, longitude: 126.9608 }, // Heukseok-dong river trail approach
    { latitude: 37.5118, longitude: 126.9655 }, // Under Hangang Bridge south end
    { latitude: 37.5098, longitude: 126.9715 }, // Heukseok shoreline trail
    { latitude: 37.5085, longitude: 126.9760 }, // Heukseok shoreline trail E
    { latitude: 37.5085, longitude: 126.9800 }, // Banpo Hangang Park west trail
    { latitude: 37.5098, longitude: 126.9840 }, // Banpo Hangang Park center-west
    { latitude: 37.5115, longitude: 126.9880 }, // Banpo Hangang Park center
    { latitude: 37.5135, longitude: 126.9920 }, // Some Sevit area
    { latitude: 37.5145, longitude: 126.9960 }, // Banpo Bridge South end
  ];
};

const generateOlympicParkRoute = (): RoutePoint[] => {
  return [
    { latitude: 37.5205, longitude: 127.1214 },
    { latitude: 37.5218, longitude: 127.1235 },
    { latitude: 37.5235, longitude: 127.1255 },
    { latitude: 37.5245, longitude: 127.1285 },
    { latitude: 37.5240, longitude: 127.1320 },
    { latitude: 37.5228, longitude: 127.1342 },
    { latitude: 37.5210, longitude: 127.1335 },
    { latitude: 37.5195, longitude: 127.1310 },
    { latitude: 37.5190, longitude: 127.1275 },
    { latitude: 37.5205, longitude: 127.1214 },
  ];
};

const generateNamsanRoute = (): RoutePoint[] => {
  return [
    { latitude: 37.5545, longitude: 126.9885 },
    { latitude: 37.5552, longitude: 126.9912 },
    { latitude: 37.5568, longitude: 126.9928 },
    { latitude: 37.5585, longitude: 126.9922 },
    { latitude: 37.5592, longitude: 126.9895 },
    { latitude: 37.5585, longitude: 126.9868 },
    { latitude: 37.5568, longitude: 126.9852 },
    { latitude: 37.5552, longitude: 126.9862 },
    { latitude: 37.5545, longitude: 126.9885 },
  ];
};

const generateSeoulForestRoute = (): RoutePoint[] => {
  return [
    { latitude: 37.5445, longitude: 127.0375 },
    { latitude: 37.5458, longitude: 127.0392 },
    { latitude: 37.5472, longitude: 127.0408 },
    { latitude: 37.5482, longitude: 127.0428 },
    { latitude: 37.5478, longitude: 127.0448 },
    { latitude: 37.5462, longitude: 127.0452 },
    { latitude: 37.5448, longitude: 127.0442 },
    { latitude: 37.5438, longitude: 127.0422 },
    { latitude: 37.5438, longitude: 127.0398 },
    { latitude: 37.5445, longitude: 127.0375 },
  ];
};

const generateTtukseomRoute = (): RoutePoint[] => {
  return [
    { latitude: 37.5315, longitude: 127.0600 }, // West start near Yeongdong Bridge
    { latitude: 37.5305, longitude: 127.0665 }, // Ttukseom Park waterfront plaza
    { latitude: 37.5303, longitude: 127.0715 }, // Shoreline running trail
    { latitude: 37.5308, longitude: 127.0765 }, // Waterfront trail
    { latitude: 37.5312, longitude: 127.0815 }, // Waterfront trail E
    { latitude: 37.5315, longitude: 127.0865 }, // Jamsil Bridge north end approach
    { latitude: 37.5320, longitude: 127.0890 }, // East turnaround point
    { latitude: 37.5328, longitude: 127.0865 }, // Inner park return path
    { latitude: 37.5325, longitude: 127.0815 }, // Inner park path
    { latitude: 37.5320, longitude: 127.0765 }, // Inner park road
    { latitude: 37.5315, longitude: 127.0715 }, // Near playground
    { latitude: 37.5322, longitude: 127.0665 }, // Rock climbing wall
    { latitude: 37.5315, longitude: 127.0600 }, // Back to start
  ];
};

const generateSeokchonRoute = (): RoutePoint[] => {
  return [
    // West Lake Loop (counter-clockwise)
    { latitude: 37.5097, longitude: 127.1026 }, // Near bridge JCT
    { latitude: 37.5101, longitude: 127.1022 },
    { latitude: 37.5105, longitude: 127.1017 },
    { latitude: 37.5109, longitude: 127.1012 },
    { latitude: 37.5112, longitude: 127.1005 }, // North shore
    { latitude: 37.5114, longitude: 127.0998 },
    { latitude: 37.5113, longitude: 127.0990 },
    { latitude: 37.5110, longitude: 127.0982 }, // Northwest shore
    { latitude: 37.5106, longitude: 127.0975 },
    { latitude: 37.5100, longitude: 127.0971 }, // West shore
    { latitude: 37.5093, longitude: 127.0970 }, // Southwest shore
    { latitude: 37.5087, longitude: 127.0974 },
    { latitude: 37.5083, longitude: 127.0981 }, // South shore
    { latitude: 37.5082, longitude: 127.0990 },
    { latitude: 37.5083, longitude: 127.1000 },
    { latitude: 37.5085, longitude: 127.1008 },
    { latitude: 37.5088, longitude: 127.1016 },
    { latitude: 37.5092, longitude: 127.1023 }, // Back to underpass area
    
    // Crossing under Songpa-daero bridge
    { latitude: 37.5095, longitude: 127.1027 },
    { latitude: 37.5096, longitude: 127.1032 },
    
    // East Lake Loop (counter-clockwise)
    { latitude: 37.5097, longitude: 127.1039 }, // South-west of East Lake
    { latitude: 37.5100, longitude: 127.1048 }, // South shore
    { latitude: 37.5104, longitude: 127.1058 },
    { latitude: 37.5109, longitude: 127.1068 },
    { latitude: 37.5113, longitude: 127.1074 }, // Southeast shore
    { latitude: 37.5118, longitude: 127.1078 },
    { latitude: 37.5123, longitude: 127.1077 }, // East shore
    { latitude: 37.5127, longitude: 127.1074 },
    { latitude: 37.5130, longitude: 127.1068 }, // Northeast shore
    { latitude: 37.5131, longitude: 127.1060 },
    { latitude: 37.5130, longitude: 127.1052 }, // North shore
    { latitude: 37.5127, longitude: 127.1044 },
    { latitude: 37.5122, longitude: 127.1037 }, // Northwest shore
    { latitude: 37.5115, longitude: 127.1033 }, // Near the underpass
    { latitude: 37.5104, longitude: 127.1029 }, // Back to start/bridge JCT
    { latitude: 37.5097, longitude: 127.1026 }
  ];
};

const hangangRoute = generateHangangRoute();
const olympicParkRoute = generateOlympicParkRoute();
const namsanRoute = generateNamsanRoute();
const seoulForestRoute = generateSeoulForestRoute();
const ttukseomRoute = generateTtukseomRoute();
const seokchonRoute = generateSeokchonRoute();

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
    coordinates: seokchonRoute,
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
