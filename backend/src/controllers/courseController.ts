// ============================================
// Course Controller — Course List + AI Recommend (Dummy)
// ============================================

import { Request, Response } from 'express';
import { dummyCourses } from '../data/dummyData';
import { Course, ApiResponse } from '../types';
import { getOpenRouterRecommendation } from '../services/openRouterService';


// GET /api/courses
export const getAllCourses = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: dummyCourses,
  } as ApiResponse<Course[]>);
};

// GET /api/courses/:id
export const getCourseById = (req: Request, res: Response): void => {
  const { id } = req.params;
  const course = dummyCourses.find((c) => c.id === id);

  if (!course) {
    res.status(404).json({
      success: false,
      error: '코스를 찾을 수 없습니다.',
    } as ApiResponse<null>);
    return;
  }

  res.status(200).json({
    success: true,
    data: course,
  } as ApiResponse<Course>);
};

// POST /api/courses/recommend
// AI recommendation based on user level and preferences, calling OpenRouter if available
export const recommendCourse = async (req: Request, res: Response): Promise<void> => {
  const { level, preferredDistance, location } = req.body;

  let recommended = [...dummyCourses];

  // Filter by difficulty based on user level
  if (level === 'beginner') {
    recommended = recommended.filter((c) => c.difficulty === 'easy');
  } else if (level === 'intermediate') {
    recommended = recommended.filter((c) => c.difficulty !== 'hard');
  }
  // advanced gets all courses

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
