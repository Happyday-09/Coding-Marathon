// ============================================
// 🏃 Running App — Shared Types
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
  distance: number;      // km
  duration: number;       // seconds
  pace: number;           // min/km
  calories: number;       // kcal
  route: RoutePoint[];    // GPS coordinates
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
  distance: number;       // km
  totalDistance?: number; // km, full source course distance
  recommendedDistance?: number; // km, sliced recommendation distance
  routeStyle?: 'one_way' | 'round_trip';
  userToStartM?: number;
  recommendationScore?: number;
  recommendationReason?: string;
  segmentSuggestion?: string;
  segment?: {
    startDistanceM: number;
    endDistanceM: number;
    distanceKm: number;
    style: 'one_way' | 'round_trip';
  };
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  estimatedTime: number;  // minutes
  coordinates: RoutePoint[];
  tags: string[];
  province?: string;
  city?: string;
  minElevation?: number;
  maxElevation?: number;
  avgSlope?: number;
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
  challengerRoute?: RoutePoint[]; // Challenger's run path coordinates
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
