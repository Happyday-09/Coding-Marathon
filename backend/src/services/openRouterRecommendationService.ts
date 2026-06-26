export interface AiRecommendationCandidate {
  id: string;
  name: string;
  location: string;
  difficulty: string;
  totalDistanceKm: number;
  recommendedDistanceKm: number;
  routeStyle: 'one_way' | 'round_trip';
  userToStartM?: number;
  score: number;
  reasonHints: string[];
  minElevation?: number;
  maxElevation?: number;
  avgSlope?: number;
}

export interface AiRecommendationResult {
  recommendedCourseIds: string[];
  headline: string;
  reasons: Array<{
    courseId: string;
    reason: string;
    segmentSuggestion: string;
  }>;
}

const extractJson = (content: string): string => {
  const cleaned = content.trim().replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '').trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) return cleaned.slice(start, end + 1);

  return cleaned;
};

export async function getOpenRouterRecommendationJson(
  level: string,
  candidates: AiRecommendationCandidate[],
  preferredDistanceKm: number,
  routeStyle: 'one_way' | 'round_trip'
): Promise<AiRecommendationResult | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.startsWith('your_')) {
    console.log('[OpenRouter] API key is not set. Using rule-based recommendation only.');
    return null;
  }

  if (candidates.length === 0) return null;

  const candidatePayload = candidates.map((candidate) => ({
    id: candidate.id,
    name: candidate.name,
    location: candidate.location,
    difficulty: candidate.difficulty,
    totalDistanceKm: candidate.totalDistanceKm,
    recommendedDistanceKm: candidate.recommendedDistanceKm,
    routeStyle: candidate.routeStyle,
    userToStartM: candidate.userToStartM,
    score: Math.round(candidate.score),
    reasonHints: candidate.reasonHints,
    minElevation: candidate.minElevation,
    maxElevation: candidate.maxElevation,
    avgSlope: candidate.avgSlope,
  }));

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/Coding-Marathon',
        'X-Title': 'Coding Marathon Running App',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
        temperature: 0.3,
        max_tokens: 1500,
        messages: [
          {
            role: 'system',
            content:
              'You are a Korean running course recommendation assistant. Pick only from provided candidate IDs. Return valid JSON only. Do not invent courses, coordinates, or distances.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              user: {
                level,
                preferredDistanceKm,
                routeStyle,
              },
              task:
                'Rank the best 3 courses. Write natural, varied Korean reasons. Each reason must explain how the user\'s level, the course\'s max elevation, and average slope were considered for their safety and running fun. Additionally, you MUST describe the surrounding scenery (e.g. river view, green park, forest path, city skyline, sunset) of the course based on its name and description to make it sound inviting and descriptive. Do NOT copy the template verbatim. Write naturally and differently for each course, making each recommendation feel personalized, warm, and professional. Ensure you mention the specific user level, max elevation (m), and avg slope (%) in a natural sentence structure.',
              outputSchema: {
                recommendedCourseIds: ['course-id-1', 'course-id-2', 'course-id-3'],
                headline: 'Korean one sentence summary',
                reasons: [
                  {
                    courseId: 'course-id',
                    reason: 'A natural, warm, and professional Korean reason that integrates the user\'s level, max elevation, average slope, and a description of the beautiful surrounding scenery.',
                    segmentSuggestion: 'Korean segment suggestion',
                  },
                ],
              },
              candidates: candidatePayload,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OpenRouter] API error: ${response.status} ${response.statusText} - ${errorText}`);
      return null;
    }

    const data: any = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    let parsed: AiRecommendationResult;
    try {
      parsed = JSON.parse(extractJson(content)) as AiRecommendationResult;
    } catch {
      console.warn('[OpenRouter] Response was not valid JSON. Using rule-based recommendation only.');
      return null;
    }
    const validIds = new Set(candidates.map((candidate) => candidate.id));
    const recommendedCourseIds = (parsed.recommendedCourseIds || []).filter((id) => validIds.has(id));
    const reasons = (parsed.reasons || []).filter((reason) => validIds.has(reason.courseId));

    console.log('[OpenRouter] AI recommendedCourseIds:', parsed.recommendedCourseIds);
    console.log('[OpenRouter] AI reasons courseIds:', (parsed.reasons || []).map((r) => r.courseId));
    console.log('[OpenRouter] valid IDs:', [...validIds].slice(0, 5));
    console.log('[OpenRouter] matched reasons:', reasons.length);

    if (recommendedCourseIds.length === 0) return null;

    return {
      recommendedCourseIds,
      headline: parsed.headline || '',
      reasons,
    };
  } catch (error) {
    console.error('[OpenRouter] Request failed:', error);
    return null;
  }
}
