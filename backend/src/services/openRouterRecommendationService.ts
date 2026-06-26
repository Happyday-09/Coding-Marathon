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
        max_tokens: 600,
        messages: [
          {
            role: 'system',
            content: 'Korean running course recommender. Return JSON only. Use only provided candidate IDs.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              user: { level, preferredDistanceKm, routeStyle },
              task: 'Pick best 3 courses. For each, write a warm Korean reason (2 sentences) mentioning user level, elevation, slope, and scenery. Make each reason unique.',
              outputSchema: {
                recommendedCourseIds: ['id1', 'id2', 'id3'],
                headline: '한 줄 요약 (Korean)',
                reasons: [{ courseId: 'id', reason: 'Korean reason', segmentSuggestion: 'Korean tip' }],
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
