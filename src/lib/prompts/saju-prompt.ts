/**
 * 사주팔자 분석을 위한 프롬프트 생성 함수
 */

interface SajuAnalysisInput {
  subjectName: string;
  birthDate: string; // YYYY-MM-DD
  birthTime?: string; // HH:mm (optional)
  gender: 'male' | 'female';
}

/**
 * Gemini API에 전달할 사주 분석 프롬프트를 생성합니다
 * @param input - 사주 분석에 필요한 정보
 * @returns 프롬프트 문자열
 */
export function generateSajuPrompt(input: SajuAnalysisInput): string {
  const { subjectName, birthDate, birthTime, gender } = input;

  // 생년월일 파싱
  const [year, month, day] = birthDate.split('-');
  const genderText = gender === 'male' ? '남성' : '여성';

  // 출생시간이 있는 경우와 없는 경우를 구분
  const birthTimeText = birthTime
    ? `출생시간: ${birthTime}`
    : '출생시간: 불명 (시주를 제외한 년주, 월주, 일주로 분석)';

  const prompt = `
전통 사주팔자 이론을 기반으로 다음 정보로 상세한 사주 분석을 해주세요.

## 분석 대상 정보
- 성명: ${subjectName}
- 생년월일: ${year}년 ${month}월 ${day}일
- ${birthTimeText}
- 성별: ${genderText}

## 분석 요구사항
다음 항목들을 포함한 종합적인 사주 분석을 JSON 형식으로 제공해주세요:

### 1. 천간지지 (heavenly_stems_earthly_branches)
- year_pillar: 년주 (천간, 지지)
- month_pillar: 월주 (천간, 지지)
- day_pillar: 일주 (천간, 지지)
- time_pillar: 시주 (천간, 지지) - 출생시간이 있는 경우만

### 2. 오행분석 (five_elements)
- wood_score: 목(木)의 점수 (0-100)
- fire_score: 화(火)의 점수 (0-100)
- earth_score: 토(土)의 점수 (0-100)
- metal_score: 금(金)의 점수 (0-100)
- water_score: 수(水)의 점수 (0-100)
- dominant_element: 가장 강한 오행
- weak_element: 가장 약한 오행
- balance_analysis: 오행 균형 상태 설명

### 3. 대운/세운 분석 (major_fortune_minor_fortune)
- current_major_fortune: 현재 대운 (시작나이, 끝나이, 천간, 지지, 해석)
- next_major_fortune: 다음 대운 (시작나이, 끝나이, 천간, 지지, 해석)
- current_year_fortune: 올해 세운 해석

### 4. 성격 분석 (personality)
- strengths: 강점 (3-5개)
- weaknesses: 약점 (3-5개)
- characteristics: 주요 성격 특징

### 5. 직업/재물운 (career_wealth)
- suitable_careers: 적합한 직업 분야 (3-5개)
- wealth_fortune: 재물운 분석
- career_advice: 경력 개발 조언

### 6. 건강운 (health)
- vulnerable_areas: 주의해야 할 건강 부위
- health_advice: 건강 관리 조언
- favorable_elements: 건강에 유리한 오행

### 7. 인간관계 (relationships)
- marriage_compatibility: 결혼/연애운 분석
- compatible_types: 잘 맞는 사람 유형
- challenging_types: 주의해야 할 사람 유형
- relationship_advice: 인간관계 조언

### 8. 종합 해석 (comprehensive_analysis)
- overall_fortune: 전체 운세 총평
- life_direction: 인생 방향성 제언
- lucky_elements: 행운의 요소 (색상, 방향, 숫자 등)
- important_years: 주요 변화가 예상되는 시기
- key_advice: 핵심 조언 3가지

## 응답 형식
반드시 다음과 같은 JSON 형식으로 응답해주세요:

\`\`\`json
{
  "heavenly_stems_earthly_branches": {
    "year_pillar": { "stem": "...", "branch": "...", "meaning": "..." },
    "month_pillar": { "stem": "...", "branch": "...", "meaning": "..." },
    "day_pillar": { "stem": "...", "branch": "...", "meaning": "..." },
    "time_pillar": { "stem": "...", "branch": "...", "meaning": "..." }
  },
  "five_elements": {
    "wood_score": 0,
    "fire_score": 0,
    "earth_score": 0,
    "metal_score": 0,
    "water_score": 0,
    "dominant_element": "...",
    "weak_element": "...",
    "balance_analysis": "..."
  },
  "major_fortune_minor_fortune": {
    "current_major_fortune": { ... },
    "next_major_fortune": { ... },
    "current_year_fortune": "..."
  },
  "personality": { ... },
  "career_wealth": { ... },
  "health": { ... },
  "relationships": { ... },
  "comprehensive_analysis": { ... }
}
\`\`\`

전통 사주 이론에 충실하면서도 현대적 해석을 가미하여 실용적이고 긍정적인 조언을 제공해주세요.
`;

  return prompt.trim();
}

/**
 * Gemini 응답에서 JSON을 추출하는 함수
 * @param response - Gemini API 응답 문자열
 * @returns 파싱된 JSON 객체 또는 null
 */
export function parseGeminiResponse(response: string): any {
  try {
    // JSON 코드 블록 추출 (```json ... ```)
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }

    // 코드 블록 없이 순수 JSON인 경우
    // 첫 번째 { 부터 마지막 }까지 추출
    const jsonStart = response.indexOf('{');
    const jsonEnd = response.lastIndexOf('}');

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonString = response.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonString);
    }

    // 그대로 파싱 시도
    return JSON.parse(response);
  } catch (error) {
    console.error('Failed to parse Gemini response:', error);
    return null;
  }
}

/**
 * 사주 분석 결과를 마크다운 형식으로 포맷팅하는 함수
 * @param analysis - 파싱된 사주 분석 결과
 * @returns 마크다운 형식의 문자열
 */
export function formatSajuAnalysis(analysis: any): string {
  if (!analysis) {
    return '분석 결과를 처리할 수 없습니다.';
  }

  let markdown = '';

  // 1. 천간지지
  if (analysis.heavenly_stems_earthly_branches) {
    markdown += '## 🔮 천간지지 분석\n\n';
    const hse = analysis.heavenly_stems_earthly_branches;

    if (hse.year_pillar) {
      markdown += `### 년주\n- **천간**: ${hse.year_pillar.stem}\n- **지지**: ${hse.year_pillar.branch}\n- **의미**: ${hse.year_pillar.meaning}\n\n`;
    }
    if (hse.month_pillar) {
      markdown += `### 월주\n- **천간**: ${hse.month_pillar.stem}\n- **지지**: ${hse.month_pillar.branch}\n- **의미**: ${hse.month_pillar.meaning}\n\n`;
    }
    if (hse.day_pillar) {
      markdown += `### 일주\n- **천간**: ${hse.day_pillar.stem}\n- **지지**: ${hse.day_pillar.branch}\n- **의미**: ${hse.day_pillar.meaning}\n\n`;
    }
    if (hse.time_pillar && hse.time_pillar.stem) {
      markdown += `### 시주\n- **천간**: ${hse.time_pillar.stem}\n- **지지**: ${hse.time_pillar.branch}\n- **의미**: ${hse.time_pillar.meaning}\n\n`;
    }
  }

  // 2. 오행분석
  if (analysis.five_elements) {
    markdown += '## ☯️ 오행 분석\n\n';
    const fe = analysis.five_elements;

    markdown += '### 오행 점수\n';
    markdown += `- 목(木): ${fe.wood_score}점\n`;
    markdown += `- 화(火): ${fe.fire_score}점\n`;
    markdown += `- 토(土): ${fe.earth_score}점\n`;
    markdown += `- 금(金): ${fe.metal_score}점\n`;
    markdown += `- 수(水): ${fe.water_score}점\n\n`;

    markdown += `**주도 오행**: ${fe.dominant_element}\n`;
    markdown += `**부족 오행**: ${fe.weak_element}\n\n`;
    markdown += `### 균형 분석\n${fe.balance_analysis}\n\n`;
  }

  // 3. 대운/세운
  if (analysis.major_fortune_minor_fortune) {
    markdown += '## 📅 대운/세운 분석\n\n';
    const mf = analysis.major_fortune_minor_fortune;

    if (mf.current_major_fortune) {
      markdown += '### 현재 대운\n';
      markdown += `${mf.current_major_fortune.start_age || ''}세 - ${mf.current_major_fortune.end_age || ''}세\n\n`;
      markdown += `${mf.current_major_fortune.interpretation || ''}\n\n`;
    }

    if (mf.current_year_fortune) {
      markdown += '### 올해 세운\n';
      markdown += `${mf.current_year_fortune}\n\n`;
    }
  }

  // 4. 성격 분석
  if (analysis.personality) {
    markdown += '## 🧠 성격 분석\n\n';
    const p = analysis.personality;

    if (p.strengths && Array.isArray(p.strengths)) {
      markdown += '### 강점\n';
      p.strengths.forEach((s: string) => markdown += `- ${s}\n`);
      markdown += '\n';
    }

    if (p.weaknesses && Array.isArray(p.weaknesses)) {
      markdown += '### 약점\n';
      p.weaknesses.forEach((w: string) => markdown += `- ${w}\n`);
      markdown += '\n';
    }

    if (p.characteristics) {
      markdown += '### 주요 특징\n';
      markdown += `${p.characteristics}\n\n`;
    }
  }

  // 5. 직업/재물운
  if (analysis.career_wealth) {
    markdown += '## 💼 직업/재물운\n\n';
    const cw = analysis.career_wealth;

    if (cw.suitable_careers && Array.isArray(cw.suitable_careers)) {
      markdown += '### 적합한 직업\n';
      cw.suitable_careers.forEach((c: string) => markdown += `- ${c}\n`);
      markdown += '\n';
    }

    if (cw.wealth_fortune) {
      markdown += '### 재물운\n';
      markdown += `${cw.wealth_fortune}\n\n`;
    }

    if (cw.career_advice) {
      markdown += '### 경력 조언\n';
      markdown += `${cw.career_advice}\n\n`;
    }
  }

  // 6. 건강운
  if (analysis.health) {
    markdown += '## 🏥 건강운\n\n';
    const h = analysis.health;

    if (h.vulnerable_areas) {
      markdown += '### 주의 부위\n';
      markdown += `${h.vulnerable_areas}\n\n`;
    }

    if (h.health_advice) {
      markdown += '### 건강 조언\n';
      markdown += `${h.health_advice}\n\n`;
    }
  }

  // 7. 인간관계
  if (analysis.relationships) {
    markdown += '## 💑 인간관계\n\n';
    const r = analysis.relationships;

    if (r.marriage_compatibility) {
      markdown += '### 결혼/연애운\n';
      markdown += `${r.marriage_compatibility}\n\n`;
    }

    if (r.relationship_advice) {
      markdown += '### 관계 조언\n';
      markdown += `${r.relationship_advice}\n\n`;
    }
  }

  // 8. 종합 해석
  if (analysis.comprehensive_analysis) {
    markdown += '## 📊 종합 해석\n\n';
    const ca = analysis.comprehensive_analysis;

    if (ca.overall_fortune) {
      markdown += '### 전체 운세\n';
      markdown += `${ca.overall_fortune}\n\n`;
    }

    if (ca.key_advice && Array.isArray(ca.key_advice)) {
      markdown += '### 핵심 조언\n';
      ca.key_advice.forEach((advice: string, index: number) => {
        markdown += `${index + 1}. ${advice}\n`;
      });
      markdown += '\n';
    }
  }

  return markdown;
}