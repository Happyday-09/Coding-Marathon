// ============================================
// Course Controller — Supabase & AI Recommendations
// ============================================

import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { Course, ApiResponse } from '../types';
import { getOpenRouterRecommendation } from '../services/openRouterService';

// Convert GeoJSON LineString coordinates to RoutePoint[]
const parseGeoJsonLineString = (geojson: any): { latitude: number; longitude: number }[] => {
  if (!geojson || !geojson.coordinates) return [];
  return geojson.coordinates.map((coord: [number, number]) => ({
    latitude: coord[1],
    longitude: coord[0],
  }));
};

// Map DB difficulty enum ('flat', 'hill', 'trail', 'mixed', 'unknown') to UI difficulty ('easy', 'medium', 'hard')
const mapDbDifficultyToUi = (diff: string): 'easy' | 'medium' | 'hard' => {
  if (diff === 'flat') return 'easy';
  if (diff === 'mixed') return 'medium';
  if (diff === 'hill' || diff === 'trail') return 'hard';
  return 'easy';
};

// Map UI difficulty to DB difficulty search filter
const mapUiDifficultyToDb = (level: string): string[] => {
  if (level === 'beginner') return ['flat'];
  if (level === 'intermediate') return ['flat', 'mixed'];
  return ['flat', 'mixed', 'hill', 'trail', 'unknown'];
};

// GET /api/courses
export const getAllCourses = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { data: coursesList, error: listError } = await supabase
      .from('courses')
      .select('id')
      .eq('source_type', 'beagle');

    if (listError || !coursesList) {
      res.status(500).json({
        success: false,
        error: '코스 목록을 불러오지 못했습니다.',
      } as ApiResponse<null>);
      return;
    }

    const validIds = coursesList.map((c) => c.id);
    if (validIds.length === 0) {
      res.status(200).json({
        success: true,
        data: [],
      } as ApiResponse<Course[]>);
      return;
    }

    const { data: coursesData, error } = await supabase
      .from('course_cards')
      .select('*')
      .in('id', validIds);

    if (error || !coursesData) {
      res.status(500).json({
        success: false,
        error: '코스 목록을 불러오지 못했습니다.',
      } as ApiResponse<null>);
      return;
    }

    const courses: Course[] = coursesData.map((c) => ({
      id: c.id,
      name: c.name,
      location: `${c.province || ''} ${c.city || ''} ${c.area_name || ''}`.trim(),
      distance: c.distance_km,
      difficulty: mapDbDifficultyToUi(c.difficulty),
      description: c.description || '',
      estimatedTime: Math.round(c.estimated_time_sec / 60),
      coordinates: parseGeoJsonLineString(c.route_geojson),
      tags: c.tags || [],
      province: c.province || '',
      city: c.city || '',
    }));

    res.status(200).json({
      success: true,
      data: courses,
    } as ApiResponse<Course[]>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '서버 내부 오류가 발생했습니다.',
    } as ApiResponse<null>);
  }
};

// GET /api/courses/:id
export const getCourseById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const { data: c, error } = await supabase.from('course_cards').select('*').eq('id', id).single();

    if (error || !c) {
      res.status(404).json({
        success: false,
        error: '코스를 찾을 수 없습니다.',
      } as ApiResponse<null>);
      return;
    }

    const course: Course = {
      id: c.id,
      name: c.name,
      location: `${c.province || ''} ${c.city || ''} ${c.area_name || ''}`.trim(),
      distance: c.distance_km,
      difficulty: mapDbDifficultyToUi(c.difficulty),
      description: c.description || '',
      estimatedTime: Math.round(c.estimated_time_sec / 60),
      coordinates: parseGeoJsonLineString(c.route_geojson),
      tags: c.tags || [],
      province: c.province || '',
      city: c.city || '',
    };

    res.status(200).json({
      success: true,
      data: course,
    } as ApiResponse<Course>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '서버 내부 오류가 발생했습니다.',
    } as ApiResponse<null>);
  }
};

// POST /api/courses/recommend
// AI recommendation based on user level and preferences, calling OpenRouter
export const recommendCourse = async (req: Request, res: Response): Promise<void> => {
  const { level, preferredDistance } = req.body;

  try {
    const { data: coursesList, error: listError } = await supabase
      .from('courses')
      .select('id')
      .eq('source_type', 'beagle');

    if (listError || !coursesList) {
      res.status(500).json({
        success: false,
        error: '추천 코스 조회에 실패했습니다.',
      } as ApiResponse<null>);
      return;
    }

    const validIds = coursesList.map((c) => c.id);
    if (validIds.length === 0) {
      res.status(200).json({
        success: true,
        data: {
          recommendations: [],
          aiMessage: '추천할 수 있는 코스가 없습니다.',
        },
        message: '추천 코스가 존재하지 않습니다.',
      } as ApiResponse<{ recommendations: Course[]; aiMessage: string }>);
      return;
    }

    const { data: coursesData, error } = await supabase
      .from('course_cards')
      .select('*')
      .in('id', validIds);

    if (error || !coursesData) {
      res.status(500).json({
        success: false,
        error: '추천 코스 조회에 실패했습니다.',
      } as ApiResponse<null>);
      return;
    }

    // Map DB items to UI items
    let recommended: Course[] = coursesData.map((c) => ({
      id: c.id,
      name: c.name,
      location: `${c.province || ''} ${c.city || ''} ${c.area_name || ''}`.trim(),
      distance: c.distance_km,
      difficulty: mapDbDifficultyToUi(c.difficulty),
      description: c.description || '',
      estimatedTime: Math.round(c.estimated_time_sec / 60),
      coordinates: parseGeoJsonLineString(c.route_geojson),
      tags: c.tags || [],
      province: c.province || '',
      city: c.city || '',
    }));

    // Filter by difficulty matching user level
    const allowedDbDiffs = mapUiDifficultyToDb(level);
    recommended = recommended.filter((c) =>
      allowedDbDiffs.includes(
        c.difficulty === 'easy' ? 'flat' : c.difficulty === 'medium' ? 'mixed' : 'hill'
      )
    );

    // Sort by distance preference
    if (preferredDistance) {
      recommended.sort(
        (a, b) =>
          Math.abs(a.distance - preferredDistance) - Math.abs(b.distance - preferredDistance)
      );
    }

    // Limit to top 3
    recommended = recommended.slice(0, 3);

    // Call OpenRouter if key is set
    let aiMessage = '';
    try {
      aiMessage = await getOpenRouterRecommendation(level, recommended, preferredDistance);
    } catch (err) {
      console.error('OpenRouter recommendation failed:', err);
    }

    // Fallback to dummy local message if OpenRouter message is empty
    if (!aiMessage) {
      aiMessage = getAiMessage(level, recommended);
    }

    res.status(200).json({
      success: true,
      data: {
        recommendations: recommended,
        aiMessage,
      },
      message: 'AI 추천 완료!',
    } as ApiResponse<{ recommendations: Course[]; aiMessage: string }>);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '서버 내부 오류가 발생했습니다.',
    } as ApiResponse<null>);
  }
};

function getAiMessage(level: string, courses: Course[]): string {
  if (!courses.length) {
    return '조건에 맞는 코스를 찾지 못했습니다. 다른 조건으로 시도해보세요!';
  }

  const messages: Record<string, string> = {
    beginner: `🏃 초보 러너에게 딱 맞는 코스를 추천해드려요! "${courses[0].name}"은(는) 평탄하고 안전한 코스로, 처음 시작하기에 완벽합니다. 무리하지 말고 자신의 페이스로 달려보세요! 💪`,
    intermediate: `🔥 중급 러너를 위한 도전적인 코스입니다! "${courses[0].name}"에서 실력을 한 단계 끌어올려 보세요. 꾸준한 훈련이 기록 향상의 비결입니다! 🏅`,
    advanced: `⚡ 고급 러너에게 추천하는 코스입니다! "${courses[0].name}"은(는) 당신의 한계를 시험할 수 있는 도전적인 코스입니다. 최고의 기록을 세워보세요! 🏆`,
  };

  return messages[level] || messages.beginner;
}

