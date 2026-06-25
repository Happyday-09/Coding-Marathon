// ============================================
// 🏃 Running App — Frontend Shared Types
// ============================================

export interface User {
  id: string;
  email: string;
  nickname: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  profileImage?: string;
  weeklyGoalKm: number;
  createdAt: string;
}

export interface Run {
  id: string;
  userId: string;
  distance: number;
  duration: number;
  pace: number;
  calories: number;
  route: RoutePoint[];
  createdAt: string;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
  timestamp?: string;
}

export interface Course {
  id: string;
  name: string;
  location: string;
  distance: number;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  estimatedTime: number;
  coordinates: RoutePoint[];
  tags: string[];
}

export interface Battle {
  id: string;
  challengerId: string;
  challengerName: string;
  opponentId: string;
  opponentName: string;
  status: 'pending' | 'active' | 'done';
  targetDistance: number;      // Challenger's run distance in km
  targetDuration: number;      // Challenger's run duration in seconds
  targetPace: number;          // Challenger's run pace in min/km
  opponentProgress: number;    // Opponent's current run distance in km
  opponentDuration?: number;   // Opponent's completed duration in seconds
  winnerId?: string;           // Winner's user id
  challengerRunId: string;     // The run record being challenged
  opponentRunId?: string;      // The opponent's run record answering the challenge
  createdAt: string;
}

export interface RunStats {
  totalDistance: number;
  totalDuration: number;
  totalCalories: number;
  totalRuns: number;
  averagePace: number;
  weeklyDistance: number;
}

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  CourseDetail: { courseId: string };
};

export type BottomTabParamList = {
  Home: undefined;
  Run: undefined;
  Courses: undefined;
  Battle: undefined;
  Profile: undefined;
};
