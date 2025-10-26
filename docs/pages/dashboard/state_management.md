# 대시보드 페이지 상태 관리 설계 (Level 3)

## 1. 상태 정의

### 1.1 관리해야 할 상태 데이터

#### 1.1.1 사용자 정보 상태 (UserSummaryState)
```typescript
type UserSummaryState = {
  user: {
    id: string;
    name: string;
    email: string;
    subscription_tier: 'free' | 'pro';
  } | null;
  subscription: {
    status: 'active' | 'cancelled' | 'suspended' | null;
    next_payment_date: string | null;
    card_last_4digits: string | null;
    remaining_count: number;
  } | null;
  isLoading: boolean;
  error: string | null;
};
```

**역할**: 상단 요약 섹션의 사용자 정보 및 구독 상태 표시

#### 1.1.2 통계 상태 (StatsState)
```typescript
type StatsState = {
  total_count: number;
  monthly_count: number;
  this_week_count: number;
  isLoading: boolean;
  error: string | null;
};
```

**역할**: 통계 카드 표시

#### 1.1.3 분석 목록 상태 (AnalysesState)
```typescript
type AnalysesState = {
  analyses: Array<{
    id: string;
    subject_name: string;
    birth_date: string;
    gender: 'male' | 'female';
    ai_model: 'gemini-2.0-flash' | 'gemini-2.0-pro';
    status: 'processing' | 'completed' | 'failed';
    created_at: string;
    view_count: number;
  }>;
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    per_page: number;
  };
  isLoading: boolean;
  error: string | null;
};
```

**역할**: 분석 이력 카드 그리드 표시

#### 1.1.4 필터 상태 (FilterState)
```typescript
type FilterState = {
  period: 'all' | '7days' | '30days' | '90days';
  sort: 'latest' | 'oldest';
};
```

**역할**: 분석 목록 필터링 및 정렬

#### 1.1.5 페이지네이션 상태 (PaginationState)
```typescript
type PaginationState = {
  current_page: number;
  per_page: number;
};
```

**역할**: 분석 목록 페이지네이션

#### 1.1.6 폴링 상태 (PollingState)
```typescript
type PollingState = {
  isPolling: boolean;
  pollingCount: number; // 최대 12회 (60초)
};
```

**역할**: 처리 중인 분석의 실시간 업데이트

### 1.2 상태가 아닌 화면 데이터

다음은 화면에 보이지만 별도 상태 관리가 필요하지 않은 데이터입니다:

1. **상대 시간 표시** ("3시간 전", "2일 전")
   - `created_at`으로부터 계산된 파생 데이터
   - `date-fns`의 `formatDistanceToNow` 사용

2. **구독 뱃지 색상**
   - `subscription_tier`에 따라 결정되는 UI 속성
   - 조건부 CSS 클래스

3. **AI 모델 뱃지 텍스트**
   - `ai_model` 값의 표시 형태
   - "flash" → "Flash", "pro" → "Pro"

4. **남은 분석 횟수 메시지**
   - `remaining_count`로부터 생성되는 문자열
   - "남은 무료 분석: X/3회"

5. **페이지 번호 버튼 배열**
   - `total_pages`로부터 계산된 배열
   - `[1, 2, 3, ...]`

6. **빈 상태 표시 여부**
   - `analyses.length === 0`으로 결정
   - 조건부 렌더링

## 2. 상태 전환 테이블

### 2.1 UserSummaryState 전환

| 현재 상태 | 이벤트 | 다음 상태 | 화면 변화 |
|----------|--------|----------|----------|
| `isLoading: true` | API 호출 성공 | `user, subscription 설정, isLoading: false` | 스켈레톤 → 사용자 정보 표시 |
| `isLoading: true` | API 호출 실패 | `error 설정, isLoading: false` | 스켈레톤 → 에러 메시지 |
| `user: null` | 재시도 버튼 클릭 | `isLoading: true` | 에러 메시지 → 스켈레톤 |
| `subscription_tier: 'free'` | Pro 구독 완료 | `subscription_tier: 'pro'` | 무료 뱃지 → Pro 뱃지 |
| `remaining_count: 3` | 분석 실행 | `remaining_count: 2` | "3/3회" → "2/3회" |
| `subscription: active` | 구독 해지 | `subscription: cancelled` | 해지 예정 배너 표시 |

### 2.2 StatsState 전환

| 현재 상태 | 이벤트 | 다음 상태 | 화면 변화 |
|----------|--------|----------|----------|
| `isLoading: true` | API 호출 성공 | `통계 데이터 설정, isLoading: false` | 스켈레톤 → 통계 카드 |
| `isLoading: true` | API 호출 실패 | `error 설정, isLoading: false` | 스켈레톤 → 에러 메시지 |
| `total_count: 5` | 새 분석 완료 | `total_count: 6, monthly_count: 3` | 숫자 업데이트 |
| `error: 'message'` | 새로고침 클릭 | `isLoading: true, error: null` | 에러 메시지 → 스켈레톤 |

### 2.3 AnalysesState 전환

| 현재 상태 | 이벤트 | 다음 상태 | 화면 변화 |
|----------|--------|----------|----------|
| `isLoading: true` | API 호출 성공 | `analyses, pagination 설정, isLoading: false` | 스켈레톤 → 분석 카드 그리드 |
| `analyses: []` | 빈 배열 반환 | `isLoading: false` | 빈 상태 UI 표시 |
| `status: 'processing'` | 폴링으로 상태 확인 | `status: 'completed'` | 로딩 → 체크마크 |
| `analyses: [...]` | 필터 변경 | `isLoading: true` → 새 데이터 | 로딩 → 필터링된 목록 |
| `current_page: 1` | 다음 페이지 클릭 | `current_page: 2, isLoading: true` | 2페이지 데이터 로드 |

### 2.4 FilterState 전환

| 현재 상태 | 이벤트 | 다음 상태 | 화면 변화 |
|----------|--------|----------|----------|
| `period: 'all'` | "최근 7일" 선택 | `period: '7days'` | 전체 목록 → 7일 목록 |
| `sort: 'latest'` | "오래된순" 선택 | `sort: 'oldest'` | 최신순 → 오래된순 |
| `period: '7days'` | "전체" 선택 | `period: 'all'` | 7일 목록 → 전체 목록 |

### 2.5 PaginationState 전환

| 현재 상태 | 이벤트 | 다음 상태 | 화면 변화 |
|----------|--------|----------|----------|
| `current_page: 1` | "2" 페이지 클릭 | `current_page: 2` | 1페이지 → 2페이지 데이터 |
| `current_page: 2` | "이전" 버튼 클릭 | `current_page: 1` | 2페이지 → 1페이지 데이터 |
| `current_page: 3` | 필터 변경 | `current_page: 1` | 페이지 초기화 |

### 2.6 PollingState 전환

| 현재 상태 | 이벤트 | 다음 상태 | 화면 변화 |
|----------|--------|----------|----------|
| `isPolling: false` | 처리 중 분석 발견 | `isPolling: true, pollingCount: 0` | 5초 간격 폴링 시작 |
| `isPolling: true, pollingCount: 5` | 5초 경과 | `pollingCount: 6` | API 재호출 |
| `isPolling: true, pollingCount: 12` | 최대 횟수 도달 | `isPolling: false, pollingCount: 0` | 폴링 중단 |
| `isPolling: true` | 모든 분석 완료 | `isPolling: false, pollingCount: 0` | 폴링 중단 |

## 3. Flux 패턴 설계

### 3.1 Action 정의

```typescript
type DashboardAction =
  // 사용자 정보
  | { type: 'FETCH_SUMMARY_START' }
  | { type: 'FETCH_SUMMARY_SUCCESS'; payload: { user: User; subscription: Subscription } }
  | { type: 'FETCH_SUMMARY_ERROR'; payload: { error: string } }

  // 통계
  | { type: 'FETCH_STATS_START' }
  | { type: 'FETCH_STATS_SUCCESS'; payload: { total_count: number; monthly_count: number; this_week_count: number } }
  | { type: 'FETCH_STATS_ERROR'; payload: { error: string } }

  // 분석 목록
  | { type: 'FETCH_ANALYSES_START' }
  | { type: 'FETCH_ANALYSES_SUCCESS'; payload: { analyses: Analysis[]; pagination: Pagination } }
  | { type: 'FETCH_ANALYSES_ERROR'; payload: { error: string } }

  // 필터
  | { type: 'SET_PERIOD'; payload: { period: 'all' | '7days' | '30days' | '90days' } }
  | { type: 'SET_SORT'; payload: { sort: 'latest' | 'oldest' } }
  | { type: 'RESET_FILTERS' }

  // 페이지네이션
  | { type: 'SET_PAGE'; payload: { page: number } }
  | { type: 'RESET_PAGE' }

  // 폴링
  | { type: 'START_POLLING' }
  | { type: 'STOP_POLLING' }
  | { type: 'INCREMENT_POLLING_COUNT' }
  | { type: 'UPDATE_ANALYSIS_STATUS'; payload: { id: string; status: 'completed' | 'failed' } };
```

### 3.2 Reducer 설계

```typescript
type DashboardState = {
  userSummary: UserSummaryState;
  stats: StatsState;
  analyses: AnalysesState;
  filters: FilterState;
  pagination: PaginationState;
  polling: PollingState;
};

const initialState: DashboardState = {
  userSummary: {
    user: null,
    subscription: null,
    isLoading: true,
    error: null,
  },
  stats: {
    total_count: 0,
    monthly_count: 0,
    this_week_count: 0,
    isLoading: true,
    error: null,
  },
  analyses: {
    analyses: [],
    pagination: {
      current_page: 1,
      total_pages: 0,
      total_count: 0,
      per_page: 10,
    },
    isLoading: true,
    error: null,
  },
  filters: {
    period: 'all',
    sort: 'latest',
  },
  pagination: {
    current_page: 1,
    per_page: 10,
  },
  polling: {
    isPolling: false,
    pollingCount: 0,
  },
};

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    // 사용자 정보
    case 'FETCH_SUMMARY_START':
      return {
        ...state,
        userSummary: {
          ...state.userSummary,
          isLoading: true,
          error: null,
        },
      };

    case 'FETCH_SUMMARY_SUCCESS':
      return {
        ...state,
        userSummary: {
          user: action.payload.user,
          subscription: action.payload.subscription,
          isLoading: false,
          error: null,
        },
      };

    case 'FETCH_SUMMARY_ERROR':
      return {
        ...state,
        userSummary: {
          ...state.userSummary,
          isLoading: false,
          error: action.payload.error,
        },
      };

    // 통계
    case 'FETCH_STATS_START':
      return {
        ...state,
        stats: {
          ...state.stats,
          isLoading: true,
          error: null,
        },
      };

    case 'FETCH_STATS_SUCCESS':
      return {
        ...state,
        stats: {
          ...action.payload,
          isLoading: false,
          error: null,
        },
      };

    case 'FETCH_STATS_ERROR':
      return {
        ...state,
        stats: {
          ...state.stats,
          isLoading: false,
          error: action.payload.error,
        },
      };

    // 분석 목록
    case 'FETCH_ANALYSES_START':
      return {
        ...state,
        analyses: {
          ...state.analyses,
          isLoading: true,
          error: null,
        },
      };

    case 'FETCH_ANALYSES_SUCCESS':
      return {
        ...state,
        analyses: {
          analyses: action.payload.analyses,
          pagination: action.payload.pagination,
          isLoading: false,
          error: null,
        },
      };

    case 'FETCH_ANALYSES_ERROR':
      return {
        ...state,
        analyses: {
          ...state.analyses,
          isLoading: false,
          error: action.payload.error,
        },
      };

    // 필터
    case 'SET_PERIOD':
      return {
        ...state,
        filters: {
          ...state.filters,
          period: action.payload.period,
        },
        pagination: {
          ...state.pagination,
          current_page: 1, // 필터 변경 시 페이지 초기화
        },
      };

    case 'SET_SORT':
      return {
        ...state,
        filters: {
          ...state.filters,
          sort: action.payload.sort,
        },
        pagination: {
          ...state.pagination,
          current_page: 1, // 정렬 변경 시 페이지 초기화
        },
      };

    case 'RESET_FILTERS':
      return {
        ...state,
        filters: {
          period: 'all',
          sort: 'latest',
        },
        pagination: {
          ...state.pagination,
          current_page: 1,
        },
      };

    // 페이지네이션
    case 'SET_PAGE':
      return {
        ...state,
        pagination: {
          ...state.pagination,
          current_page: action.payload.page,
        },
      };

    case 'RESET_PAGE':
      return {
        ...state,
        pagination: {
          ...state.pagination,
          current_page: 1,
        },
      };

    // 폴링
    case 'START_POLLING':
      return {
        ...state,
        polling: {
          isPolling: true,
          pollingCount: 0,
        },
      };

    case 'STOP_POLLING':
      return {
        ...state,
        polling: {
          isPolling: false,
          pollingCount: 0,
        },
      };

    case 'INCREMENT_POLLING_COUNT':
      return {
        ...state,
        polling: {
          ...state.polling,
          pollingCount: state.polling.pollingCount + 1,
        },
      };

    case 'UPDATE_ANALYSIS_STATUS':
      return {
        ...state,
        analyses: {
          ...state.analyses,
          analyses: state.analyses.analyses.map(analysis =>
            analysis.id === action.payload.id
              ? { ...analysis, status: action.payload.status }
              : analysis
          ),
        },
      };

    default:
      return state;
  }
}
```

### 3.3 Flux 흐름도

```
[View] 사용자 액션
  ↓
[Action Creator] Action 생성
  ↓
[Dispatcher] Action 전달 (dispatch)
  ↓
[Reducer] 상태 계산
  ↓
[Store] 상태 업데이트
  ↓
[View] 리렌더링
```

### 3.4 구체적인 Flux 시나리오

#### 시나리오 1: 페이지 초기 로드

1. **Action**: 컴포넌트 마운트
   ```typescript
   useEffect(() => {
     dispatch({ type: 'FETCH_SUMMARY_START' });
     dispatch({ type: 'FETCH_STATS_START' });
     dispatch({ type: 'FETCH_ANALYSES_START' });
   }, []);
   ```

2. **Store (Reducer)**: 로딩 상태로 변경
   - `userSummary.isLoading = true`
   - `stats.isLoading = true`
   - `analyses.isLoading = true`

3. **View**: 스켈레톤 UI 표시
   - 요약 섹션 스켈레톤
   - 통계 카드 스켈레톤
   - 분석 카드 스켈레톤 (10개)

4. **API 호출**: 병렬 요청
   ```typescript
   Promise.all([
     fetchSummary(),
     fetchStats(),
     fetchAnalyses({ period: 'all', sort: 'latest', page: 1, limit: 10 }),
   ]);
   ```

5. **Action**: 성공 응답
   ```typescript
   dispatch({ type: 'FETCH_SUMMARY_SUCCESS', payload: summaryData });
   dispatch({ type: 'FETCH_STATS_SUCCESS', payload: statsData });
   dispatch({ type: 'FETCH_ANALYSES_SUCCESS', payload: analysesData });
   ```

6. **Store**: 데이터 설정 및 로딩 완료
   - `userSummary.user = data`
   - `stats = data`
   - `analyses.analyses = data`
   - `isLoading = false`

7. **View**: 실제 데이터 렌더링
   - 사용자 정보 및 구독 상태
   - 통계 카드
   - 분석 카드 그리드

#### 시나리오 2: 필터 변경 (최근 7일 선택)

1. **Action**: 사용자가 "최근 7일" 선택
   ```typescript
   const handlePeriodChange = (period: '7days') => {
     dispatch({ type: 'SET_PERIOD', payload: { period: '7days' } });
   };
   ```

2. **Store**: 필터 상태 업데이트
   - `filters.period = '7days'`
   - `pagination.current_page = 1` (페이지 초기화)

3. **View**: URL 쿼리 파라미터 업데이트
   ```typescript
   useEffect(() => {
     const searchParams = new URLSearchParams();
     searchParams.set('period', state.filters.period);
     searchParams.set('sort', state.filters.sort);
     searchParams.set('page', String(state.pagination.current_page));
     router.push(`/dashboard?${searchParams.toString()}`);
   }, [state.filters, state.pagination]);
   ```

4. **Action**: 분석 목록 재조회
   ```typescript
   useEffect(() => {
     dispatch({ type: 'FETCH_ANALYSES_START' });
     fetchAnalyses({
       period: state.filters.period,
       sort: state.filters.sort,
       page: state.pagination.current_page,
       limit: state.pagination.per_page,
     }).then(data => {
       dispatch({ type: 'FETCH_ANALYSES_SUCCESS', payload: data });
     });
   }, [state.filters, state.pagination]);
   ```

5. **Store**: 로딩 상태 → 새 데이터
   - `analyses.isLoading = true`
   - API 응답 후: `analyses.analyses = newData`

6. **View**: 필터링된 목록 표시
   - 로딩 스켈레톤 → 7일 이내 분석 목록

#### 시나리오 3: 페이지네이션 (2페이지 클릭)

1. **Action**: 사용자가 "2" 페이지 버튼 클릭
   ```typescript
   const handlePageChange = (page: 2) => {
     dispatch({ type: 'SET_PAGE', payload: { page: 2 } });
   };
   ```

2. **Store**: 페이지 상태 업데이트
   - `pagination.current_page = 2`

3. **View**: 스크롤 최상단 이동
   ```typescript
   useEffect(() => {
     window.scrollTo({ top: 0, behavior: 'smooth' });
   }, [state.pagination.current_page]);
   ```

4. **Action**: 2페이지 데이터 조회
   ```typescript
   dispatch({ type: 'FETCH_ANALYSES_START' });
   fetchAnalyses({
     period: state.filters.period,
     sort: state.filters.sort,
     page: 2,
     limit: 10,
   });
   ```

5. **Store**: 2페이지 데이터 설정
   - `analyses.analyses = page2Data`
   - `analyses.pagination.current_page = 2`

6. **View**: 2페이지 목록 렌더링

#### 시나리오 4: 처리 중 분석 실시간 업데이트

1. **Action**: 분석 목록 로드 후 처리 중 분석 발견
   ```typescript
   useEffect(() => {
     const hasProcessing = state.analyses.analyses.some(a => a.status === 'processing');
     if (hasProcessing && !state.polling.isPolling) {
       dispatch({ type: 'START_POLLING' });
     }
   }, [state.analyses.analyses]);
   ```

2. **Store**: 폴링 시작
   - `polling.isPolling = true`
   - `polling.pollingCount = 0`

3. **View**: 5초 간격 폴링 시작
   ```typescript
   useEffect(() => {
     if (!state.polling.isPolling) return;

     const interval = setInterval(() => {
       dispatch({ type: 'INCREMENT_POLLING_COUNT' });

       if (state.polling.pollingCount >= 12) { // 60초
         dispatch({ type: 'STOP_POLLING' });
         return;
       }

       // API 재호출
       fetchAnalyses({
         period: state.filters.period,
         sort: state.filters.sort,
         page: state.pagination.current_page,
         limit: state.pagination.per_page,
       }).then(data => {
         dispatch({ type: 'FETCH_ANALYSES_SUCCESS', payload: data });

         // 모든 분석이 완료되었는지 확인
         const hasProcessing = data.analyses.some(a => a.status === 'processing');
         if (!hasProcessing) {
           dispatch({ type: 'STOP_POLLING' });
         }
       });
     }, 5000);

     return () => clearInterval(interval);
   }, [state.polling.isPolling, state.polling.pollingCount]);
   ```

4. **Store**: 상태 업데이트
   - `analyses.analyses[i].status = 'completed'`
   - 모든 분석 완료 시: `polling.isPolling = false`

5. **View**: 실시간 UI 업데이트
   - 로딩 애니메이션 → 체크마크

## 4. Context + useReducer 설계

### 4.1 Context 아키텍처

```
┌─────────────────────────────────────────────┐
│          DashboardProvider                  │
│  ┌───────────────────────────────────────┐  │
│  │     useReducer(dashboardReducer)      │  │
│  │  - state: DashboardState              │  │
│  │  - dispatch: Dispatch<DashboardAction>│  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │     API 호출 로직                     │  │
│  │  - fetchSummary()                     │  │
│  │  - fetchStats()                       │  │
│  │  - fetchAnalyses()                    │  │
│  └───────────────────────────────────────┘  │
│  ┌───────────────────────────────────────┐  │
│  │     액션 헬퍼 함수                    │  │
│  │  - handlePeriodChange()               │  │
│  │  - handleSortChange()                 │  │
│  │  - handlePageChange()                 │  │
│  │  - resetFilters()                     │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ↓                       ↓
┌───────────────┐       ┌───────────────┐
│ SummarySection│       │ AnalysesList  │
│ - user        │       │ - analyses    │
│ - subscription│       │ - pagination  │
└───────────────┘       └───────────────┘
        ↓                       ↓
┌───────────────┐       ┌───────────────┐
│  StatsCards   │       │  FilterBar    │
│ - total_count │       │ - period      │
│ - monthly     │       │ - sort        │
└───────────────┘       └───────────────┘
```

### 4.2 Context 인터페이스

```typescript
type DashboardContextValue = {
  // 상태
  state: DashboardState;

  // 액션 헬퍼
  actions: {
    // 데이터 조회
    fetchSummary: () => Promise<void>;
    fetchStats: () => Promise<void>;
    fetchAnalyses: () => Promise<void>;

    // 필터
    setPeriod: (period: 'all' | '7days' | '30days' | '90days') => void;
    setSort: (sort: 'latest' | 'oldest') => void;
    resetFilters: () => void;

    // 페이지네이션
    setPage: (page: number) => void;

    // 폴링
    startPolling: () => void;
    stopPolling: () => void;
  };

  // 파생 데이터 (computed)
  computed: {
    hasProcessingAnalyses: boolean;
    isEmpty: boolean;
    isInitialLoading: boolean;
  };
};
```

### 4.3 Provider 구현

```typescript
export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  // API 호출 함수
  const fetchSummary = useCallback(async () => {
    dispatch({ type: 'FETCH_SUMMARY_START' });
    try {
      const data = await apiClient.get('/api/dashboard/summary');
      dispatch({ type: 'FETCH_SUMMARY_SUCCESS', payload: data });
    } catch (error) {
      dispatch({ type: 'FETCH_SUMMARY_ERROR', payload: { error: error.message } });
    }
  }, []);

  const fetchStats = useCallback(async () => {
    dispatch({ type: 'FETCH_STATS_START' });
    try {
      const data = await apiClient.get('/api/dashboard/stats');
      dispatch({ type: 'FETCH_STATS_SUCCESS', payload: data });
    } catch (error) {
      dispatch({ type: 'FETCH_STATS_ERROR', payload: { error: error.message } });
    }
  }, []);

  const fetchAnalyses = useCallback(async () => {
    dispatch({ type: 'FETCH_ANALYSES_START' });
    try {
      const params = {
        period: state.filters.period,
        sort: state.filters.sort,
        page: state.pagination.current_page,
        limit: state.pagination.per_page,
      };
      const data = await apiClient.get('/api/analyses', { params });
      dispatch({ type: 'FETCH_ANALYSES_SUCCESS', payload: data });
    } catch (error) {
      dispatch({ type: 'FETCH_ANALYSES_ERROR', payload: { error: error.message } });
    }
  }, [state.filters, state.pagination]);

  // 액션 헬퍼
  const setPeriod = useCallback((period: FilterState['period']) => {
    dispatch({ type: 'SET_PERIOD', payload: { period } });
  }, []);

  const setSort = useCallback((sort: FilterState['sort']) => {
    dispatch({ type: 'SET_SORT', payload: { sort } });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: 'RESET_FILTERS' });
  }, []);

  const setPage = useCallback((page: number) => {
    dispatch({ type: 'SET_PAGE', payload: { page } });
  }, []);

  const startPolling = useCallback(() => {
    dispatch({ type: 'START_POLLING' });
  }, []);

  const stopPolling = useCallback(() => {
    dispatch({ type: 'STOP_POLLING' });
  }, []);

  // 파생 데이터 (computed)
  const computed = useMemo(() => ({
    hasProcessingAnalyses: state.analyses.analyses.some(a => a.status === 'processing'),
    isEmpty: state.analyses.analyses.length === 0 && !state.analyses.isLoading,
    isInitialLoading: state.userSummary.isLoading && state.stats.isLoading && state.analyses.isLoading,
  }), [state]);

  // 초기 데이터 로드
  useEffect(() => {
    fetchSummary();
    fetchStats();
    fetchAnalyses();
  }, [fetchSummary, fetchStats, fetchAnalyses]);

  // 필터/페이지 변경 시 데이터 재조회
  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  // 폴링 로직
  useEffect(() => {
    if (!state.polling.isPolling) return;

    const interval = setInterval(() => {
      dispatch({ type: 'INCREMENT_POLLING_COUNT' });

      if (state.polling.pollingCount >= 12) {
        dispatch({ type: 'STOP_POLLING' });
        return;
      }

      fetchAnalyses();
    }, 5000);

    return () => clearInterval(interval);
  }, [state.polling.isPolling, state.polling.pollingCount, fetchAnalyses]);

  // 처리 중 분석 감지 시 폴링 시작
  useEffect(() => {
    if (computed.hasProcessingAnalyses && !state.polling.isPolling) {
      startPolling();
    } else if (!computed.hasProcessingAnalyses && state.polling.isPolling) {
      stopPolling();
    }
  }, [computed.hasProcessingAnalyses, state.polling.isPolling, startPolling, stopPolling]);

  const value: DashboardContextValue = {
    state,
    actions: {
      fetchSummary,
      fetchStats,
      fetchAnalyses,
      setPeriod,
      setSort,
      resetFilters,
      setPage,
      startPolling,
      stopPolling,
    },
    computed,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};
```

### 4.4 하위 컴포넌트에 노출할 변수 및 함수

#### 4.4.1 SummarySection 컴포넌트

**필요한 상태**:
```typescript
const { state } = useDashboardContext();
const { userSummary } = state;

// 사용:
- userSummary.user.name
- userSummary.user.subscription_tier
- userSummary.subscription.remaining_count
- userSummary.subscription.next_payment_date
- userSummary.isLoading
- userSummary.error
```

**필요한 액션**:
```typescript
const { actions } = useDashboardContext();

// 사용:
- actions.fetchSummary() // 재시도 버튼
```

#### 4.4.2 StatsCards 컴포넌트

**필요한 상태**:
```typescript
const { state } = useDashboardContext();
const { stats } = state;

// 사용:
- stats.total_count
- stats.monthly_count
- stats.this_week_count
- stats.isLoading
- stats.error
```

**필요한 액션**:
```typescript
const { actions } = useDashboardContext();

// 사용:
- actions.fetchStats() // 새로고침 버튼
```

#### 4.4.3 AnalysesList 컴포넌트

**필요한 상태**:
```typescript
const { state, computed } = useDashboardContext();
const { analyses, filters, pagination } = state;

// 사용:
- analyses.analyses (카드 그리드)
- analyses.pagination (페이지네이션)
- analyses.isLoading
- analyses.error
- filters.period
- filters.sort
- computed.isEmpty (빈 상태)
- computed.hasProcessingAnalyses (폴링 상태)
```

**필요한 액션**:
```typescript
const { actions } = useDashboardContext();

// 사용:
- actions.fetchAnalyses() // 재시도
```

#### 4.4.4 FilterBar 컴포넌트

**필요한 상태**:
```typescript
const { state } = useDashboardContext();
const { filters } = state;

// 사용:
- filters.period (현재 선택된 필터)
- filters.sort (현재 선택된 정렬)
```

**필요한 액션**:
```typescript
const { actions } = useDashboardContext();

// 사용:
- actions.setPeriod('7days')
- actions.setSort('oldest')
- actions.resetFilters()
```

#### 4.4.5 Pagination 컴포넌트

**필요한 상태**:
```typescript
const { state } = useDashboardContext();
const { analyses, pagination } = state;

// 사용:
- pagination.current_page
- analyses.pagination.total_pages
- analyses.pagination.total_count
```

**필요한 액션**:
```typescript
const { actions } = useDashboardContext();

// 사용:
- actions.setPage(2)
```

### 4.5 데이터 흐름 시각화

```
┌────────────────────────────────────────────────────────┐
│                   DashboardProvider                    │
│                                                        │
│  1. 초기 렌더링                                         │
│     ├─ fetchSummary() → FETCH_SUMMARY_SUCCESS        │
│     ├─ fetchStats() → FETCH_STATS_SUCCESS            │
│     └─ fetchAnalyses() → FETCH_ANALYSES_SUCCESS      │
│                                                        │
│  2. 사용자 액션: 필터 변경 (period: '7days')          │
│     ├─ setPeriod('7days') → SET_PERIOD               │
│     ├─ pagination.current_page = 1 (자동 초기화)     │
│     └─ fetchAnalyses() 재호출 (useEffect)            │
│                                                        │
│  3. 처리 중 분석 감지                                  │
│     ├─ hasProcessingAnalyses = true (computed)       │
│     ├─ startPolling() → START_POLLING                │
│     └─ 5초 간격 폴링 시작 (setInterval)              │
│                                                        │
│  4. 폴링 업데이트                                      │
│     ├─ fetchAnalyses() 호출 (5초마다)                │
│     ├─ status 변경 감지 (processing → completed)     │
│     ├─ hasProcessingAnalyses = false                 │
│     └─ stopPolling() → STOP_POLLING                  │
│                                                        │
│  5. 페이지네이션                                       │
│     ├─ setPage(2) → SET_PAGE                         │
│     └─ fetchAnalyses() 재호출 (page=2)               │
└────────────────────────────────────────────────────────┘
                          ↓
    ┌─────────────────────┴─────────────────────┐
    ↓                     ↓                     ↓
┌─────────┐         ┌─────────┐         ┌─────────┐
│ Summary │         │  Stats  │         │ Analyses│
│ Section │         │  Cards  │         │  List   │
└─────────┘         └─────────┘         └─────────┘
                          ↓
                    ┌─────┴─────┐
                    ↓           ↓
              ┌─────────┐ ┌─────────┐
              │ Filter  │ │Pagina-  │
              │   Bar   │ │  tion   │
              └─────────┘ └─────────┘
```

## 5. 최적화 전략

### 5.1 불필요한 리렌더링 방지

```typescript
// Context를 2개로 분리하여 불필요한 리렌더링 방지
const DashboardStateContext = createContext<DashboardState | null>(null);
const DashboardActionsContext = createContext<DashboardActions | null>(null);

// 컴포넌트에서 필요한 것만 구독
const Summary = () => {
  const state = useContext(DashboardStateContext);
  return <div>{state.userSummary.user?.name}</div>;
  // state.analyses 변경 시 리렌더링 안 됨
};
```

### 5.2 Memoization

```typescript
// 파생 데이터 계산 최적화
const computed = useMemo(() => ({
  hasProcessingAnalyses: state.analyses.analyses.some(a => a.status === 'processing'),
  isEmpty: state.analyses.analyses.length === 0 && !state.analyses.isLoading,
  isInitialLoading: state.userSummary.isLoading && state.stats.isLoading && state.analyses.isLoading,
}), [state]);

// 액션 함수 메모이제이션
const setPeriod = useCallback((period: FilterState['period']) => {
  dispatch({ type: 'SET_PERIOD', payload: { period } });
}, []);
```

### 5.3 Debouncing

```typescript
// 필터 변경 시 debounce 적용
const debouncedFetchAnalyses = useMemo(
  () => debounce(fetchAnalyses, 500),
  [fetchAnalyses]
);

useEffect(() => {
  debouncedFetchAnalyses();
}, [state.filters]);
```

### 5.4 React Query 통합

```typescript
// Context는 UI 상태만 관리하고, 서버 데이터는 React Query로
const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
  queryKey: ['dashboard', 'summary'],
  queryFn: fetchSummary,
  staleTime: 5 * 60 * 1000, // 5분 캐시
});

const { data: analysesData, isLoading: isAnalysesLoading } = useQuery({
  queryKey: ['analyses', state.filters, state.pagination],
  queryFn: () => fetchAnalyses(state.filters, state.pagination),
  staleTime: 1 * 60 * 1000, // 1분 캐시
});
```

## 6. 에러 처리

### 6.1 에러 상태 표시

```typescript
// 에러 발생 시
if (state.userSummary.error) {
  return (
    <ErrorMessage
      message={state.userSummary.error}
      onRetry={actions.fetchSummary}
    />
  );
}
```

### 6.2 에러 경계 (Error Boundary)

```typescript
<ErrorBoundary
  fallback={<DashboardErrorFallback />}
  onError={(error) => console.error('Dashboard Error:', error)}
>
  <DashboardProvider>
    <DashboardPage />
  </DashboardProvider>
</ErrorBoundary>
```

## 7. 테스트 전략

### 7.1 Reducer 테스트

```typescript
describe('dashboardReducer', () => {
  it('should handle FETCH_SUMMARY_SUCCESS', () => {
    const action = {
      type: 'FETCH_SUMMARY_SUCCESS',
      payload: { user: mockUser, subscription: mockSubscription },
    };
    const newState = dashboardReducer(initialState, action);

    expect(newState.userSummary.user).toEqual(mockUser);
    expect(newState.userSummary.isLoading).toBe(false);
  });

  it('should reset page when filter changes', () => {
    const stateWithPage2 = {
      ...initialState,
      pagination: { ...initialState.pagination, current_page: 2 },
    };
    const action = { type: 'SET_PERIOD', payload: { period: '7days' } };
    const newState = dashboardReducer(stateWithPage2, action);

    expect(newState.filters.period).toBe('7days');
    expect(newState.pagination.current_page).toBe(1);
  });
});
```

### 7.2 Context 통합 테스트

```typescript
const wrapper = ({ children }) => (
  <DashboardProvider>{children}</DashboardProvider>
);

it('should fetch data on mount', async () => {
  const { result } = renderHook(() => useDashboardContext(), { wrapper });

  await waitFor(() => {
    expect(result.current.state.userSummary.isLoading).toBe(false);
  });

  expect(result.current.state.userSummary.user).toBeDefined();
});
```

## 8. 마이그레이션 가이드

기존 컴포넌트 상태를 Context로 마이그레이션하는 단계:

1. **DashboardProvider 설정**
   ```typescript
   // app/dashboard/layout.tsx
   export default function DashboardLayout({ children }) {
     return <DashboardProvider>{children}</DashboardProvider>;
   }
   ```

2. **컴포넌트에서 Context 사용**
   ```typescript
   // Before
   const [analyses, setAnalyses] = useState([]);

   // After
   const { state } = useDashboardContext();
   const { analyses } = state.analyses;
   ```

3. **액션 호출**
   ```typescript
   // Before
   const handleFilterChange = (period) => {
     setFilter(period);
     fetchAnalyses({ period });
   };

   // After
   const { actions } = useDashboardContext();
   const handleFilterChange = (period) => {
     actions.setPeriod(period);
   };
   ```

## 9. 성능 모니터링

### 9.1 렌더링 추적

```typescript
useEffect(() => {
  console.log('DashboardProvider re-rendered');
}, [state]);
```

### 9.2 API 호출 추적

```typescript
const fetchAnalyses = useCallback(async () => {
  const startTime = performance.now();
  dispatch({ type: 'FETCH_ANALYSES_START' });

  try {
    const data = await apiClient.get('/api/analyses', { params });
    const endTime = performance.now();
    console.log(`Analyses fetch took ${endTime - startTime}ms`);
    dispatch({ type: 'FETCH_ANALYSES_SUCCESS', payload: data });
  } catch (error) {
    dispatch({ type: 'FETCH_ANALYSES_ERROR', payload: { error: error.message } });
  }
}, [state.filters, state.pagination]);
```

## 10. 결론

이 문서는 대시보드 페이지의 복잡한 상태 관리를 체계적으로 설계한 Level 3 수준의 상태 관리 설계서입니다.

**핵심 설계 원칙**:
1. **단방향 데이터 흐름** (Flux 패턴)
2. **중앙 집중식 상태 관리** (Context + useReducer)
3. **명확한 책임 분리** (UI 상태 vs 서버 상태)
4. **최적화된 리렌더링** (Memoization, Context 분리)
5. **확장 가능한 구조** (Action 타입 추가 용이)

**구현 시 주의사항**:
- 모든 액션은 Reducer를 통해서만 상태 변경
- 직접적인 상태 변경 금지 (불변성 유지)
- API 호출은 Provider에서 관리
- 하위 컴포넌트는 필요한 상태와 액션만 구독
- 에러 처리 및 로딩 상태 필수

이 설계를 따르면 유지보수하기 쉽고, 확장 가능하며, 성능이 최적화된 대시보드 페이지를 구현할 수 있습니다.
