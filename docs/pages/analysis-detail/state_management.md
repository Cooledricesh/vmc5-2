# 분석 상세보기 페이지 상태 관리 설계 (Level 2)

## 개요

분석 상세보기 페이지는 단일 분석 결과를 표시하는 페이지로, **Level 2 (Context + useReducer)** 수준의 상태 관리가 적합합니다. 조회, 재분석, 삭제 등의 액션이 있지만, 복잡한 필터링이나 폴링 메커니즘이 없어 상대적으로 단순한 편입니다.

### 상태 관리 레벨 선택 근거
- **로컬 상태로 충분하지 않은 이유**:
  - 여러 섹션에서 동일한 분석 데이터 공유 (기본 정보, 천간지지, 오행, 해석)
  - 재분석, 삭제 등 복잡한 액션 처리
  - 로딩, 에러 상태를 전역적으로 관리해야 함

- **Level 3까지 필요하지 않은 이유**:
  - 단일 API 호출 (분석 조회)
  - 필터링이나 페이지네이션 없음
  - 실시간 폴링 불필요 (이미 완료된 분석)

---

## 1. 상태 정의

### 1.1 관리해야 할 상태 데이터

#### 1.1.1 분석 데이터 상태 (AnalysisState)
```typescript
type AnalysisState = {
  // 기본 정보
  id: string;
  subject_name: string;
  birth_date: string;
  birth_time: string | null;
  gender: 'male' | 'female';
  ai_model: 'gemini-2.0-flash' | 'gemini-2.0-pro';
  status: 'processing' | 'completed' | 'failed';
  view_count: number;
  created_at: string;
  last_viewed_at: string | null;

  // 분석 결과
  analysis_result: {
    heavenly_stems: {
      year: string;
      month: string;
      day: string;
      hour?: string;
    };
    five_elements: {
      wood: number;
      fire: number;
      earth: number;
      metal: number;
      water: number;
    };
    fortune_flow: {
      major_fortune: string;
      yearly_fortune: string;
    };
    interpretation: {
      personality: string;
      wealth: string;
      health: string;
      love: string;
    };
  } | null;

  // 로딩 및 에러
  isLoading: boolean;
  error: string | null;
};
```

**역할**: 분석 결과 전체 데이터 관리

#### 1.1.2 UI 상태 (UIState)
```typescript
type UIState = {
  // 종합 해석 탭
  activeTab: 'personality' | 'wealth' | 'health' | 'love';

  // 모달
  modals: {
    reanalyze: {
      isOpen: boolean;
      isProcessing: boolean;
    };
    delete: {
      isOpen: boolean;
      isProcessing: boolean;
    };
    share: {
      isOpen: boolean;
      shareUrl: string | null;
    };
  };

  // 차트 로딩
  chartLoading: {
    fiveElements: boolean;
    fortuneFlow: boolean;
  };
};
```

**역할**: UI 인터랙션 상태 관리

#### 1.1.3 사용자 정보 상태 (UserState)
```typescript
type UserState = {
  subscription_tier: 'free' | 'pro';
  remaining_count: number;
};
```

**역할**: 재분석 가능 여부 판단

### 1.2 상태가 아닌 화면 데이터

다음은 화면에 보이지만 별도 상태 관리가 필요하지 않은 데이터입니다:

1. **상대 시간 표시** ("3시간 전")
   - `created_at`으로부터 계산된 파생 데이터
   - `date-fns`의 `formatDistanceToNow` 사용

2. **AI 모델 뱃지 텍스트**
   - `ai_model` 값의 표시 형태
   - "gemini-2.0-flash" → "Flash", "gemini-2.0-pro" → "Pro"

3. **성별 아이콘**
   - `gender` 값에 따라 결정되는 UI 속성
   - "male" → 👨, "female" → 👩

4. **오행 색상**
   - 5가지 고정된 색상 매핑 (상수)
   - 목(木): #10B981, 화(火): #EF4444 등

5. **천간지지 한글 읽기**
   - 한자에 대응하는 한글 표기 (상수 매핑)
   - "庚午" → "(경오)"

6. **재분석 가능 여부**
   - `subscription_tier === 'pro' && remaining_count > 0`
   - 파생 데이터 (computed)

---

## 2. 상태 전환 테이블

### 2.1 AnalysisState 전환

| 현재 상태 | 이벤트 | 다음 상태 | 화면 변화 |
|----------|--------|----------|----------|
| `isLoading: true` | API 호출 성공 | `analysis_result 설정, isLoading: false` | 스켈레톤 → 분석 결과 표시 |
| `isLoading: true` | API 호출 실패 (404) | `error: 'NOT_FOUND', isLoading: false` | 스켈레톤 → 404 에러 메시지 |
| `isLoading: true` | API 호출 실패 (403) | `error: 'FORBIDDEN', isLoading: false` | 스켈레톤 → 권한 없음 메시지 |
| `status: 'completed'` | 재분석 완료 | 새 분석 ID로 리다이렉트 | 현재 페이지 → 새 분석 페이지 |
| `view_count: 5` | 페이지 재방문 | `view_count: 6` | 조회수 업데이트 |

### 2.2 UIState 전환

| 현재 상태 | 이벤트 | 다음 상태 | 화면 변화 |
|----------|--------|----------|----------|
| `activeTab: 'personality'` | "재운" 탭 클릭 | `activeTab: 'wealth'` | 성격 분석 → 재운 분석 |
| `modals.reanalyze.isOpen: false` | "재분석" 버튼 클릭 | `modals.reanalyze.isOpen: true` | 재분석 모달 오픈 |
| `modals.reanalyze.isProcessing: false` | "재분석 시작" 클릭 | `modals.reanalyze.isProcessing: true` | 버튼 비활성화, 로딩 표시 |
| `modals.delete.isOpen: false` | "삭제" 버튼 클릭 | `modals.delete.isOpen: true` | 삭제 확인 모달 오픈 |
| `modals.delete.isProcessing: false` | "삭제" 확인 클릭 | `modals.delete.isProcessing: true` | 버튼 비활성화, 로딩 표시 |
| `chartLoading.fiveElements: true` | 차트 렌더링 완료 | `chartLoading.fiveElements: false` | 스피너 → 차트 표시 |

---

## 3. Flux 패턴 설계

### 3.1 Action 정의

```typescript
type AnalysisDetailAction =
  // 분석 조회
  | { type: 'FETCH_ANALYSIS_START' }
  | { type: 'FETCH_ANALYSIS_SUCCESS'; payload: AnalysisData }
  | { type: 'FETCH_ANALYSIS_ERROR'; payload: { error: string } }

  // 조회수 증가
  | { type: 'INCREMENT_VIEW_COUNT'; payload: { new_count: number } }

  // 탭 전환
  | { type: 'SET_ACTIVE_TAB'; payload: { tab: 'personality' | 'wealth' | 'health' | 'love' } }

  // 재분석 모달
  | { type: 'OPEN_REANALYZE_MODAL' }
  | { type: 'CLOSE_REANALYZE_MODAL' }
  | { type: 'REANALYZE_START' }
  | { type: 'REANALYZE_SUCCESS'; payload: { new_analysis_id: string } }
  | { type: 'REANALYZE_ERROR'; payload: { error: string } }

  // 삭제 모달
  | { type: 'OPEN_DELETE_MODAL' }
  | { type: 'CLOSE_DELETE_MODAL' }
  | { type: 'DELETE_START' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR'; payload: { error: string } }

  // 공유 모달 (향후 구현)
  | { type: 'OPEN_SHARE_MODAL' }
  | { type: 'CLOSE_SHARE_MODAL' }
  | { type: 'GENERATE_SHARE_URL'; payload: { url: string } }

  // 차트 로딩
  | { type: 'SET_CHART_LOADING'; payload: { chart: 'fiveElements' | 'fortuneFlow'; loading: boolean } };
```

### 3.2 Reducer 설계

```typescript
type AnalysisDetailState = {
  analysis: AnalysisState;
  ui: UIState;
  user: UserState;
};

const initialState: AnalysisDetailState = {
  analysis: {
    id: '',
    subject_name: '',
    birth_date: '',
    birth_time: null,
    gender: 'male',
    ai_model: 'gemini-2.0-flash',
    status: 'processing',
    view_count: 0,
    created_at: '',
    last_viewed_at: null,
    analysis_result: null,
    isLoading: true,
    error: null,
  },
  ui: {
    activeTab: 'personality',
    modals: {
      reanalyze: { isOpen: false, isProcessing: false },
      delete: { isOpen: false, isProcessing: false },
      share: { isOpen: false, shareUrl: null },
    },
    chartLoading: {
      fiveElements: true,
      fortuneFlow: true,
    },
  },
  user: {
    subscription_tier: 'free',
    remaining_count: 0,
  },
};

function analysisDetailReducer(
  state: AnalysisDetailState,
  action: AnalysisDetailAction
): AnalysisDetailState {
  switch (action.type) {
    // 분석 조회
    case 'FETCH_ANALYSIS_START':
      return {
        ...state,
        analysis: {
          ...state.analysis,
          isLoading: true,
          error: null,
        },
      };

    case 'FETCH_ANALYSIS_SUCCESS':
      return {
        ...state,
        analysis: {
          ...action.payload,
          isLoading: false,
          error: null,
        },
      };

    case 'FETCH_ANALYSIS_ERROR':
      return {
        ...state,
        analysis: {
          ...state.analysis,
          isLoading: false,
          error: action.payload.error,
        },
      };

    // 조회수 증가
    case 'INCREMENT_VIEW_COUNT':
      return {
        ...state,
        analysis: {
          ...state.analysis,
          view_count: action.payload.new_count,
        },
      };

    // 탭 전환
    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        ui: {
          ...state.ui,
          activeTab: action.payload.tab,
        },
      };

    // 재분석 모달
    case 'OPEN_REANALYZE_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            reanalyze: { isOpen: true, isProcessing: false },
          },
        },
      };

    case 'CLOSE_REANALYZE_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            reanalyze: { isOpen: false, isProcessing: false },
          },
        },
      };

    case 'REANALYZE_START':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            reanalyze: { ...state.ui.modals.reanalyze, isProcessing: true },
          },
        },
      };

    case 'REANALYZE_SUCCESS':
      // 새 분석 페이지로 리다이렉트 (useEffect에서 처리)
      return state;

    case 'REANALYZE_ERROR':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            reanalyze: { isOpen: true, isProcessing: false },
          },
        },
      };

    // 삭제 모달
    case 'OPEN_DELETE_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            delete: { isOpen: true, isProcessing: false },
          },
        },
      };

    case 'CLOSE_DELETE_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            delete: { isOpen: false, isProcessing: false },
          },
        },
      };

    case 'DELETE_START':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            delete: { ...state.ui.modals.delete, isProcessing: true },
          },
        },
      };

    case 'DELETE_SUCCESS':
      // 대시보드로 리다이렉트 (useEffect에서 처리)
      return state;

    case 'DELETE_ERROR':
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            delete: { isOpen: true, isProcessing: false },
          },
        },
      };

    // 차트 로딩
    case 'SET_CHART_LOADING':
      return {
        ...state,
        ui: {
          ...state.ui,
          chartLoading: {
            ...state.ui.chartLoading,
            [action.payload.chart]: action.payload.loading,
          },
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
     dispatch({ type: 'FETCH_ANALYSIS_START' });
     fetchAnalysis(analysisId);
   }, [analysisId]);
   ```

2. **Store (Reducer)**: 로딩 상태로 변경
   - `analysis.isLoading = true`
   - `analysis.error = null`

3. **View**: 스켈레톤 UI 표시
   - 기본 정보 스켈레톤
   - 천간지지 스켈레톤
   - 오행 차트 스켈레톤
   - 해석 섹션 스켈레톤

4. **API 호출**: 분석 데이터 조회
   ```typescript
   const fetchAnalysis = async (id: string) => {
     try {
       const data = await apiClient.get(`/api/analyses/${id}`);
       dispatch({ type: 'FETCH_ANALYSIS_SUCCESS', payload: data });
     } catch (error) {
       dispatch({ type: 'FETCH_ANALYSIS_ERROR', payload: { error: error.message } });
     }
   };
   ```

5. **Action**: 성공 응답
   ```typescript
   dispatch({ type: 'FETCH_ANALYSIS_SUCCESS', payload: analysisData });
   ```

6. **Store**: 데이터 설정 및 로딩 완료
   - `analysis = data`
   - `analysis.isLoading = false`

7. **View**: 실제 데이터 렌더링
   - 기본 정보 표시
   - 천간지지 한자 표시
   - 오행 차트 렌더링 (차트 라이브러리 호출)
   - 해석 마크다운 렌더링

#### 시나리오 2: 탭 전환 (성격 → 재운)

1. **Action**: 사용자가 "재운" 탭 클릭
   ```typescript
   const handleTabChange = (tab: 'wealth') => {
     dispatch({ type: 'SET_ACTIVE_TAB', payload: { tab } });
   };
   ```

2. **Store**: 활성 탭 업데이트
   - `ui.activeTab = 'wealth'`

3. **View**: 재운 분석 내용 렌더링
   - 성격 분석 섹션 숨김
   - 재운 분석 섹션 표시
   - 마크다운 렌더링 (`analysis_result.interpretation.wealth`)

#### 시나리오 3: 재분석 요청 (Pro 회원)

1. **Action**: 사용자가 "재분석" 버튼 클릭
   ```typescript
   const handleReanalyzeClick = () => {
     if (user.subscription_tier !== 'pro') {
       toast.error('Pro 구독이 필요합니다');
       return;
     }
     dispatch({ type: 'OPEN_REANALYZE_MODAL' });
   };
   ```

2. **Store**: 재분석 모달 오픈
   - `ui.modals.reanalyze.isOpen = true`
   - `ui.modals.reanalyze.isProcessing = false`

3. **View**: 재분석 확인 모달 표시
   - 분석 대상 정보 표시
   - 남은 분석 횟수 표시
   - "취소" / "재분석 시작" 버튼

4. **Action**: 사용자가 "재분석 시작" 클릭
   ```typescript
   const handleReanalyzeConfirm = async () => {
     dispatch({ type: 'REANALYZE_START' });

     try {
       const result = await apiClient.post('/api/analyses/reanalyze', {
         original_analysis_id: analysis.id,
         subject_name: analysis.subject_name,
         birth_date: analysis.birth_date,
         birth_time: analysis.birth_time,
         gender: analysis.gender,
       });

       dispatch({
         type: 'REANALYZE_SUCCESS',
         payload: { new_analysis_id: result.data.new_analysis_id },
       });

       // 새 분석 페이지로 리다이렉트
       router.push(`/analysis/${result.data.new_analysis_id}`);
     } catch (error) {
       dispatch({
         type: 'REANALYZE_ERROR',
         payload: { error: error.message },
       });
       toast.error('재분석 중 오류가 발생했습니다');
     }
   };
   ```

5. **Store**: 재분석 처리 중
   - `ui.modals.reanalyze.isProcessing = true`

6. **View**: 로딩 상태 표시
   - "재분석 시작" 버튼 비활성화
   - 스피너 표시

7. **Store**: 재분석 성공
   - Action: `REANALYZE_SUCCESS`

8. **View**: 새 분석 페이지로 리다이렉트

#### 시나리오 4: 분석 삭제

1. **Action**: 사용자가 "삭제" 버튼 클릭
   ```typescript
   const handleDeleteClick = () => {
     dispatch({ type: 'OPEN_DELETE_MODAL' });
   };
   ```

2. **Store**: 삭제 모달 오픈
   - `ui.modals.delete.isOpen = true`

3. **View**: 삭제 확인 모달 표시

4. **Action**: 사용자가 "삭제" 확인 클릭
   ```typescript
   const handleDeleteConfirm = async () => {
     dispatch({ type: 'DELETE_START' });

     try {
       await apiClient.delete(`/api/analyses/${analysis.id}`);
       dispatch({ type: 'DELETE_SUCCESS' });
       router.push('/dashboard');
     } catch (error) {
       dispatch({
         type: 'DELETE_ERROR',
         payload: { error: error.message },
       });
       toast.error('삭제 중 오류가 발생했습니다');
     }
   };
   ```

5. **Store**: 삭제 처리 중
   - `ui.modals.delete.isProcessing = true`

6. **View**: 로딩 상태 표시

7. **Store**: 삭제 성공
   - Action: `DELETE_SUCCESS`

8. **View**: 대시보드로 리다이렉트

---

## 4. Context + useReducer 설계

### 4.1 Context 아키텍처

```
┌───────────────────────────────────────────┐
│      AnalysisDetailProvider               │
│  ┌─────────────────────────────────────┐  │
│  │  useReducer(analysisDetailReducer)  │  │
│  │  - state: AnalysisDetailState       │  │
│  │  - dispatch: Dispatch<Action>       │  │
│  └─────────────────────────────────────┘  │
│  ┌─────────────────────────────────────┐  │
│  │     API 호출 로직                    │  │
│  │  - fetchAnalysis()                  │  │
│  │  - reanalyzeAnalysis()              │  │
│  │  - deleteAnalysis()                 │  │
│  └─────────────────────────────────────┘  │
│  ┌─────────────────────────────────────┐  │
│  │     액션 헬퍼 함수                   │  │
│  │  - setActiveTab()                   │  │
│  │  - openReanalyzeModal()             │  │
│  │  - openDeleteModal()                │  │
│  └─────────────────────────────────────┘  │
└───────────────────────────────────────────┘
                  │
      ┌───────────┴───────────┐
      ↓                       ↓
┌─────────────┐       ┌─────────────┐
│ BasicInfo   │       │ Heavenly    │
│ Section     │       │ Stems       │
└─────────────┘       └─────────────┘
      ↓                       ↓
┌─────────────┐       ┌─────────────┐
│ FiveElements│       │ Fortune     │
│ Section     │       │ Flow        │
└─────────────┘       └─────────────┘
      ↓
┌─────────────┐
│Interpretation│
│ Tabs        │
└─────────────┘
```

### 4.2 Context 인터페이스

```typescript
type AnalysisDetailContextValue = {
  // 상태
  state: AnalysisDetailState;

  // 액션 헬퍼
  actions: {
    // 데이터 조회
    fetchAnalysis: (id: string) => Promise<void>;

    // 탭 전환
    setActiveTab: (tab: 'personality' | 'wealth' | 'health' | 'love') => void;

    // 재분석
    openReanalyzeModal: () => void;
    closeReanalyzeModal: () => void;
    reanalyzeAnalysis: () => Promise<void>;

    // 삭제
    openDeleteModal: () => void;
    closeDeleteModal: () => void;
    deleteAnalysis: () => Promise<void>;

    // 차트 로딩
    setChartLoading: (chart: 'fiveElements' | 'fortuneFlow', loading: boolean) => void;
  };

  // 파생 데이터 (computed)
  computed: {
    canReanalyze: boolean;  // Pro 회원 && 분석 횟수 있음
    relativeTime: string;   // "3시간 전"
    aiModelBadge: string;   // "Flash" | "Pro"
    genderIcon: string;     // 👨 | 👩
  };
};
```

### 4.3 Provider 구현

```typescript
export const AnalysisDetailProvider: React.FC<{
  children: React.ReactNode;
  analysisId: string;
}> = ({ children, analysisId }) => {
  const [state, dispatch] = useReducer(analysisDetailReducer, initialState);
  const router = useRouter();

  // API 호출 함수
  const fetchAnalysis = useCallback(async (id: string) => {
    dispatch({ type: 'FETCH_ANALYSIS_START' });
    try {
      const data = await apiClient.get(`/api/analyses/${id}`);
      dispatch({ type: 'FETCH_ANALYSIS_SUCCESS', payload: data });
    } catch (error: any) {
      dispatch({ type: 'FETCH_ANALYSIS_ERROR', payload: { error: error.message } });
    }
  }, []);

  const reanalyzeAnalysis = useCallback(async () => {
    dispatch({ type: 'REANALYZE_START' });
    try {
      const result = await apiClient.post('/api/analyses/reanalyze', {
        original_analysis_id: state.analysis.id,
        subject_name: state.analysis.subject_name,
        birth_date: state.analysis.birth_date,
        birth_time: state.analysis.birth_time,
        gender: state.analysis.gender,
      });
      dispatch({
        type: 'REANALYZE_SUCCESS',
        payload: { new_analysis_id: result.data.new_analysis_id },
      });
      router.push(`/analysis/${result.data.new_analysis_id}`);
    } catch (error: any) {
      dispatch({ type: 'REANALYZE_ERROR', payload: { error: error.message } });
      toast.error('재분석 중 오류가 발생했습니다');
    }
  }, [state.analysis, router]);

  const deleteAnalysis = useCallback(async () => {
    dispatch({ type: 'DELETE_START' });
    try {
      await apiClient.delete(`/api/analyses/${state.analysis.id}`);
      dispatch({ type: 'DELETE_SUCCESS' });
      router.push('/dashboard');
    } catch (error: any) {
      dispatch({ type: 'DELETE_ERROR', payload: { error: error.message } });
      toast.error('삭제 중 오류가 발생했습니다');
    }
  }, [state.analysis.id, router]);

  // 액션 헬퍼
  const setActiveTab = useCallback((tab: UIState['activeTab']) => {
    dispatch({ type: 'SET_ACTIVE_TAB', payload: { tab } });
  }, []);

  const openReanalyzeModal = useCallback(() => {
    if (state.user.subscription_tier !== 'pro') {
      toast.error('Pro 구독이 필요합니다');
      return;
    }
    dispatch({ type: 'OPEN_REANALYZE_MODAL' });
  }, [state.user.subscription_tier]);

  const closeReanalyzeModal = useCallback(() => {
    dispatch({ type: 'CLOSE_REANALYZE_MODAL' });
  }, []);

  const openDeleteModal = useCallback(() => {
    dispatch({ type: 'OPEN_DELETE_MODAL' });
  }, []);

  const closeDeleteModal = useCallback(() => {
    dispatch({ type: 'CLOSE_DELETE_MODAL' });
  }, []);

  const setChartLoading = useCallback((chart: 'fiveElements' | 'fortuneFlow', loading: boolean) => {
    dispatch({ type: 'SET_CHART_LOADING', payload: { chart, loading } });
  }, []);

  // 파생 데이터 (computed)
  const computed = useMemo(() => ({
    canReanalyze: state.user.subscription_tier === 'pro' && state.user.remaining_count > 0,
    relativeTime: state.analysis.created_at
      ? formatDistanceToNow(new Date(state.analysis.created_at), { addSuffix: true, locale: ko })
      : '',
    aiModelBadge: state.analysis.ai_model === 'gemini-2.0-flash' ? 'Flash' : 'Pro',
    genderIcon: state.analysis.gender === 'male' ? '👨' : '👩',
  }), [state]);

  // 초기 데이터 로드
  useEffect(() => {
    fetchAnalysis(analysisId);
  }, [analysisId, fetchAnalysis]);

  const value: AnalysisDetailContextValue = {
    state,
    actions: {
      fetchAnalysis,
      setActiveTab,
      openReanalyzeModal,
      closeReanalyzeModal,
      reanalyzeAnalysis,
      openDeleteModal,
      closeDeleteModal,
      deleteAnalysis,
      setChartLoading,
    },
    computed,
  };

  return (
    <AnalysisDetailContext.Provider value={value}>
      {children}
    </AnalysisDetailContext.Provider>
  );
};
```

### 4.4 하위 컴포넌트에 노출할 변수 및 함수

#### 4.4.1 BasicInfoSection 컴포넌트

**필요한 상태**:
```typescript
const { state, computed } = useAnalysisDetailContext();
const { analysis } = state;

// 사용:
- analysis.subject_name
- analysis.birth_date
- analysis.birth_time
- analysis.gender
- analysis.view_count
- computed.relativeTime
- computed.aiModelBadge
- computed.genderIcon
```

**필요한 액션**:
```typescript
const { actions } = useAnalysisDetailContext();

// 사용:
- actions.openReanalyzeModal() // 재분석 버튼
- actions.openDeleteModal() // 삭제 버튼
```

#### 4.4.2 HeavenlyStemsSection 컴포넌트

**필요한 상태**:
```typescript
const { state } = useAnalysisDetailContext();
const { analysis } = state;

// 사용:
- analysis.analysis_result?.heavenly_stems.year
- analysis.analysis_result?.heavenly_stems.month
- analysis.analysis_result?.heavenly_stems.day
- analysis.analysis_result?.heavenly_stems.hour
```

#### 4.4.3 FiveElementsSection 컴포넌트

**필요한 상태**:
```typescript
const { state } = useAnalysisDetailContext();
const { analysis, ui } = state;

// 사용:
- analysis.analysis_result?.five_elements
- ui.chartLoading.fiveElements
```

**필요한 액션**:
```typescript
const { actions } = useAnalysisDetailContext();

// 사용:
- actions.setChartLoading('fiveElements', false) // 차트 렌더링 완료 시
```

#### 4.4.4 InterpretationTabs 컴포넌트

**필요한 상태**:
```typescript
const { state } = useAnalysisDetailContext();
const { analysis, ui } = state;

// 사용:
- ui.activeTab
- analysis.analysis_result?.interpretation[ui.activeTab]
```

**필요한 액션**:
```typescript
const { actions } = useAnalysisDetailContext();

// 사용:
- actions.setActiveTab('wealth') // 탭 클릭 시
```

---

## 5. 최적화 전략

### 5.1 불필요한 리렌더링 방지

```typescript
// Context를 2개로 분리하여 불필요한 리렌더링 방지
const AnalysisDetailStateContext = createContext<AnalysisDetailState | null>(null);
const AnalysisDetailActionsContext = createContext<AnalysisDetailActions | null>(null);

// 컴포넌트에서 필요한 것만 구독
const BasicInfo = () => {
  const state = useContext(AnalysisDetailStateContext);
  return <div>{state.analysis.subject_name}</div>;
  // ui.activeTab 변경 시 리렌더링 안 됨
};
```

### 5.2 Memoization

```typescript
// 파생 데이터 계산 최적화
const computed = useMemo(() => ({
  canReanalyze: state.user.subscription_tier === 'pro' && state.user.remaining_count > 0,
  relativeTime: formatDistanceToNow(new Date(state.analysis.created_at), { addSuffix: true }),
  aiModelBadge: state.analysis.ai_model === 'gemini-2.0-flash' ? 'Flash' : 'Pro',
}), [state]);

// 마크다운 렌더링 결과 캐싱
const renderedMarkdown = useMemo(
  () => <ReactMarkdown>{state.analysis.analysis_result?.interpretation.personality}</ReactMarkdown>,
  [state.analysis.analysis_result?.interpretation.personality]
);
```

### 5.3 차트 렌더링 최적화

```typescript
// 차트 데이터 메모이제이션
const chartData = useMemo(() => {
  if (!state.analysis.analysis_result) return [];
  const { five_elements } = state.analysis.analysis_result;
  return [
    { element: '목', count: five_elements.wood, color: '#10B981' },
    { element: '화', count: five_elements.fire, color: '#EF4444' },
    { element: '토', count: five_elements.earth, color: '#D97706' },
    { element: '금', count: five_elements.metal, color: '#6B7280' },
    { element: '수', count: five_elements.water, color: '#3B82F6' },
  ];
}, [state.analysis.analysis_result]);

// 차트 로딩 완료 시 상태 업데이트
useEffect(() => {
  if (chartData.length > 0) {
    actions.setChartLoading('fiveElements', false);
  }
}, [chartData, actions]);
```

---

## 6. 에러 처리

### 6.1 에러 상태 표시

```typescript
// 404 에러
if (state.analysis.error === 'NOT_FOUND') {
  return (
    <ErrorMessage
      title="분석 결과를 찾을 수 없습니다"
      message="삭제되었거나 존재하지 않는 분석입니다."
      action={<Button onClick={() => router.push('/dashboard')}>대시보드로 가기</Button>}
    />
  );
}

// 403 에러
if (state.analysis.error === 'FORBIDDEN') {
  return (
    <ErrorMessage
      title="접근 권한이 없습니다"
      message="이 분석 결과를 조회할 권한이 없습니다."
      action={<Button onClick={() => router.push('/dashboard')}>대시보드로 가기</Button>}
    />
  );
}

// 일반 에러
if (state.analysis.error) {
  return (
    <ErrorMessage
      title="오류가 발생했습니다"
      message={state.analysis.error}
      action={<Button onClick={() => actions.fetchAnalysis(analysisId)}>재시도</Button>}
    />
  );
}
```

### 6.2 에러 경계 (Error Boundary)

```typescript
<ErrorBoundary
  fallback={<AnalysisDetailErrorFallback />}
  onError={(error) => console.error('AnalysisDetail Error:', error)}
>
  <AnalysisDetailProvider analysisId={analysisId}>
    <AnalysisDetailPage />
  </AnalysisDetailProvider>
</ErrorBoundary>
```

---

## 7. 테스트 전략

### 7.1 Reducer 테스트

```typescript
describe('analysisDetailReducer', () => {
  it('should handle FETCH_ANALYSIS_SUCCESS', () => {
    const action = {
      type: 'FETCH_ANALYSIS_SUCCESS',
      payload: mockAnalysisData,
    };
    const newState = analysisDetailReducer(initialState, action);

    expect(newState.analysis.subject_name).toBe('홍길동');
    expect(newState.analysis.isLoading).toBe(false);
  });

  it('should handle SET_ACTIVE_TAB', () => {
    const action = { type: 'SET_ACTIVE_TAB', payload: { tab: 'wealth' } };
    const newState = analysisDetailReducer(initialState, action);

    expect(newState.ui.activeTab).toBe('wealth');
  });

  it('should handle OPEN_REANALYZE_MODAL', () => {
    const action = { type: 'OPEN_REANALYZE_MODAL' };
    const newState = analysisDetailReducer(initialState, action);

    expect(newState.ui.modals.reanalyze.isOpen).toBe(true);
  });
});
```

### 7.2 Context 통합 테스트

```typescript
const wrapper = ({ children }) => (
  <AnalysisDetailProvider analysisId="test-id">{children}</AnalysisDetailProvider>
);

it('should fetch analysis on mount', async () => {
  const { result } = renderHook(() => useAnalysisDetailContext(), { wrapper });

  await waitFor(() => {
    expect(result.current.state.analysis.isLoading).toBe(false);
  });

  expect(result.current.state.analysis.subject_name).toBe('홍길동');
});
```

---

## 8. 성능 모니터링

### 8.1 렌더링 추적

```typescript
useEffect(() => {
  console.log('AnalysisDetailProvider re-rendered', state);
}, [state]);
```

### 8.2 API 호출 추적

```typescript
const fetchAnalysis = useCallback(async (id: string) => {
  const startTime = performance.now();
  dispatch({ type: 'FETCH_ANALYSIS_START' });

  try {
    const data = await apiClient.get(`/api/analyses/${id}`);
    const endTime = performance.now();
    console.log(`Analysis fetch took ${endTime - startTime}ms`);
    dispatch({ type: 'FETCH_ANALYSIS_SUCCESS', payload: data });
  } catch (error: any) {
    dispatch({ type: 'FETCH_ANALYSIS_ERROR', payload: { error: error.message } });
  }
}, []);
```

---

## 9. 결론

이 문서는 분석 상세보기 페이지의 **Level 2 (Context + useReducer)** 상태 관리 설계서입니다.

**핵심 설계 원칙**:
1. **단방향 데이터 흐름** (Flux 패턴)
2. **중앙 집중식 상태 관리** (Context + useReducer)
3. **명확한 책임 분리** (UI 상태 vs 데이터 상태)
4. **최적화된 리렌더링** (Memoization, Context 분리)
5. **확장 가능한 구조** (모달, 공유 기능 추가 용이)

**구현 시 주의사항**:
- 모든 액션은 Reducer를 통해서만 상태 변경
- 직접적인 상태 변경 금지 (불변성 유지)
- API 호출은 Provider에서 관리
- 하위 컴포넌트는 필요한 상태와 액션만 구독
- 에러 처리 및 로딩 상태 필수
- 마크다운 렌더링 시 XSS 방지 (sanitization)

이 설계를 따르면 유지보수하기 쉽고, 확장 가능하며, 성능이 최적화된 분석 상세보기 페이지를 구현할 수 있습니다.
