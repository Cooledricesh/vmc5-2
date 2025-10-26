# 새 분석하기 페이지 상태 관리 설계 (Level 3)

## 복잡도 분석
- **복잡도 점수**: 18점 (Very High)
- **상태 개수**: 8개 (폼 데이터 4개, 검증 에러, 로딩, 분석 횟수, API 상태)
- **상호작용**: 5개 (입력 4개, 날짜 선택, 실시간 검증, 제출)
- **컴포넌트 계층**: 3단계 (폼 컨테이너, 입력 필드들, 로딩 오버레이)
- **데이터 흐름**: 복잡 (Gemini API 호출, 재시도, 폴링, 리다이렉트)

## 1. 상태 정의

### 1.1 관리해야 할 상태 데이터

#### (1) 폼 데이터 상태 (Form Data State)
```typescript
interface FormDataState {
  subject_name: string;          // 성함 (2-50자)
  birth_date: string;            // 생년월일 (ISO 8601 format: YYYY-MM-DD)
  birth_time: string | null;     // 출생시간 (HH:mm 형식, 선택사항)
  gender: 'male' | 'female' | null; // 성별
}
```

#### (2) 폼 검증 상태 (Validation State)
```typescript
interface ValidationState {
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
  isValid: boolean;              // 전체 폼 유효성
}
```

#### (3) 분석 횟수 상태 (Analysis Count State)
```typescript
interface AnalysisCountState {
  subscription_tier: 'free' | 'pro';
  remaining_count: number;       // 남은 분석 횟수
  max_count: number;             // 최대 분석 횟수 (free: 3, pro: 10)
  is_insufficient: boolean;      // 횟수 부족 여부
}
```

#### (4) API 요청 상태 (API Request State)
```typescript
interface APIRequestState {
  status: 'idle' | 'validating' | 'submitting' | 'polling' | 'success' | 'error';
  analysis_id: string | null;   // 생성된 분석 ID
  retry_count: number;           // 재시도 횟수
  elapsed_time: number;          // 경과 시간 (초)
  error: APIError | null;
}

interface APIError {
  code: string;                  // 에러 코드
  message: string;               // 사용자에게 표시할 메시지
  is_recoverable: boolean;       // 재시도 가능 여부
}
```

#### (5) 로딩 상태 (Loading State)
```typescript
interface LoadingState {
  is_loading: boolean;           // 전체 로딩 상태
  is_fetching_count: boolean;    // 분석 횟수 조회 중
  is_validating: boolean;        // 유효성 검증 중
  is_submitting: boolean;        // 분석 요청 제출 중
  is_polling: boolean;           // 분석 결과 폴링 중
}
```

#### (6) UI 모달 상태 (Modal State)
```typescript
interface ModalState {
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
```

#### (7) 로컬 저장 상태 (Local Storage State)
```typescript
interface LocalStorageState {
  saved_form_data: FormDataState | null; // 세션 만료 대비 임시 저장
  last_saved_at: string | null;          // 마지막 저장 시각
}
```

#### (8) 타이머 상태 (Timer State)
```typescript
interface TimerState {
  start_time: number | null;     // 분석 시작 시각 (timestamp)
  elapsed_seconds: number;       // 경과 시간 (초)
  is_timeout: boolean;           // 타임아웃 여부 (30초 초과)
}
```

### 1.2 화면에 보여지지만 상태가 아닌 것 (Derived State)

다음 데이터들은 기존 상태로부터 **계산(derived)**되므로 별도 상태로 관리하지 않습니다:

1. **폼 제출 가능 여부**:
   - `isValid && remaining_count > 0 && !is_loading`로 계산

2. **남은 횟수 표시 텍스트**:
   - 무료: `"남은 무료 분석: ${remaining_count}/3회"`
   - Pro: `"남은 분석: ${remaining_count}/10회"`

3. **진행 메시지**:
   - `status`에 따라 다른 메시지 표시
   - `'submitting'`: "AI가 사주를 분석하고 있습니다..."
   - `'polling'`: "분석이 완료되고 있습니다..."
   - `'error'`: 에러 메시지

4. **예상 소요 시간 표시**:
   - `elapsed_seconds < 15`: "약 5-15초 소요됩니다"
   - `elapsed_seconds >= 15 && elapsed_seconds < 30`: "조금만 더 기다려주세요..."
   - `elapsed_seconds >= 30`: "분석이 예상보다 오래 걸리고 있습니다"

5. **입력 필드 에러 표시**:
   - `touched[field] && errors[field]`일 때만 에러 메시지 표시

6. **프로그레스 바 진행률**:
   - `Math.min((elapsed_seconds / 30) * 100, 100)`

## 2. 상태 전환 테이블

### 2.1 API 요청 상태 전환

| 현재 상태 | 이벤트/조건 | 다음 상태 | 화면 변화 |
|---------|-----------|----------|---------|
| `idle` (초기) | 페이지 마운트 | `idle` | 폼 표시, 분석 횟수 로딩 |
| `idle` | "분석 시작" 버튼 클릭 | `validating` | 유효성 검증 시작 |
| `validating` | 검증 성공 | `submitting` | 로딩 오버레이 표시 |
| `validating` | 검증 실패 | `idle` | 에러 메시지 표시 |
| `submitting` | API 요청 전송 | `submitting` | "분석 중..." 메시지 |
| `submitting` | 200 OK (즉시 완료) | `success` | 결과 페이지로 리다이렉트 |
| `submitting` | 202 Accepted (처리 중) | `polling` | 폴링 시작 |
| `submitting` | 400/409/500 에러 | `error` | 에러 모달 표시 |
| `polling` | 분석 완료 (status: completed) | `success` | 결과 페이지로 리다이렉트 |
| `polling` | 30초 타임아웃 | `error` (timeout) | 타임아웃 모달 표시 |
| `error` | "다시 시도" 버튼 클릭 | `idle` | 폼으로 복귀 |
| `error` | "대시보드로 가기" 클릭 | (페이지 이동) | 대시보드로 리다이렉트 |

### 2.2 폼 검증 상태 전환

| 필드 | 이벤트 | 검증 조건 | 에러 메시지 |
|-----|-------|---------|-----------|
| `subject_name` | blur | `length < 2` | "성함은 2자 이상 입력해주세요" |
| `subject_name` | blur | `length > 50` | "성함은 50자 이하로 입력해주세요" |
| `subject_name` | blur | 욕설/비속어 필터 | "적절한 이름을 입력해주세요" |
| `birth_date` | blur | 미래 날짜 | "올바른 생년월일을 입력해주세요" |
| `birth_date` | blur | 1900년 이전 | "올바른 생년월일을 입력해주세요" |
| `birth_time` | blur | (선택사항) | - |
| `gender` | change | `null` | "성별을 선택해주세요" |

### 2.3 모달 상태 전환

| 모달 유형 | 트리거 | 표시 내용 | 액션 버튼 |
|---------|-------|---------|---------|
| 횟수 부족 모달 | `remaining_count === 0` | "분석 가능 횟수가 부족합니다" | "Pro 구독하러 가기" → `/subscription` |
| 중복 분석 모달 | 409 Conflict 응답 | "이미 진행 중인 분석이 있습니다" | "분석 보러 가기" → `/analysis/{id}` |
| 세션 만료 모달 | 401 Unauthorized 응답 | "로그인이 필요합니다" | "로그인하기" → 로그인 페이지 |
| 타임아웃 모달 | 30초 초과 | "분석이 예상보다 오래 걸리고 있습니다" | "대시보드로 가기" → `/dashboard` |

## 3. Flux 패턴 설계

### 3.1 Action 정의

사용자가 수행할 수 있는 모든 Action을 정의합니다.

#### (1) 분석 횟수 조회 Actions
```typescript
type FetchAnalysisCountStartAction = {
  type: 'FETCH_ANALYSIS_COUNT_START';
};

type FetchAnalysisCountSuccessAction = {
  type: 'FETCH_ANALYSIS_COUNT_SUCCESS';
  payload: {
    subscription_tier: 'free' | 'pro';
    remaining_count: number;
    max_count: number;
  };
};

type FetchAnalysisCountFailureAction = {
  type: 'FETCH_ANALYSIS_COUNT_FAILURE';
  payload: { error: string };
};
```

#### (2) 폼 입력 Actions
```typescript
type UpdateFormFieldAction = {
  type: 'UPDATE_FORM_FIELD';
  payload: {
    field: keyof FormDataState;
    value: string | null;
  };
};

type TouchFormFieldAction = {
  type: 'TOUCH_FORM_FIELD';
  payload: {
    field: keyof FormDataState;
  };
};

type ValidateFormFieldAction = {
  type: 'VALIDATE_FORM_FIELD';
  payload: {
    field: keyof FormDataState;
    error: string | null;
  };
};

type ValidateFormAction = {
  type: 'VALIDATE_FORM';
};
```

#### (3) 분석 요청 Actions
```typescript
type SubmitAnalysisStartAction = {
  type: 'SUBMIT_ANALYSIS_START';
};

type SubmitAnalysisSuccessAction = {
  type: 'SUBMIT_ANALYSIS_SUCCESS';
  payload: {
    analysis_id: string;
    status: 'completed' | 'processing';
    remaining_count: number;
  };
};

type SubmitAnalysisFailureAction = {
  type: 'SUBMIT_ANALYSIS_FAILURE';
  payload: {
    error: APIError;
  };
};

type StartPollingAction = {
  type: 'START_POLLING';
  payload: {
    analysis_id: string;
  };
};

type PollingTickAction = {
  type: 'POLLING_TICK';
  payload: {
    elapsed_seconds: number;
  };
};

type PollingSuccessAction = {
  type: 'POLLING_SUCCESS';
  payload: {
    analysis_id: string;
  };
};

type PollingTimeoutAction = {
  type: 'POLLING_TIMEOUT';
  payload: {
    analysis_id: string;
  };
};
```

#### (4) 재시도 Actions
```typescript
type RetryAnalysisAction = {
  type: 'RETRY_ANALYSIS';
};

type IncrementRetryCountAction = {
  type: 'INCREMENT_RETRY_COUNT';
};

type ResetRetryCountAction = {
  type: 'RESET_RETRY_COUNT';
};
```

#### (5) 모달 Actions
```typescript
type OpenModalAction = {
  type: 'OPEN_MODAL';
  payload: {
    modal_type: 'insufficient_count' | 'duplicate_analysis' | 'session_expired' | 'timeout';
    data?: any;
  };
};

type CloseModalAction = {
  type: 'CLOSE_MODAL';
  payload: {
    modal_type: 'insufficient_count' | 'duplicate_analysis' | 'session_expired' | 'timeout';
  };
};
```

#### (6) 로컬 저장 Actions
```typescript
type SaveFormToLocalStorageAction = {
  type: 'SAVE_FORM_TO_LOCAL_STORAGE';
};

type RestoreFormFromLocalStorageAction = {
  type: 'RESTORE_FORM_FROM_LOCAL_STORAGE';
  payload: {
    saved_form_data: FormDataState;
  };
};

type ClearLocalStorageAction = {
  type: 'CLEAR_LOCAL_STORAGE';
};
```

#### (7) 타이머 Actions
```typescript
type StartTimerAction = {
  type: 'START_TIMER';
};

type UpdateTimerAction = {
  type: 'UPDATE_TIMER';
  payload: {
    elapsed_seconds: number;
  };
};

type StopTimerAction = {
  type: 'STOP_TIMER';
};

type TimeoutAction = {
  type: 'TIMEOUT';
};
```

#### (8) 전체 Action Union Type
```typescript
type NewAnalysisAction =
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
  | StartPollingAction
  | PollingTickAction
  | PollingSuccessAction
  | PollingTimeoutAction
  | RetryAnalysisAction
  | IncrementRetryCountAction
  | ResetRetryCountAction
  | OpenModalAction
  | CloseModalAction
  | SaveFormToLocalStorageAction
  | RestoreFormFromLocalStorageAction
  | ClearLocalStorageAction
  | StartTimerAction
  | UpdateTimerAction
  | StopTimerAction
  | TimeoutAction;
```

### 3.2 Reducer (Store 단계)

useReducer를 사용하여 상태를 업데이트합니다.

```typescript
interface NewAnalysisContextState {
  formData: FormDataState;
  validation: ValidationState;
  analysisCount: AnalysisCountState;
  apiRequest: APIRequestState;
  loading: LoadingState;
  modals: ModalState;
  localStorage: LocalStorageState;
  timer: TimerState;
}

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

function newAnalysisReducer(
  state: NewAnalysisContextState,
  action: NewAnalysisAction
): NewAnalysisContextState {
  switch (action.type) {
    // 분석 횟수 조회
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

    // 폼 입력
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
        (error) => error !== null
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

    // 분석 요청
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
      if (action.payload.status === 'completed') {
        // 즉시 완료된 경우
        return {
          ...state,
          apiRequest: {
            ...state.apiRequest,
            status: 'success',
            analysis_id: action.payload.analysis_id,
          },
          analysisCount: {
            ...state.analysisCount,
            remaining_count: action.payload.remaining_count,
          },
          loading: {
            ...state.loading,
            is_loading: false,
            is_submitting: false,
          },
        };
      } else {
        // 처리 중인 경우 (폴링 필요)
        return {
          ...state,
          apiRequest: {
            ...state.apiRequest,
            status: 'polling',
            analysis_id: action.payload.analysis_id,
          },
          analysisCount: {
            ...state.analysisCount,
            remaining_count: action.payload.remaining_count,
          },
          loading: {
            ...state.loading,
            is_submitting: false,
            is_polling: true,
          },
        };
      }

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

    // 폴링
    case 'START_POLLING':
      return {
        ...state,
        apiRequest: {
          ...state.apiRequest,
          status: 'polling',
          analysis_id: action.payload.analysis_id,
        },
        loading: {
          ...state.loading,
          is_polling: true,
        },
      };

    case 'POLLING_TICK':
      return {
        ...state,
        timer: {
          ...state.timer,
          elapsed_seconds: action.payload.elapsed_seconds,
          is_timeout: action.payload.elapsed_seconds >= 30,
        },
      };

    case 'POLLING_SUCCESS':
      return {
        ...state,
        apiRequest: {
          ...state.apiRequest,
          status: 'success',
          analysis_id: action.payload.analysis_id,
        },
        loading: {
          ...state.loading,
          is_loading: false,
          is_polling: false,
        },
      };

    case 'POLLING_TIMEOUT':
      return {
        ...state,
        apiRequest: {
          ...state.apiRequest,
          status: 'error',
        },
        loading: {
          ...state.loading,
          is_loading: false,
          is_polling: false,
        },
        modals: {
          ...state.modals,
          timeout_modal: {
            is_open: true,
            analysis_id: action.payload.analysis_id,
          },
        },
        timer: {
          ...state.timer,
          is_timeout: true,
        },
      };

    // 재시도
    case 'RETRY_ANALYSIS':
      return {
        ...state,
        apiRequest: {
          ...state.apiRequest,
          status: 'idle',
          error: null,
        },
        loading: initialState.loading,
      };

    case 'INCREMENT_RETRY_COUNT':
      return {
        ...state,
        apiRequest: {
          ...state.apiRequest,
          retry_count: state.apiRequest.retry_count + 1,
        },
      };

    case 'RESET_RETRY_COUNT':
      return {
        ...state,
        apiRequest: {
          ...state.apiRequest,
          retry_count: 0,
        },
      };

    // 모달
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
            ...state.modals[`${modal_type}_modal`],
            is_open: false,
          },
        },
      };
    }

    // 로컬 저장
    case 'SAVE_FORM_TO_LOCAL_STORAGE':
      return {
        ...state,
        localStorage: {
          saved_form_data: state.formData,
          last_saved_at: new Date().toISOString(),
        },
      };

    case 'RESTORE_FORM_FROM_LOCAL_STORAGE':
      return {
        ...state,
        formData: action.payload.saved_form_data,
      };

    case 'CLEAR_LOCAL_STORAGE':
      return {
        ...state,
        localStorage: initialState.localStorage,
      };

    // 타이머
    case 'START_TIMER':
      return {
        ...state,
        timer: {
          start_time: Date.now(),
          elapsed_seconds: 0,
          is_timeout: false,
        },
      };

    case 'UPDATE_TIMER':
      return {
        ...state,
        timer: {
          ...state.timer,
          elapsed_seconds: action.payload.elapsed_seconds,
        },
      };

    case 'STOP_TIMER':
      return {
        ...state,
        timer: initialState.timer,
      };

    case 'TIMEOUT':
      return {
        ...state,
        timer: {
          ...state.timer,
          is_timeout: true,
        },
      };

    default:
      return state;
  }
}
```

### 3.3 View (UI 컴포넌트)

Reducer의 상태를 구독하고 Action을 dispatch하는 컴포넌트들입니다.

#### (1) 폼 컨테이너 컴포넌트
```typescript
function NewAnalysisForm() {
  const { state, dispatch } = useNewAnalysisContext();
  const { formData, validation, loading, analysisCount } = state;

  // 폼 제출 가능 여부 (Derived State)
  const canSubmit = useMemo(() => {
    return (
      validation.isValid &&
      !analysisCount.is_insufficient &&
      !loading.is_loading
    );
  }, [validation.isValid, analysisCount.is_insufficient, loading.is_loading]);

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 최종 검증
    dispatch({ type: 'VALIDATE_FORM' });

    if (!canSubmit) {
      return;
    }

    // 분석 요청
    await submitAnalysis(dispatch, formData);
  };

  if (loading.is_fetching_count) {
    return <SkeletonLoader />;
  }

  return (
    <form onSubmit={handleSubmit}>
      <AnalysisCountBadge />
      <SubjectNameInput />
      <BirthDateInput />
      <BirthTimeInput />
      <GenderInput />
      <SubmitButton disabled={!canSubmit} loading={loading.is_submitting} />
      <LoadingOverlay />
    </form>
  );
}
```

#### (2) 입력 필드 컴포넌트
```typescript
function SubjectNameInput() {
  const { state, dispatch } = useNewAnalysisContext();
  const { formData, validation } = state;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    dispatch({
      type: 'UPDATE_FORM_FIELD',
      payload: { field: 'subject_name', value },
    });

    // 자동 검증 (debounced)
    debouncedValidate(value);
  };

  const handleBlur = () => {
    dispatch({ type: 'TOUCH_FORM_FIELD', payload: { field: 'subject_name' } });
    validateField(formData.subject_name);
  };

  const validateField = (value: string) => {
    let error: string | null = null;

    if (value.length < 2) {
      error = '성함은 2자 이상 입력해주세요';
    } else if (value.length > 50) {
      error = '성함은 50자 이하로 입력해주세요';
    }

    dispatch({
      type: 'VALIDATE_FORM_FIELD',
      payload: { field: 'subject_name', error },
    });

    // 전체 폼 유효성 재검증
    dispatch({ type: 'VALIDATE_FORM' });
  };

  const debouncedValidate = useDebounce(validateField, 300);

  const showError = validation.touched.subject_name && validation.errors.subject_name;

  return (
    <div>
      <Label htmlFor="subject_name">성함 (필수)</Label>
      <Input
        id="subject_name"
        value={formData.subject_name}
        onChange={handleChange}
        onBlur={handleBlur}
        className={showError ? 'border-red-500' : ''}
        placeholder="홍길동"
      />
      {showError && (
        <ErrorMessage>{validation.errors.subject_name}</ErrorMessage>
      )}
      {validation.touched.subject_name && !validation.errors.subject_name && (
        <SuccessIcon />
      )}
    </div>
  );
}
```

#### (3) 분석 횟수 뱃지 컴포넌트
```typescript
function AnalysisCountBadge() {
  const { state, dispatch } = useNewAnalysisContext();
  const { analysisCount } = state;

  const badgeText = useMemo(() => {
    if (analysisCount.subscription_tier === 'free') {
      return `남은 무료 분석: ${analysisCount.remaining_count}/${analysisCount.max_count}회`;
    }
    return `남은 분석: ${analysisCount.remaining_count}/${analysisCount.max_count}회`;
  }, [analysisCount]);

  const badgeColor = analysisCount.is_insufficient ? 'red' : 'green';

  const handleBadgeClick = () => {
    if (analysisCount.is_insufficient) {
      dispatch({
        type: 'OPEN_MODAL',
        payload: {
          modal_type: 'insufficient_count',
          data: {
            message: 'Pro 구독 시 월 10회 프리미엄 분석을 이용하실 수 있습니다',
          },
        },
      });
    }
  };

  return (
    <Badge color={badgeColor} onClick={handleBadgeClick}>
      {badgeText}
    </Badge>
  );
}
```

#### (4) 로딩 오버레이 컴포넌트
```typescript
function LoadingOverlay() {
  const { state } = useNewAnalysisContext();
  const { loading, timer, apiRequest } = state;

  if (!loading.is_loading) {
    return null;
  }

  const progressMessage = useMemo(() => {
    if (timer.elapsed_seconds < 15) {
      return {
        title: 'AI가 사주를 분석하고 있습니다...',
        subtitle: '약 5-15초 소요됩니다',
      };
    } else if (timer.elapsed_seconds < 30) {
      return {
        title: 'AI가 사주를 분석하고 있습니다...',
        subtitle: '조금만 더 기다려주세요...',
      };
    } else {
      return {
        title: '분석이 예상보다 오래 걸리고 있습니다',
        subtitle: '백그라운드에서 계속 처리 중입니다',
      };
    }
  }, [timer.elapsed_seconds]);

  const progressPercent = Math.min((timer.elapsed_seconds / 30) * 100, 100);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="p-8 text-center">
        <Spinner size="large" />
        <h2 className="mt-4 text-xl font-bold">{progressMessage.title}</h2>
        <p className="mt-2 text-gray-600">{progressMessage.subtitle}</p>
        <ProgressBar percent={progressPercent} className="mt-4" />
        <p className="mt-2 text-sm text-gray-500">
          경과 시간: {timer.elapsed_seconds}초
        </p>
      </Card>
    </div>
  );
}
```

#### (5) 횟수 부족 모달 컴포넌트
```typescript
function InsufficientCountModal() {
  const { state, dispatch } = useNewAnalysisContext();
  const router = useRouter();
  const { modals } = state;

  const handleSubscribe = () => {
    router.push('/subscription');
  };

  const handleClose = () => {
    dispatch({
      type: 'CLOSE_MODAL',
      payload: { modal_type: 'insufficient_count' },
    });
  };

  return (
    <Modal
      open={modals.insufficient_count_modal.is_open}
      onClose={handleClose}
    >
      <ModalHeader>
        <h2>분석 가능 횟수가 부족합니다</h2>
      </ModalHeader>
      <ModalBody>
        <p>{modals.insufficient_count_modal.message}</p>
        <ul className="mt-4 list-disc list-inside">
          <li>월 10회 프리미엄 분석</li>
          <li>더 정확한 AI 모델 (gemini-2.0-pro) 사용</li>
          <li>매월 초기화되는 분석 횟수</li>
        </ul>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={handleClose}>
          취소
        </Button>
        <Button variant="primary" onClick={handleSubscribe}>
          Pro 구독하러 가기
        </Button>
      </ModalFooter>
    </Modal>
  );
}
```

## 4. Context + useReducer 설계

### 4.1 Context 생성 및 Provider

```typescript
// NewAnalysisContext.tsx
import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

interface NewAnalysisContextValue {
  state: NewAnalysisContextState;
  dispatch: React.Dispatch<NewAnalysisAction>;
}

const NewAnalysisContext = createContext<NewAnalysisContextValue | undefined>(undefined);

export function NewAnalysisProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(newAnalysisReducer, initialState);

  // 초기 분석 횟수 조회 (페이지 마운트 시)
  useEffect(() => {
    fetchAnalysisCount();
  }, []);

  // 폼 데이터 자동 저장 (세션 만료 대비)
  useEffect(() => {
    if (
      state.formData.subject_name ||
      state.formData.birth_date ||
      state.formData.gender
    ) {
      const timeoutId = setTimeout(() => {
        saveFormToLocalStorage(state.formData);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [state.formData]);

  // 타이머 업데이트 (폴링 중)
  useEffect(() => {
    if (state.loading.is_polling && state.timer.start_time) {
      const intervalId = setInterval(() => {
        const elapsed = Math.floor((Date.now() - state.timer.start_time!) / 1000);
        dispatch({
          type: 'UPDATE_TIMER',
          payload: { elapsed_seconds: elapsed },
        });

        // 타임아웃 체크
        if (elapsed >= 30) {
          dispatch({
            type: 'POLLING_TIMEOUT',
            payload: { analysis_id: state.apiRequest.analysis_id! },
          });
          clearInterval(intervalId);
        }
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, [state.loading.is_polling, state.timer.start_time]);

  // 로컬 저장소에서 폼 데이터 복원
  useEffect(() => {
    const savedData = localStorage.getItem('new-analysis-form');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        dispatch({
          type: 'RESTORE_FORM_FROM_LOCAL_STORAGE',
          payload: { saved_form_data: parsed },
        });
      } catch (error) {
        console.error('Failed to restore form data', error);
      }
    }
  }, []);

  const fetchAnalysisCount = async () => {
    dispatch({ type: 'FETCH_ANALYSIS_COUNT_START' });
    try {
      const response = await apiClient.get('/api/user/analysis-count');
      dispatch({
        type: 'FETCH_ANALYSIS_COUNT_SUCCESS',
        payload: response.data,
      });
    } catch (error) {
      dispatch({
        type: 'FETCH_ANALYSIS_COUNT_FAILURE',
        payload: { error: error.message },
      });
    }
  };

  const saveFormToLocalStorage = (formData: FormDataState) => {
    localStorage.setItem('new-analysis-form', JSON.stringify(formData));
    dispatch({ type: 'SAVE_FORM_TO_LOCAL_STORAGE' });
  };

  return (
    <NewAnalysisContext.Provider value={{ state, dispatch }}>
      {children}
    </NewAnalysisContext.Provider>
  );
}

export function useNewAnalysisContext() {
  const context = useContext(NewAnalysisContext);
  if (!context) {
    throw new Error('useNewAnalysisContext must be used within NewAnalysisProvider');
  }
  return context;
}
```

### 4.2 데이터 흐름 시각화

```
┌─────────────────────────────────────────────────────────────────┐
│                      NewAnalysisProvider                         │
│  ┌───────────────────────────────────────────────────────┐      │
│  │  useReducer(newAnalysisReducer, initialState)        │      │
│  │                                                        │      │
│  │  [state, dispatch]                                    │      │
│  └───────────────────────────────────────────────────────┘      │
│                           │                                      │
│                           │ Context.Provider                     │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────┐      │
│  │              하위 컴포넌트들                            │      │
│  │                                                        │      │
│  │  NewAnalysisForm                                      │      │
│  │    ├─ useNewAnalysisContext()                         │      │
│  │    ├─ state.formData, validation 구독                │      │
│  │    └─ dispatch({ type: 'SUBMIT_ANALYSIS_START' })    │      │
│  │                                                        │      │
│  │  SubjectNameInput                                     │      │
│  │    ├─ useNewAnalysisContext()                         │      │
│  │    ├─ state.formData.subject_name 구독               │      │
│  │    └─ dispatch({ type: 'UPDATE_FORM_FIELD', ... })   │      │
│  │                                                        │      │
│  │  BirthDateInput                                       │      │
│  │    ├─ useNewAnalysisContext()                         │      │
│  │    ├─ state.formData.birth_date 구독                 │      │
│  │    └─ dispatch({ type: 'UPDATE_FORM_FIELD', ... })   │      │
│  │                                                        │      │
│  │  AnalysisCountBadge                                   │      │
│  │    ├─ useNewAnalysisContext()                         │      │
│  │    ├─ state.analysisCount 구독                        │      │
│  │    └─ dispatch({ type: 'OPEN_MODAL', ... })          │      │
│  │                                                        │      │
│  │  LoadingOverlay                                       │      │
│  │    ├─ useNewAnalysisContext()                         │      │
│  │    ├─ state.loading, timer 구독                       │      │
│  │    └─ (표시 전용, dispatch 없음)                      │      │
│  │                                                        │      │
│  │  InsufficientCountModal                               │      │
│  │    ├─ useNewAnalysisContext()                         │      │
│  │    ├─ state.modals.insufficient_count_modal 구독     │      │
│  │    └─ dispatch({ type: 'CLOSE_MODAL', ... })         │      │
│  │                                                        │      │
│  └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘

외부 API 통신:
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────┐
│ Gemini API      │ ◄──► │  NewAnalysisContext  │ ◄──► │  Backend    │
│ (백엔드 경유)   │      │  (dispatch Actions)  │      │  (Hono API) │
└─────────────────┘      └──────────────────────┘      └─────────────┘
                                  │                          │
                                  │ POST /analyses/new      │
                                  └─────────────────────────►│
                                                      분석 레코드 생성
                                                      Gemini API 호출
                                                      분석 결과 저장
                                                      분석 횟수 차감
```

### 4.3 하위 컴포넌트에 노출할 인터페이스

#### (1) useNewAnalysisContext Hook
```typescript
export function useNewAnalysisContext(): {
  state: NewAnalysisContextState;
  dispatch: React.Dispatch<NewAnalysisAction>;
}
```

#### (2) 커스텀 Hooks (편의성 제공)
```typescript
// 폼 데이터만 필요한 경우
export function useFormData() {
  const { state } = useNewAnalysisContext();
  return state.formData;
}

// 검증 상태
export function useValidation() {
  const { state } = useNewAnalysisContext();
  return state.validation;
}

// 분석 횟수 상태
export function useAnalysisCount() {
  const { state } = useNewAnalysisContext();
  return state.analysisCount;
}

// 로딩 상태
export function useLoading() {
  const { state } = useNewAnalysisContext();
  return state.loading;
}

// 폼 제출 가능 여부 (Derived State)
export function useCanSubmit() {
  const { state } = useNewAnalysisContext();
  const { validation, analysisCount, loading } = state;

  return useMemo(() => {
    return (
      validation.isValid &&
      !analysisCount.is_insufficient &&
      !loading.is_loading
    );
  }, [validation.isValid, analysisCount.is_insufficient, loading.is_loading]);
}

// 진행 메시지 (Derived State)
export function useProgressMessage() {
  const { state } = useNewAnalysisContext();
  const { timer } = state;

  return useMemo(() => {
    if (timer.elapsed_seconds < 15) {
      return {
        title: 'AI가 사주를 분석하고 있습니다...',
        subtitle: '약 5-15초 소요됩니다',
      };
    } else if (timer.elapsed_seconds < 30) {
      return {
        title: 'AI가 사주를 분석하고 있습니다...',
        subtitle: '조금만 더 기다려주세요...',
      };
    } else {
      return {
        title: '분석이 예상보다 오래 걸리고 있습니다',
        subtitle: '백그라운드에서 계속 처리 중입니다',
      };
    }
  }, [timer.elapsed_seconds]);
}
```

### 4.4 비동기 로직 처리 (API 호출)

Context 내부에서 비동기 로직을 처리하기 위해 별도 함수로 분리합니다.

```typescript
// newAnalysisActions.ts
export async function submitAnalysis(
  dispatch: React.Dispatch<NewAnalysisAction>,
  formData: FormDataState
) {
  dispatch({ type: 'SUBMIT_ANALYSIS_START' });
  dispatch({ type: 'START_TIMER' });

  try {
    const response = await apiClient.post('/api/analyses/new', {
      subject_name: formData.subject_name,
      birth_date: formData.birth_date,
      birth_time: formData.birth_time,
      gender: formData.gender,
    });

    const { analysis_id, status, remaining_count } = response.data;

    dispatch({
      type: 'SUBMIT_ANALYSIS_SUCCESS',
      payload: { analysis_id, status, remaining_count },
    });

    if (status === 'completed') {
      // 즉시 완료된 경우 결과 페이지로 리다이렉트
      dispatch({ type: 'STOP_TIMER' });
      dispatch({ type: 'CLEAR_LOCAL_STORAGE' });
      window.location.href = `/analysis/${analysis_id}`;
    } else if (status === 'processing') {
      // 폴링 시작
      dispatch({
        type: 'START_POLLING',
        payload: { analysis_id },
      });
      pollAnalysisStatus(dispatch, analysis_id);
    }

    return { success: true };
  } catch (error) {
    dispatch({ type: 'STOP_TIMER' });

    const apiError: APIError = parseAPIError(error);

    dispatch({
      type: 'SUBMIT_ANALYSIS_FAILURE',
      payload: { error: apiError },
    });

    // 에러 유형별 모달 표시
    if (apiError.code === 'INSUFFICIENT_ANALYSIS_COUNT') {
      dispatch({
        type: 'OPEN_MODAL',
        payload: {
          modal_type: 'insufficient_count',
          data: { message: apiError.message },
        },
      });
    } else if (apiError.code === 'ANALYSIS_IN_PROGRESS') {
      dispatch({
        type: 'OPEN_MODAL',
        payload: {
          modal_type: 'duplicate_analysis',
          data: { existing_analysis_id: error.response?.data?.analysis_id },
        },
      });
    } else if (apiError.code === 'UNAUTHORIZED') {
      dispatch({
        type: 'OPEN_MODAL',
        payload: { modal_type: 'session_expired' },
      });
    }

    return { success: false, error: apiError };
  }
}

async function pollAnalysisStatus(
  dispatch: React.Dispatch<NewAnalysisAction>,
  analysis_id: string
) {
  const maxPollingTime = 30000; // 30초
  const pollingInterval = 2000; // 2초
  const startTime = Date.now();

  const poll = async () => {
    try {
      const response = await apiClient.get(`/api/analyses/${analysis_id}/status`);
      const { status } = response.data;

      if (status === 'completed') {
        dispatch({
          type: 'POLLING_SUCCESS',
          payload: { analysis_id },
        });
        dispatch({ type: 'STOP_TIMER' });
        dispatch({ type: 'CLEAR_LOCAL_STORAGE' });
        window.location.href = `/analysis/${analysis_id}`;
        return;
      }

      // 타임아웃 체크
      if (Date.now() - startTime >= maxPollingTime) {
        dispatch({
          type: 'POLLING_TIMEOUT',
          payload: { analysis_id },
        });
        return;
      }

      // 다음 폴링 예약
      setTimeout(poll, pollingInterval);
    } catch (error) {
      console.error('Polling error:', error);
      // 폴링 에러는 무시하고 계속 재시도
      setTimeout(poll, pollingInterval);
    }
  };

  poll();
}

function parseAPIError(error: any): APIError {
  const errorCode = error.response?.data?.error?.code || 'UNKNOWN_ERROR';
  const errorMessage =
    error.response?.data?.error?.message || '알 수 없는 오류가 발생했습니다';

  const recoverableErrors = [
    'NETWORK_ERROR',
    'TIMEOUT',
    'GEMINI_API_ERROR',
  ];

  return {
    code: errorCode,
    message: errorMessage,
    is_recoverable: recoverableErrors.includes(errorCode),
  };
}
```

### 4.5 하위 컴포넌트에서의 사용 예시

```typescript
// NewAnalysisPage.tsx
export default function NewAnalysisPage() {
  return (
    <NewAnalysisProvider>
      <div className="container">
        <PageHeader title="새 분석하기" />
        <NewAnalysisForm />
        <InsufficientCountModal />
        <DuplicateAnalysisModal />
        <SessionExpiredModal />
        <TimeoutModal />
      </div>
    </NewAnalysisProvider>
  );
}

// SubmitButton.tsx
function SubmitButton({ disabled, loading }: { disabled: boolean; loading: boolean }) {
  const { dispatch } = useNewAnalysisContext();
  const formData = useFormData();

  const handleSubmit = async () => {
    await submitAnalysis(dispatch, formData);
  };

  return (
    <Button
      type="submit"
      disabled={disabled}
      loading={loading}
      onClick={handleSubmit}
      size="large"
    >
      분석 시작
    </Button>
  );
}
```

## 5. 테스트 시나리오

### 5.1 단위 테스트 (Reducer)
```typescript
describe('newAnalysisReducer', () => {
  it('should handle UPDATE_FORM_FIELD', () => {
    const action: UpdateFormFieldAction = {
      type: 'UPDATE_FORM_FIELD',
      payload: { field: 'subject_name', value: '홍길동' },
    };

    const nextState = newAnalysisReducer(initialState, action);

    expect(nextState.formData.subject_name).toBe('홍길동');
  });

  it('should validate form when all required fields are filled', () => {
    let state = initialState;

    // 성함 입력
    state = newAnalysisReducer(state, {
      type: 'UPDATE_FORM_FIELD',
      payload: { field: 'subject_name', value: '홍길동' },
    });

    // 생년월일 입력
    state = newAnalysisReducer(state, {
      type: 'UPDATE_FORM_FIELD',
      payload: { field: 'birth_date', value: '1990-01-15' },
    });

    // 성별 선택
    state = newAnalysisReducer(state, {
      type: 'UPDATE_FORM_FIELD',
      payload: { field: 'gender', value: 'male' },
    });

    // 검증 실행
    state = newAnalysisReducer(state, { type: 'VALIDATE_FORM' });

    expect(state.validation.isValid).toBe(true);
  });

  it('should handle SUBMIT_ANALYSIS_SUCCESS with polling', () => {
    const action: SubmitAnalysisSuccessAction = {
      type: 'SUBMIT_ANALYSIS_SUCCESS',
      payload: {
        analysis_id: 'test-id',
        status: 'processing',
        remaining_count: 2,
      },
    };

    const nextState = newAnalysisReducer(initialState, action);

    expect(nextState.apiRequest.status).toBe('polling');
    expect(nextState.loading.is_polling).toBe(true);
  });
});
```

### 5.2 통합 테스트 (Context + Components)
```typescript
describe('NewAnalysisProvider Integration', () => {
  it('should fetch analysis count on mount', async () => {
    const mockApiClient = {
      get: jest.fn().mockResolvedValue({
        data: {
          subscription_tier: 'free',
          remaining_count: 3,
          max_count: 3,
        },
      }),
    };

    render(
      <NewAnalysisProvider>
        <AnalysisCountBadge />
      </NewAnalysisProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('남은 무료 분석: 3/3회')).toBeInTheDocument();
    });
  });

  it('should submit analysis and show loading overlay', async () => {
    const mockApiClient = {
      post: jest.fn().mockResolvedValue({
        data: {
          analysis_id: 'test-id',
          status: 'completed',
          remaining_count: 2,
        },
      }),
    };

    render(
      <NewAnalysisProvider>
        <NewAnalysisForm />
      </NewAnalysisProvider>
    );

    // 폼 입력
    fireEvent.change(screen.getByLabelText('성함'), { target: { value: '홍길동' } });
    fireEvent.change(screen.getByLabelText('생년월일'), { target: { value: '1990-01-15' } });
    fireEvent.click(screen.getByLabelText('남성'));

    // 제출
    fireEvent.click(screen.getByText('분석 시작'));

    // 로딩 오버레이 표시 확인
    await waitFor(() => {
      expect(screen.getByText('AI가 사주를 분석하고 있습니다...')).toBeInTheDocument();
    });
  });
});
```

## 6. 성능 최적화

### 6.1 메모이제이션
- `useMemo`로 Derived State 계산 결과 캐싱
- `useCallback`으로 이벤트 핸들러 함수 메모이제이션
- `React.memo`로 입력 필드 컴포넌트 리렌더링 최적화

### 6.2 Debouncing
- 입력 필드 검증을 300ms debounce하여 과도한 검증 방지
- 로컬 저장소 저장을 1초 debounce

### 6.3 코드 스플리팅
- 모달 컴포넌트들을 동적 import로 로드
  ```typescript
  const InsufficientCountModal = lazy(() => import('./InsufficientCountModal'));
  ```

### 6.4 선택적 리렌더링
- Context를 기능별로 분리 (필요시):
  - `FormDataContext`: 폼 데이터만
  - `ValidationContext`: 검증 상태만
  - `LoadingContext`: 로딩 상태만

## 7. 보안 고려사항

### 7.1 입력값 검증
- Frontend와 Backend 모두에서 검증 수행
- Zod 스키마로 엄격한 타입 검증
- SQL Injection 방지 (Prepared Statements)

### 7.2 인증 및 인가
- 모든 API 요청에 Clerk JWT 토큰 포함
- Backend에서 토큰 검증 및 user_id 추출
- 사용자는 본인의 분석만 생성 가능

### 7.3 Rate Limiting
- 애플리케이션 레벨에서 사용자별 요청 횟수 제한
- 분당 최대 5회 요청 제한

### 7.4 민감 정보 보호
- 로컬 저장소에 저장되는 폼 데이터는 암호화하지 않음 (민감 정보 아님)
- 생년월일, 출생시간은 개인정보로 간주하여 HTTPS로만 전송

## 8. 에러 복구 전략

### 8.1 네트워크 오류
- 자동 재시도 3회 (exponential backoff: 1s, 2s, 4s)
- 최종 실패 시 "다시 시도" 버튼 제공

### 8.2 Gemini API 오류
- Backend에서 최대 3회 재시도
- 실패 시 분석 횟수 자동 복구
- 사용자에게 "일시적 오류" 안내 및 재시도 유도

### 8.3 세션 만료
- 401 Unauthorized 응답 시 로그인 페이지로 리다이렉트
- 로그인 후 폼 데이터 자동 복원 (localStorage 활용)

### 8.4 타임아웃
- 30초 초과 시 백그라운드 처리로 전환
- 사용자에게 대시보드로 이동 옵션 제공
- 분석 완료 시 이메일/앱 내 알림 발송

## 9. 향후 확장 고려사항

### 9.1 실시간 진행률 표시
- WebSocket 또는 Server-Sent Events로 실시간 진행 상태 업데이트
- 단계별 진행 메시지 (데이터 수신 중 → 분석 중 → 결과 저장 중)

### 9.2 분석 템플릿
- 자주 분석하는 대상 정보를 템플릿으로 저장
- `formData` 상태에 `template_id` 필드 추가
- 템플릿 선택 시 폼 자동 입력

### 9.3 배치 분석
- 여러 사람의 정보를 한 번에 입력하여 분석
- `formData`를 배열로 확장: `FormDataState[]`
- CSV 파일 업로드 기능

### 9.4 AI 모델 선택
- Pro 회원이 모델을 직접 선택할 수 있도록 옵션 제공
- `formData`에 `ai_model` 필드 추가
- 모델별 예상 소요 시간 및 정확도 안내
