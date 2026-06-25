import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { ApiResponse, Course, RoutePoint } from '../types';
import {
  AiRecommendationCandidate,
  getOpenRouterRecommendationJson,
} from './openRouterRecommendationService';

type RouteStyle = 'one_way' | 'round_trip';
type Level = 'beginner' | 'intermediate' | 'advanced';

interface CourseCardRow {
  id: string;
  name: string;
  description: string | null;
  province: string | null;
  city: string | null;
  area_name: string | null;
  distance_m: number;
  distance_km: number;
  estimated_time_sec: number | null;
  difficulty: string;
  route_geojson: { coordinates?: [number, number][] } | null;
  user_to_start_m?: number;
}

interface SlicedRoute {
  coordinates: RoutePoint[];
  distanceKm: number;
  startDistanceM: number;
  endDistanceM: number;
}

interface RecommendationCourse extends Course {
  totalDistance: number;
  recommendedDistance: number;
  routeStyle: RouteStyle;
  userToStartM?: number;
  recommendationScore: number;
  recommendationReason?: string;
  segmentSuggestion?: string;
  segment: {
    startDistanceM: number;
    endDistanceM: number;
    distanceKm: number;
    style: RouteStyle;
  };
}

const DEFAULT_DISTANCE_KM = 5;
const DEFAULT_RADIUS_KM = 20;
const MAX_RADIUS_KM = 50;
const MAX_CANDIDATES_FOR_AI = 10;
const FINAL_RECOMMENDATION_COUNT = 3;

const toRad = (value: number): number => value * (Math.PI / 180);

const distanceM = (a: RoutePoint, b: RoutePoint): number => {
  const earthRadiusM = 6371008.8;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusM * Math.asin(Math.min(1, Math.sqrt(h)));
};

const parseNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeDistanceKm = (value: unknown): number => {
  const parsed = parseNumber(value);
  if (!parsed || parsed <= 0) return DEFAULT_DISTANCE_KM;
  return parsed;
};

const normalizeRouteStyle = (value: unknown): RouteStyle =>
  value === 'round_trip' ? 'round_trip' : 'one_way';

const normalizeRadiusKm = (radiusKmValue: unknown, radiusMValue: unknown): number => {
  const radiusM = parseNumber(radiusMValue);
  if (radiusM && radiusM > 0) return Math.min(radiusM / 1000, MAX_RADIUS_KM);

  const radiusKm = parseNumber(radiusKmValue);
  if (radiusKm && radiusKm > 0) return Math.min(radiusKm, MAX_RADIUS_KM);

  return DEFAULT_RADIUS_KM;
};

const normalizeLevel = (value: unknown): Level => {
  if (value === 'advanced' || value === 'intermediate' || value === 'beginner') return value;
  return 'beginner';
};

const mapDbDifficultyToUi = (diff: string): 'easy' | 'medium' | 'hard' => {
  if (diff === 'flat') return 'easy';
  if (diff === 'mixed') return 'medium';
  if (diff === 'hill' || diff === 'trail') return 'hard';
  return 'easy';
};

const difficultyScore = (level: Level, dbDifficulty: string): number => {
  const table: Record<Level, Record<string, number>> = {
    beginner: { flat: 30, mixed: 12, unknown: 8, hill: -30, trail: -35 },
    intermediate: { flat: 22, mixed: 28, unknown: 10, hill: 8, trail: 4 },
    advanced: { flat: 15, mixed: 23, unknown: 12, hill: 28, trail: 25 },
  };

  return table[level][dbDifficulty] ?? 0;
};

const parseGeoJsonLineString = (geojson: CourseCardRow['route_geojson']): RoutePoint[] => {
  if (!geojson?.coordinates) return [];
  return geojson.coordinates.map((coord) => ({
    latitude: coord[1],
    longitude: coord[0],
  }));
};

const locationText = (row: CourseCardRow): string =>
  `${row.province || ''} ${row.city || ''} ${row.area_name || ''}`.trim();

const interpolatePoint = (a: RoutePoint, b: RoutePoint, ratio: number): RoutePoint => ({
  latitude: a.latitude + (b.latitude - a.latitude) * ratio,
  longitude: a.longitude + (b.longitude - a.longitude) * ratio,
});

const sliceOneWay = (points: RoutePoint[], targetM: number): SlicedRoute | null => {
  if (points.length < 2) return null;

  const sliced: RoutePoint[] = [points[0]];
  let cumulativeM = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const segmentM = distanceM(previous, current);

    if (cumulativeM + segmentM >= targetM) {
      const remainingM = targetM - cumulativeM;
      const ratio = segmentM === 0 ? 0 : remainingM / segmentM;
      sliced.push(interpolatePoint(previous, current, ratio));
      return {
        coordinates: sliced,
        distanceKm: Math.round((targetM / 1000) * 100) / 100,
        startDistanceM: 0,
        endDistanceM: Math.round(targetM),
      };
    }

    sliced.push(current);
    cumulativeM += segmentM;
  }

  return null;
};

const sliceRoute = (points: RoutePoint[], targetKm: number, routeStyle: RouteStyle): SlicedRoute | null => {
  const targetM = targetKm * 1000;
  if (routeStyle === 'one_way') return sliceOneWay(points, targetM);

  const outboundM = targetM / 2;
  const outbound = sliceOneWay(points, outboundM);
  if (!outbound) return null;

  const returnLeg = outbound.coordinates.slice(0, -1).reverse();
  return {
    coordinates: [...outbound.coordinates, ...returnLeg],
    distanceKm: Math.round(targetKm * 100) / 100,
    startDistanceM: 0,
    endDistanceM: Math.round(outboundM),
  };
};

const reasonHints = (
  row: CourseCardRow,
  targetKm: number,
  routeStyle: RouteStyle,
  userToStartM?: number
): string[] => {
  const hints: string[] = [];

  if (row.difficulty === 'flat') hints.push('flat');
  if (row.difficulty === 'mixed') hints.push('balanced');
  if (row.difficulty === 'hill' || row.difficulty === 'trail') hints.push('training');
  if (/트레일|산|언덕|오르막|trail|hill/i.test(`${row.name} ${row.description || ''}`)) {
    hints.push('terrain-warning');
  }
  if (row.distance_km > targetKm * 1.8) hints.push('partial-route');
  if (routeStyle === 'round_trip') hints.push('round-trip');
  if (userToStartM !== undefined && userToStartM <= 3000) hints.push('nearby-start');

  return hints;
};

const scoreCourse = (
  row: CourseCardRow,
  level: Level,
  targetKm: number,
  routeStyle: RouteStyle,
  userToStartM?: number
): number => {
  let score = 100;

  score += difficultyScore(level, row.difficulty);

  const terrainHint = /트레일|산|언덕|오르막|trail|hill/i.test(`${row.name} ${row.description || ''}`);
  if (terrainHint && level === 'beginner') score -= 35;
  if (terrainHint && level === 'advanced') score += 8;

  const requiredKm = routeStyle === 'round_trip' ? targetKm / 2 : targetKm;
  if (row.distance_km < requiredKm) return Number.NEGATIVE_INFINITY;

  const surplusKm = Math.max(0, row.distance_km - targetKm);
  score -= Math.min(25, surplusKm * 0.8);

  if (row.distance_km >= targetKm && row.distance_km <= targetKm * 1.4) {
    score += 15;
  }

  if (userToStartM !== undefined) {
    score += Math.max(0, 30 - userToStartM / 700);
  }

  return score;
};

const fetchCandidateRows = async (
  userLat: number | undefined,
  userLng: number | undefined,
  radiusKm: number
): Promise<CourseCardRow[]> => {
  if (userLat !== undefined && userLng !== undefined) {
    const { data, error } = await supabase.rpc('nearby_courses', {
      user_lat: userLat,
      user_lng: userLng,
      radius_m: Math.round(radiusKm * 1000),
      min_distance_m: null,
      max_distance_m: null,
      difficulty_filter: null,
      limit_count: 100,
    });

    if (error) throw new Error(`nearby_courses failed: ${error.message}`);
    return (data || []) as CourseCardRow[];
  }

  const { data, error } = await supabase.from('course_cards').select('*').limit(100);
  if (error) throw new Error(`course_cards query failed: ${error.message}`);
  return (data || []) as CourseCardRow[];
};

const buildFallbackMessage = (
  level: Level,
  targetKm: number,
  routeStyle: RouteStyle,
  hasLocation: boolean
): string => {
  const styleText = routeStyle === 'round_trip' ? '왕복' : '편도';
  const levelText = level === 'beginner' ? '초보' : level === 'intermediate' ? '중급' : '상급';
  const locationTextValue = hasLocation ? '현재 위치와 가까운 출발점을 우선으로' : '난이도와 거리 조건을 기준으로';
  return `${levelText} 러너에게 맞춰 ${locationTextValue} ${targetKm}km ${styleText} 코스를 골랐습니다. 긴 코스는 전체가 아니라 조건에 맞는 일부 구간만 달리도록 잘라서 추천합니다.`;
};

export const recommendCoursesWithSlicing = async (req: Request, res: Response): Promise<void> => {
  const level = normalizeLevel(req.body.level);
  const targetKm = normalizeDistanceKm(req.body.preferredDistance ?? req.body.distanceKm);
  const routeStyle = normalizeRouteStyle(req.body.routeStyle);
  const radiusKm = normalizeRadiusKm(req.body.radiusKm, req.body.radiusM);
  const userLat = parseNumber(req.body.userLat ?? req.body.latitude);
  const userLng = parseNumber(req.body.userLng ?? req.body.longitude);
  const hasLocation = userLat !== undefined && userLng !== undefined;

  try {
    const rows = await fetchCandidateRows(userLat, userLng, radiusKm);

    const scored = rows
      .map((row) => {
        const coordinates = parseGeoJsonLineString(row.route_geojson);
        const sliced = sliceRoute(coordinates, targetKm, routeStyle);
        if (!sliced) return null;

        const userToStartM =
          typeof row.user_to_start_m === 'number' ? row.user_to_start_m : undefined;
        const score = scoreCourse(row, level, targetKm, routeStyle, userToStartM);
        if (!Number.isFinite(score)) return null;

        const course: RecommendationCourse = {
          id: row.id,
          name: row.name,
          location: locationText(row),
          distance: sliced.distanceKm,
          totalDistance: row.distance_km,
          recommendedDistance: sliced.distanceKm,
          routeStyle,
          difficulty: mapDbDifficultyToUi(row.difficulty),
          description: row.description || '',
          estimatedTime: row.estimated_time_sec
            ? Math.round((row.estimated_time_sec * (sliced.distanceKm / Math.max(row.distance_km, 0.1))) / 60)
            : Math.round(sliced.distanceKm * 7),
          coordinates: sliced.coordinates,
          tags: reasonHints(row, targetKm, routeStyle, userToStartM),
          province: row.province || '',
          city: row.city || '',
          userToStartM,
          recommendationScore: score,
          segment: {
            startDistanceM: sliced.startDistanceM,
            endDistanceM: sliced.endDistanceM,
            distanceKm: sliced.distanceKm,
            style: routeStyle,
          },
        };

        const aiCandidate: AiRecommendationCandidate = {
          id: row.id,
          name: row.name,
          location: course.location,
          difficulty: row.difficulty,
          totalDistanceKm: row.distance_km,
          recommendedDistanceKm: sliced.distanceKm,
          routeStyle,
          userToStartM,
          score,
          reasonHints: course.tags,
        };

        return { course, aiCandidate };
      })
      .filter((item): item is { course: RecommendationCourse; aiCandidate: AiRecommendationCandidate } => item !== null)
      .sort((a, b) => b.course.recommendationScore - a.course.recommendationScore);

    const topCandidates = scored.slice(0, MAX_CANDIDATES_FOR_AI);
    const aiResult = await getOpenRouterRecommendationJson(
      level,
      topCandidates.map((item) => item.aiCandidate),
      targetKm,
      routeStyle
    );

    let finalCourses = topCandidates.slice(0, FINAL_RECOMMENDATION_COUNT).map((item) => item.course);
    let aiMessage = buildFallbackMessage(level, targetKm, routeStyle, hasLocation);

    if (aiResult) {
      const byId = new Map(topCandidates.map((item) => [item.course.id, item.course]));
      const reasonById = new Map(aiResult.reasons.map((reason) => [reason.courseId, reason]));

      finalCourses = aiResult.recommendedCourseIds
        .map((id) => byId.get(id))
        .filter((course): course is RecommendationCourse => course !== undefined)
        .slice(0, FINAL_RECOMMENDATION_COUNT)
        .map((course) => {
          const reason = reasonById.get(course.id);
          return {
            ...course,
            recommendationReason: reason?.reason,
            segmentSuggestion: reason?.segmentSuggestion,
          };
        });

      aiMessage = aiResult.headline || aiMessage;
    }

    res.status(200).json({
      success: true,
      data: {
        recommendations: finalCourses,
        aiMessage,
        filters: {
          level,
          preferredDistance: targetKm,
          routeStyle,
          radiusKm,
          userLat,
          userLng,
        },
      },
      message: '추천 코스 조회 완료',
    } as ApiResponse<{
      recommendations: RecommendationCourse[];
      aiMessage: string;
      filters: Record<string, unknown>;
    }>);
  } catch (error) {
    console.error('Recommendation failed:', error);
    res.status(500).json({
      success: false,
      error: '추천 코스를 조회하는 중 오류가 발생했습니다.',
    } as ApiResponse<null>);
  }
};
