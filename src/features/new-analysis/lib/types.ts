/**
 * Frontend 전용 타입 정의
 */

// 폼 데이터 상태
export interface FormDataState {
  subject_name: string;
  birth_date: string;
  birth_time: string | null;
  gender: 'male' | 'female' | null;
}

// 폼 검증 상태
export interface ValidationState {
  touched: {
    subject_name: boolean;
    birth_date: boolean;
    birth_time: boolean;
    gender: boolean;
  };
  errors: {
    subject_name: string | null;
    birth_date: string | null;
    birth_time: string | null;
    gender: string | null;
  };
  isValid: boolean;
}

// 분석 횟수 상태
export interface AnalysisCountState {
  subscription_tier: 'free' | 'pro';
  remaining_count: number;
  max_count: number;
  is_insufficient: boolean;
}

// API 요청 상태
export interface APIRequestState {
  status:
    | 'idle'
    | 'validating'
    | 'submitting'
    | 'polling'
    | 'success'
    | 'error';
  analysis_id: string | null;
  retry_count: number;
  elapsed_time: number;
  error: APIError | null;
}

// API 에러
export interface APIError {
  code: string;
  message: string;
  is_recoverable: boolean;
}

// 로딩 상태
export interface LoadingState {
  is_loading: boolean;
  is_fetching_count: boolean;
  is_validating: boolean;
  is_submitting: boolean;
  is_polling: boolean;
}

// 모달 상태
export interface ModalState {
  insufficient_count_modal: {
    is_open: boolean;
    message: string;
  };
  session_expired_modal: {
    is_open: boolean;
  };
  duplicate_analysis_modal: {
    is_open: boolean;
    existing_analysis_id: string | null;
  };
  timeout_modal: {
    is_open: boolean;
    analysis_id: string | null;
  };
}

// 로컬 저장 상태
export interface LocalStorageState {
  saved_form_data: FormDataState | null;
  last_saved_at: string | null;
}

// 타이머 상태
export interface TimerState {
  start_time: number | null;
  elapsed_seconds: number;
  is_timeout: boolean;
}

// Context 전체 상태
export interface NewAnalysisContextState {
  formData: FormDataState;
  validation: ValidationState;
  analysisCount: AnalysisCountState;
  apiRequest: APIRequestState;
  loading: LoadingState;
  modals: ModalState;
  localStorage: LocalStorageState;
  timer: TimerState;
}
