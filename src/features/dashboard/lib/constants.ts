// 폴링 설정
export const POLLING_INTERVAL = 5000; // 5초
export const MAX_POLLING_COUNT = 12; // 최대 12회 (60초)

// API 캐시 설정 (React Query용)
export const CACHE_TIME = {
  SUMMARY: 5 * 60 * 1000, // 5분
  STATS: 5 * 60 * 1000, // 5분
  ANALYSES: 1 * 60 * 1000, // 1분
} as const;

// 필터 옵션
export const PERIOD_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: '7days', label: '최근 7일' },
  { value: '30days', label: '최근 30일' },
  { value: '90days', label: '최근 90일' },
] as const;

export const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'oldest', label: '오래된순' },
] as const;

// 페이지네이션 설정
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

// 상태 레이블
export const STATUS_LABELS = {
  processing: '처리 중',
  completed: '완료',
  failed: '실패',
} as const;

// AI 모델 레이블
export const AI_MODEL_LABELS = {
  'gemini-2.0-flash': 'Flash',
  'gemini-2.0-pro': 'Pro',
} as const;

// 성별 레이블
export const GENDER_LABELS = {
  male: '남성',
  female: '여성',
} as const;

// 구독 상태 레이블
export const SUBSCRIPTION_STATUS_LABELS = {
  active: '활성',
  pending_cancellation: '해지 예정',
  suspended: '일시 중단',
} as const;
