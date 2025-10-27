import type {
  FormDataState,
  ValidationState,
  AnalysisCountState,
  APIRequestState,
  LoadingState,
  ModalState,
  LocalStorageState,
  TimerState,
  NewAnalysisContextState,
} from '../lib/types';

/**
 * Action 타입 정의
 */

// 분석 횟수 조회
export type FetchAnalysisCountStartAction = {
  type: 'FETCH_ANALYSIS_COUNT_START';
};

export type FetchAnalysisCountSuccessAction = {
  type: 'FETCH_ANALYSIS_COUNT_SUCCESS';
  payload: {
    subscription_tier: 'free' | 'pro';
    remaining_count: number;
    max_count: number;
  };
};

export type FetchAnalysisCountFailureAction = {
  type: 'FETCH_ANALYSIS_COUNT_FAILURE';
  payload: { error: string };
};

// 폼 입력
export type UpdateFormFieldAction = {
  type: 'UPDATE_FORM_FIELD';
  payload: {
    field: keyof FormDataState;
    value: string | null;
  };
};

export type TouchFormFieldAction = {
  type: 'TOUCH_FORM_FIELD';
  payload: {
    field: keyof FormDataState;
  };
};

export type ValidateFormFieldAction = {
  type: 'VALIDATE_FORM_FIELD';
  payload: {
    field: keyof FormDataState;
    error: string | null;
  };
};

export type ValidateFormAction = {
  type: 'VALIDATE_FORM';
};

// 분석 요청
export type SubmitAnalysisStartAction = {
  type: 'SUBMIT_ANALYSIS_START';
};

export type SubmitAnalysisSuccessAction = {
  type: 'SUBMIT_ANALYSIS_SUCCESS';
  payload: {
    analysis_id: string;
    status: 'completed' | 'processing';
    remaining_count: number;
  };
};

export type SubmitAnalysisFailureAction = {
  type: 'SUBMIT_ANALYSIS_FAILURE';
  payload: {
    error: {
      code: string;
      message: string;
      is_recoverable: boolean;
    };
  };
};

// 타이머
export type StartTimerAction = {
  type: 'START_TIMER';
};

export type StopTimerAction = {
  type: 'STOP_TIMER';
};

export type UpdateTimerAction = {
  type: 'UPDATE_TIMER';
  payload: {
    elapsed_seconds: number;
  };
};

// 모달
export type OpenModalAction = {
  type: 'OPEN_MODAL';
  payload: {
    modal_type:
      | 'insufficient_count'
      | 'duplicate_analysis'
      | 'session_expired'
      | 'timeout';
    data?: any;
  };
};

export type CloseModalAction = {
  type: 'CLOSE_MODAL';
  payload: {
    modal_type:
      | 'insufficient_count'
      | 'duplicate_analysis'
      | 'session_expired'
      | 'timeout';
  };
};

// 로컬 저장
export type SaveFormToLocalStorageAction = {
  type: 'SAVE_FORM_TO_LOCAL_STORAGE';
};

export type ClearLocalStorageAction = {
  type: 'CLEAR_LOCAL_STORAGE';
};

// 전체 Action Union Type
export type NewAnalysisAction =
  | FetchAnalysisCountStartAction
  | FetchAnalysisCountSuccessAction
  | FetchAnalysisCountFailureAction
  | UpdateFormFieldAction
  | TouchFormFieldAction
  | ValidateFormFieldAction
  | ValidateFormAction
  | SubmitAnalysisStartAction
  | SubmitAnalysisSuccessAction
  | SubmitAnalysisFailureAction
  | StartTimerAction
  | StopTimerAction
  | UpdateTimerAction
  | OpenModalAction
  | CloseModalAction
  | SaveFormToLocalStorageAction
  | ClearLocalStorageAction;

export type { NewAnalysisContextState };
