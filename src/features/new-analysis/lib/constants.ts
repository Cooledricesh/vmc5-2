/**
 * 새 분석하기 상수
 */

// 타임아웃 설정
export const ANALYSIS_TIMEOUT_MS = 30000; // 30초
export const POLLING_INTERVAL_MS = 2000; // 2초
export const DEBOUNCE_DELAY_MS = 300; // 300ms

// 로컬 스토리지 키
export const LOCAL_STORAGE_KEY = 'new-analysis-form-data';

// 최대 재시도 횟수
export const MAX_RETRY_COUNT = 3;

// 에러 메시지
export const ERROR_MESSAGES = {
  subject_name_min: '성함은 2자 이상 입력해주세요',
  subject_name_max: '성함은 50자 이하로 입력해주세요',
  birth_date_invalid: '올바른 생년월일을 입력해주세요',
  birth_date_range: '1900년 이후 ~ 오늘 날짜만 입력 가능합니다',
  birth_time_invalid: '올바른 시간 형식이 아닙니다 (HH:mm)',
  gender_required: '성별을 선택해주세요',
  network_error: '네트워크 오류가 발생했습니다',
  unknown_error: '알 수 없는 오류가 발생했습니다',
} as const;

// 복구 가능한 에러 코드
export const RECOVERABLE_ERROR_CODES = [
  'NETWORK_ERROR',
  'TIMEOUT',
  'GEMINI_API_ERROR',
] as const;

// 진행 메시지
export const PROGRESS_MESSAGES = {
  submitting: {
    title: 'AI가 사주를 분석하고 있습니다...',
    subtitle_early: '약 5-15초 소요됩니다',
    subtitle_mid: '조금만 더 기다려주세요...',
    subtitle_late: '분석이 예상보다 오래 걸리고 있습니다',
  },
  polling: {
    title: '분석이 완료되고 있습니다...',
    subtitle: '잠시만 기다려주세요',
  },
} as const;
