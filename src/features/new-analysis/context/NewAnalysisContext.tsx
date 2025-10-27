'use client';

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
  type Dispatch,
} from 'react';
import type {
  NewAnalysisAction,
  NewAnalysisContextState,
} from './types';
import type { FormDataState } from '../lib/types';

// 초기 상태
const initialState: NewAnalysisContextState = {
  formData: {
    subject_name: '',
    birth_date: '',
    birth_time: null,
    gender: null,
  },
  validation: {
    touched: {
      subject_name: false,
      birth_date: false,
      birth_time: false,
      gender: false,
    },
    errors: {
      subject_name: null,
      birth_date: null,
      birth_time: null,
      gender: null,
    },
    isValid: false,
  },
  analysisCount: {
    subscription_tier: 'free',
    remaining_count: 0,
    max_count: 3,
    is_insufficient: true,
  },
  apiRequest: {
    status: 'idle',
    analysis_id: null,
    retry_count: 0,
    elapsed_time: 0,
    error: null,
  },
  loading: {
    is_loading: false,
    is_fetching_count: false,
    is_validating: false,
    is_submitting: false,
    is_polling: false,
  },
  modals: {
    insufficient_count_modal: {
      is_open: false,
      message: '',
    },
    session_expired_modal: {
      is_open: false,
    },
    duplicate_analysis_modal: {
      is_open: false,
      existing_analysis_id: null,
    },
    timeout_modal: {
      is_open: false,
      analysis_id: null,
    },
  },
  localStorage: {
    saved_form_data: null,
    last_saved_at: null,
  },
  timer: {
    start_time: null,
    elapsed_seconds: 0,
    is_timeout: false,
  },
};

// Reducer
function newAnalysisReducer(
  state: NewAnalysisContextState,
  action: NewAnalysisAction,
): NewAnalysisContextState {
  switch (action.type) {
    case 'FETCH_ANALYSIS_COUNT_START':
      return {
        ...state,
        loading: { ...state.loading, is_fetching_count: true },
      };

    case 'FETCH_ANALYSIS_COUNT_SUCCESS':
      return {
        ...state,
        analysisCount: {
          subscription_tier: action.payload.subscription_tier,
          remaining_count: action.payload.remaining_count,
          max_count: action.payload.max_count,
          is_insufficient: action.payload.remaining_count === 0,
        },
        loading: { ...state.loading, is_fetching_count: false },
      };

    case 'FETCH_ANALYSIS_COUNT_FAILURE':
      return {
        ...state,
        loading: { ...state.loading, is_fetching_count: false },
      };

    case 'UPDATE_FORM_FIELD':
      return {
        ...state,
        formData: {
          ...state.formData,
          [action.payload.field]: action.payload.value,
        },
      };

    case 'TOUCH_FORM_FIELD':
      return {
        ...state,
        validation: {
          ...state.validation,
          touched: {
            ...state.validation.touched,
            [action.payload.field]: true,
          },
        },
      };

    case 'VALIDATE_FORM_FIELD':
      return {
        ...state,
        validation: {
          ...state.validation,
          errors: {
            ...state.validation.errors,
            [action.payload.field]: action.payload.error,
          },
        },
      };

    case 'VALIDATE_FORM': {
      const hasErrors = Object.values(state.validation.errors).some(
        (error) => error !== null,
      );
      const hasRequiredFields =
        state.formData.subject_name &&
        state.formData.birth_date &&
        state.formData.gender !== null;

      return {
        ...state,
        validation: {
          ...state.validation,
          isValid: !hasErrors && !!hasRequiredFields,
        },
      };
    }

    case 'SUBMIT_ANALYSIS_START':
      return {
        ...state,
        apiRequest: {
          ...state.apiRequest,
          status: 'submitting',
          error: null,
        },
        loading: {
          ...state.loading,
          is_loading: true,
          is_submitting: true,
        },
      };

    case 'SUBMIT_ANALYSIS_SUCCESS':
      return {
        ...state,
        apiRequest: {
          ...state.apiRequest,
          status: action.payload.status === 'completed' ? 'success' : 'polling',
          analysis_id: action.payload.analysis_id,
        },
        analysisCount: {
          ...state.analysisCount,
          remaining_count: action.payload.remaining_count,
        },
        loading: {
          ...state.loading,
          is_loading: action.payload.status !== 'completed',
          is_submitting: false,
        },
      };

    case 'SUBMIT_ANALYSIS_FAILURE':
      return {
        ...state,
        apiRequest: {
          ...state.apiRequest,
          status: 'error',
          error: action.payload.error,
        },
        loading: {
          ...state.loading,
          is_loading: false,
          is_submitting: false,
        },
      };

    case 'START_TIMER':
      return {
        ...state,
        timer: {
          start_time: Date.now(),
          elapsed_seconds: 0,
          is_timeout: false,
        },
      };

    case 'STOP_TIMER':
      return {
        ...state,
        timer: initialState.timer,
      };

    case 'UPDATE_TIMER':
      return {
        ...state,
        timer: {
          ...state.timer,
          elapsed_seconds: action.payload.elapsed_seconds,
        },
      };

    case 'OPEN_MODAL': {
      const { modal_type, data } = action.payload;
      return {
        ...state,
        modals: {
          ...state.modals,
          [`${modal_type}_modal`]: {
            is_open: true,
            ...data,
          },
        },
      };
    }

    case 'CLOSE_MODAL': {
      const { modal_type } = action.payload;
      return {
        ...state,
        modals: {
          ...state.modals,
          [`${modal_type}_modal`]: {
            ...state.modals[`${modal_type}_modal` as keyof typeof state.modals],
            is_open: false,
          },
        },
      };
    }

    case 'SAVE_FORM_TO_LOCAL_STORAGE':
      return {
        ...state,
        localStorage: {
          saved_form_data: state.formData,
          last_saved_at: new Date().toISOString(),
        },
      };

    case 'CLEAR_LOCAL_STORAGE':
      return {
        ...state,
        localStorage: initialState.localStorage,
      };

    default:
      return state;
  }
}

// Context
interface NewAnalysisContextValue {
  state: NewAnalysisContextState;
  dispatch: Dispatch<NewAnalysisAction>;
}

const NewAnalysisContext = createContext<NewAnalysisContextValue | undefined>(
  undefined,
);

// Provider
export function NewAnalysisProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(newAnalysisReducer, initialState);

  // 초기 분석 횟수 조회 (페이지 마운트 시)
  useEffect(() => {
    // TODO: Implement fetchAnalysisCount
    console.log('TODO: Fetch analysis count');
  }, []);

  // 타이머 업데이트
  useEffect(() => {
    if (state.timer.start_time) {
      const intervalId = setInterval(() => {
        const elapsed = Math.floor((Date.now() - state.timer.start_time!) / 1000);
        dispatch({
          type: 'UPDATE_TIMER',
          payload: { elapsed_seconds: elapsed },
        });
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, [state.timer.start_time]);

  return (
    <NewAnalysisContext.Provider value={{ state, dispatch }}>
      {children}
    </NewAnalysisContext.Provider>
  );
}

// Hook
export function useNewAnalysisContext() {
  const context = useContext(NewAnalysisContext);
  if (!context) {
    throw new Error(
      'useNewAnalysisContext must be used within NewAnalysisProvider',
    );
  }
  return context;
}
