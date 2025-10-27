/**
 * 분석 상세보기 페이지 상수 정의
 */

// 오행 색상 매핑
export const FIVE_ELEMENTS_COLORS = {
  wood: '#10B981',   // 초록색
  fire: '#EF4444',   // 빨간색
  earth: '#D97706',  // 갈색
  metal: '#6B7280',  // 회색
  water: '#3B82F6',  // 파란색
} as const;

// 오행 한글 이름
export const FIVE_ELEMENTS_NAMES = {
  wood: '목(木)',
  fire: '화(火)',
  earth: '토(土)',
  metal: '금(金)',
  water: '수(水)',
} as const;

// 천간 한글 읽기 매핑
export const HEAVENLY_STEMS_KOREAN: Record<string, string> = {
  '甲': '갑',
  '乙': '을',
  '丙': '병',
  '丁': '정',
  '戊': '무',
  '己': '기',
  '庚': '경',
  '辛': '신',
  '壬': '임',
  '癸': '계',
};

// 지지 한글 읽기 매핑
export const EARTHLY_BRANCHES_KOREAN: Record<string, string> = {
  '子': '자',
  '丑': '축',
  '寅': '인',
  '卯': '묘',
  '辰': '진',
  '巳': '사',
  '午': '오',
  '未': '미',
  '申': '신',
  '酉': '유',
  '戌': '술',
  '亥': '해',
};

// AI 모델 뱃지 매핑
export const AI_MODEL_BADGE: Record<string, string> = {
  'gemini-2.0-flash': 'Flash',
  'gemini-2.0-pro': 'Pro',
};

// 성별 아이콘 매핑
export const GENDER_ICON: Record<string, string> = {
  male: '👨',
  female: '👩',
};

// 해석 탭 정의
export const INTERPRETATION_TABS = [
  { key: 'personality', label: '성격 분석' },
  { key: 'wealth', label: '재운 분석' },
  { key: 'health', label: '건강운' },
  { key: 'love', label: '연애운' },
] as const;
