// ============================================
// OpenRouter Service
// ============================================

/**
 * Request recommendation coach comment from OpenRouter using a cheap/free model (Google Gemini 2.5 Flash).
 */
export async function getOpenRouterRecommendation(
  level: string,
  courses: any[],
  preferredDistance?: number
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.startsWith('your_')) {
    console.log('[OpenRouter] API Key not set. Falling back to dummy message.');
    return '';
  }

  try {
    const coursesPrompt = courses
      .map(
        (c) =>
          `- ${c.name} (난이도: ${c.difficulty}, 거리: ${c.distance}km, 예상시간: ${c.estimatedTime}분, 설명: ${c.description})`
      )
      .join('\n');

    const prompt = `사용자 정보:
- 수준: ${level}
- 희망 거리: ${preferredDistance ? `${preferredDistance}km` : '상관없음'}

추천 가능한 코스 목록:
${coursesPrompt}

위 코스 목록 중 하나를 선택하여 추천하고, 추천하는 이유와 함께 이 유저에게 어울리는 따뜻한 응원 및 러닝 팁을 친절하게 작성해주세요. 응답은 한국어로 2-3문장 정도로 짧고 강렬하게 작성해 주세요.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/Coding-Marathon',
        'X-Title': 'Coding Marathon Running App',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content:
              '당신은 최고의 러닝 코치이자 코스 추천 전문가입니다. 사용자의 수준과 선호 거리에 따라 제공된 코스 중에서 최적의 코스를 추천하고, 그 이유와 동기부여 메시지를 한국어로 친근하고 전문적으로 작성해주세요.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OpenRouter] API error: ${response.status} ${response.statusText} - ${errorText}`);
      return '';
    }

    const data: any = await response.json();
    if (data && data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content.trim();
    }
  } catch (error) {
    console.error('[OpenRouter] Request failed:', error);
  }

  return '';
}
