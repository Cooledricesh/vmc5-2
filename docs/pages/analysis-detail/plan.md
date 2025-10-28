# 분석 상세보기 페이지 (Analysis Detail) 구현 계획

## 개요

분석 상세보기 페이지(`/analysis/[id]`)는 사용자가 생성한 사주 분석 결과를 상세하게 조회하고, 재분석, 삭제 등의 액션을 수행할 수 있는 페이지입니다. 복잡한 데이터 시각화(오행 차트, 운세 타임라인)와 마크다운 렌더링을 포함합니다.

### 주요 기능
- 분석 결과 상세 표시 (기본 정보, 천간지지, 오행, 운세, 해석)
- 오행 분포 차트 시각화 (레이더 차트 또는 바 차트)
- 마크다운 형식의 AI 해석 렌더링
- Pro 회원 전용 재분석 기능
- 분석 삭제 기능
- 조회수 자동 증가
- 향후 확장: 공유, PDF 다운로드

### 관련 Use Cases
- [UC-004] 분석 결과 조회 (`/docs/usecases/004/spec.md`)

### 외부 서비스 연동
- **Clerk SDK** (`@clerk/nextjs`): 사용자 인증 및 세션 관리
  - Frontend: `useAuth()` 훅 사용
  - Backend: JWT 토큰 검증 (미들웨어)

---

## 모듈 구조

### Frontend 모듈

#### 1. Context & State Management
- **위치**: `src/features/analysis-detail/context/AnalysisDetailContext.tsx`
- **설명**: Context + useReducer를 사용한 상태 관리 (Level 2)
- **상태**:
  - `analysis`: 분석 데이터 (기본 정보, 분석 결과, 로딩, 에러)
  - `ui`: UI 상태 (활성 탭, 모달, 차트 로딩)
  - `user`: 사용자 정보 (구독 등급, 남은 분석 횟수)
- **참고**: `/docs/pages/analysis-detail/state_management.md`

#### 2. Hooks
- **위치**: `src/features/analysis-detail/hooks/`
- **파일**:
  - `useAnalysisDetailContext.ts`: Context 접근 hook
  - `useAnalysisData.ts`: 분석 데이터만 구독
  - `useActiveTab.ts`: 활성 탭 상태만 구독
  - `useCanReanalyze.ts`: 재분석 가능 여부 (Derived State)

#### 3. Components
- **위치**: `src/features/analysis-detail/components/`
- **파일**:
  - `AnalysisDetailHeader.tsx`: 헤더 (뒤로가기, 더보기 메뉴)
  - `BasicInfoSection.tsx`: 기본 정보 섹션
  - `HeavenlyStemsSection.tsx`: 천간지지 섹션
  - `FiveElementsSection.tsx`: 오행 분석 섹션 (차트 포함)
  - `FortuneFlowSection.tsx`: 운세 흐름 섹션
  - `InterpretationTabs.tsx`: 종합 해석 탭 컨테이너
  - `InterpretationContent.tsx`: 마크다운 렌더링 컴포넌트
  - `ReanalyzeModal.tsx`: 재분석 확인 모달
  - `DeleteModal.tsx`: 삭제 확인 모달
  - `ShareModal.tsx`: 공유 모달 (향후 구현, UI만 준비)
  - `AnalysisDetailSkeleton.tsx`: 로딩 스켈레톤 UI
  - `AnalysisErrorState.tsx`: 에러 상태 UI (404, 403 등)

#### 4. Actions
- **위치**: `src/features/analysis-detail/actions/`
- **파일**:
  - `analysisDetailActions.ts`: 비동기 액션 함수들
    - `fetchAnalysis()`: 분석 조회
    - `reanalyzeAnalysis()`: 재분석 요청
    - `deleteAnalysis()`: 분석 삭제

#### 5. Types & Constants
- **위치**: `src/features/analysis-detail/lib/`
- **파일**:
  - `dto.ts`: Backend schema 재노출
  - `types.ts`: Frontend 전용 타입
  - `constants.ts`: 상수 (오행 색상, 천간지지 한글 매핑 등)
  - `utils.ts`: 유틸 함수 (천간지지 한글 변환, 오행 색상 반환 등)

### Backend 모듈

#### 6. Hono Routes
- **위치**: `src/features/analysis-detail/backend/route.ts`
- **엔드포인트**:
  - `GET /api/analyses/:id`: 분석 결과 조회 (조회수 증가 포함)
  - `DELETE /api/analyses/:id`: 분석 삭제
  - `POST /api/analyses/reanalyze`: 재분석 요청 (Pro 전용)

#### 7. Service Layer
- **위치**: `src/features/analysis-detail/backend/service.ts`
- **함수**:
  - `getAnalysisById()`: 분석 조회 및 조회수 증가
  - `deleteAnalysis()`: 분석 삭제
  - `createReanalysis()`: 재분석 생성 (new-analysis 서비스 재사용)

#### 8. Schemas (Zod)
- **위치**: `src/features/analysis-detail/backend/schema.ts`
- **스키마**:
  - `AnalysisDetailResponseSchema`: 분석 상세 응답
  - `ReanalyzeRequestSchema`: 재분석 요청
  - `ReanalyzeResponseSchema`: 재분석 응답

#### 9. Error Codes
- **위치**: `src/features/analysis-detail/backend/error.ts`
- **에러 코드**:
  - `ANALYSIS_NOT_FOUND`: 분석 없음
  - `FORBIDDEN`: 권한 없음
  - `UNAUTHORIZED`: 인증 실패
  - `REANALYSIS_FORBIDDEN`: 재분석 권한 없음 (Free 회원)
  - `INSUFFICIENT_COUNT`: 분석 횟수 부족
  - `DATABASE_ERROR`: 데이터베이스 오류

### 공통 모듈

#### 10. 마크다운 렌더링 유틸
- **위치**: `src/lib/utils/markdown.tsx`
- **함수**: `renderMarkdown(content: string): JSX.Element`
- **라이브러리**: `react-markdown` + `rehype-sanitize` (XSS 방지)

#### 11. 차트 컴포넌트
- **위치**: `src/components/charts/`
- **파일**:
  - `RadarChart.tsx`: 레이더 차트 (오행 분포용)
  - `BarChart.tsx`: 바 차트 (대안)
- **라이브러리**: `recharts`

#### 12. 상대 시간 표시 유틸
- **위치**: `src/lib/utils/date.ts` (이미 존재, 재사용)
- **함수**: `formatRelativeTime(date: string): string`

### Pages

#### 13. 분석 상세보기 메인 페이지
- **위치**: `src/app/analysis/[id]/page.tsx`
- **설명**: AnalysisDetailProvider로 감싸진 메인 페이지, Clerk 인증 확인

---

## 모듈 관계도 (Mermaid Diagram)

```mermaid
graph TD
    subgraph "Frontend Layer"
        A[analysis/[id]/page.tsx] --> B[AnalysisDetailProvider]
        B --> C[AnalysisDetailHeader]
        B --> D[BasicInfoSection]
        B --> E[HeavenlyStemsSection]
        B --> F[FiveElementsSection]
        B --> G[FortuneFlowSection]
        B --> H[InterpretationTabs]

        C --> I[ReanalyzeModal]
        C --> J[DeleteModal]

        F --> K[RadarChart]
        H --> L[InterpretationContent]
        L --> M[Markdown Renderer]

        D --> N[useAnalysisDetailContext]
        E --> N
        F --> N
        G --> N
        H --> N

        N --> O[analysisDetailActions]
        O --> P[API Client]
    end

    subgraph "Backend Layer"
        P --> Q[Hono Router<br/>analysis-detail/backend/route.ts]
        Q --> R[Service Layer<br/>analysis-detail/backend/service.ts]

        R --> S[Supabase Client]
    end

    subgraph "Database"
        S --> T[(analyses)]
        S --> U[(users)]
    end

    subgraph "External Services"
        A -.Clerk 인증 확인.-> V[Clerk SDK]
        V -.userId, session.-> A
    end

    classDef frontend fill:#e1f5ff,stroke:#0288d1
    classDef backend fill:#fff3e0,stroke:#f57c00
    classDef external fill:#f3e5f5,stroke:#7b1fa2
    classDef db fill:#e8f5e9,stroke:#388e3c

    class A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P frontend
    class Q,R,S backend
    class V external
    class T,U db
```

---

## 구현 계획

### Phase 1: 기본 인프라 구축

#### Task 1.1: 마크다운 렌더링 유틸 생성
- **파일**: `src/lib/utils/markdown.tsx`
- **구현 내용**:

```typescript
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

/**
 * 마크다운 문자열을 안전하게 렌더링
 * XSS 공격 방지를 위해 sanitization 적용
 */
export function renderMarkdown(content: string): JSX.Element {
  return (
    <ReactMarkdown
      rehypePlugins={[rehypeSanitize]}
      components={{
        // 커스텀 스타일
        h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4" {...props} />,
        h2: ({ node, ...props }) => <h2 className="text-xl font-bold mb-3" {...props} />,
        p: ({ node, ...props }) => <p className="mb-2 leading-relaxed" {...props} />,
        ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2" {...props} />,
        strong: ({ node, ...props }) => <strong className="font-bold text-primary" {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

**Unit Test**:
```typescript
describe('renderMarkdown', () => {
  it('should render markdown content', () => {
    const markdown = '# 제목\n\n본문 **강조**';
    const result = render(renderMarkdown(markdown));
    expect(result.container.querySelector('h1')).toHaveTextContent('제목');
    expect(result.container.querySelector('strong')).toHaveTextContent('강조');
  });

  it('should sanitize dangerous HTML', () => {
    const markdown = '<script>alert("XSS")</script>';
    const result = render(renderMarkdown(markdown));
    expect(result.container.querySelector('script')).toBeNull();
  });
});
```

#### Task 1.2: 천간지지 및 오행 상수 정의
- **파일**: `src/features/analysis-detail/lib/constants.ts`

```typescript
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

// 천간지지 한글 읽기 매핑 (예시 일부)
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

// 천간지지 한글 변환 헬퍼
export function convertToKorean(stem: string): string {
  const chars = stem.split('');
  return chars.map(char => {
    return HEAVENLY_STEMS_KOREAN[char] || EARTHLY_BRANCHES_KOREAN[char] || char;
  }).join('');
}
```

#### Task 1.3: 차트 컴포넌트 생성
- **파일**: `src/components/charts/RadarChart.tsx`
- **구현 내용**:

```typescript
'use client';

import { Radar, RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

type RadarChartProps = {
  data: Array<{
    element: string;
    count: number;
    fullMark: number;
  }>;
  onLoadComplete?: () => void;
};

export function RadarChart({ data, onLoadComplete }: RadarChartProps) {
  useEffect(() => {
    // 차트 렌더링 완료 시 콜백 호출
    if (data.length > 0 && onLoadComplete) {
      setTimeout(onLoadComplete, 100);
    }
  }, [data, onLoadComplete]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsRadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="element" />
        <PolarRadiusAxis angle={90} domain={[0, 5]} />
        <Radar
          name="오행"
          dataKey="count"
          stroke="#3B82F6"
          fill="#3B82F6"
          fillOpacity={0.6}
        />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}
```

---

### Phase 2: Backend API 구현

#### Task 2.1: Zod Schema 정의
- **파일**: `src/features/analysis-detail/backend/schema.ts`

```typescript
import { z } from 'zod';

// 분석 결과 응답 스키마
export const HeavenlyStemsSchema = z.object({
  year: z.string(),
  month: z.string(),
  day: z.string(),
  hour: z.string().optional(),
});

export const FiveElementsSchema = z.object({
  wood: z.number(),
  fire: z.number(),
  earth: z.number(),
  metal: z.number(),
  water: z.number(),
});

export const FortuneFlowSchema = z.object({
  major_fortune: z.string(),
  yearly_fortune: z.string(),
});

export const InterpretationSchema = z.object({
  personality: z.string(),
  wealth: z.string(),
  health: z.string(),
  love: z.string(),
});

export const AnalysisResultSchema = z.object({
  heavenly_stems: HeavenlyStemsSchema,
  five_elements: FiveElementsSchema,
  fortune_flow: FortuneFlowSchema,
  interpretation: InterpretationSchema,
});

export const AnalysisDetailResponseSchema = z.object({
  id: z.string().uuid(),
  subject_name: z.string(),
  birth_date: z.string(),
  birth_time: z.string().nullable(),
  gender: z.enum(['male', 'female']),
  ai_model: z.string(),
  analysis_result: AnalysisResultSchema.nullable(),
  status: z.enum(['processing', 'completed', 'failed']),
  view_count: z.number(),
  created_at: z.string(),
  last_viewed_at: z.string().nullable(),
});

// 재분석 요청 스키마
export const ReanalyzeRequestSchema = z.object({
  original_analysis_id: z.string().uuid(),
  subject_name: z.string(),
  birth_date: z.string(),
  birth_time: z.string().nullable(),
  gender: z.enum(['male', 'female']),
});

export const ReanalyzeResponseSchema = z.object({
  new_analysis_id: z.string().uuid(),
  status: z.enum(['processing', 'completed']),
  remaining_count: z.number(),
});

export type AnalysisDetailResponse = z.infer<typeof AnalysisDetailResponseSchema>;
export type ReanalyzeRequest = z.infer<typeof ReanalyzeRequestSchema>;
export type ReanalyzeResponse = z.infer<typeof ReanalyzeResponseSchema>;
```

#### Task 2.2: Error Codes 정의
- **파일**: `src/features/analysis-detail/backend/error.ts`

```typescript
export const analysisDetailErrorCodes = {
  analysisNotFound: 'ANALYSIS_NOT_FOUND',
  forbidden: 'FORBIDDEN',
  unauthorized: 'UNAUTHORIZED',
  reanalysisForbidden: 'REANALYSIS_FORBIDDEN',
  insufficientCount: 'INSUFFICIENT_COUNT',
  databaseError: 'DATABASE_ERROR',
} as const;

export type AnalysisDetailServiceError = typeof analysisDetailErrorCodes[keyof typeof analysisDetailErrorCodes];
```

#### Task 2.3: Service Layer 구현
- **파일**: `src/features/analysis-detail/backend/service.ts`

**주요 함수 구현**:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import { success, failure, type HandlerResult } from '@/backend/http/response';
import type {
  AnalysisDetailResponse,
  ReanalyzeRequest,
  ReanalyzeResponse,
} from './schema';
import { analysisDetailErrorCodes, type AnalysisDetailServiceError } from './error';

// 1. 분석 조회 및 조회수 증가
export async function getAnalysisById(
  client: SupabaseClient,
  analysisId: string,
  userId: string,
): Promise<HandlerResult<AnalysisDetailResponse, AnalysisDetailServiceError, unknown>> {
  // 권한 확인 및 조회
  const { data, error } = await client
    .from('analyses')
    .select('*')
    .eq('id', analysisId)
    .maybeSingle();

  if (error) {
    return failure(500, analysisDetailErrorCodes.databaseError, error.message);
  }

  if (!data) {
    return failure(404, analysisDetailErrorCodes.analysisNotFound, '분석 결과를 찾을 수 없습니다');
  }

  if (data.user_id !== userId) {
    return failure(403, analysisDetailErrorCodes.forbidden, '이 분석 결과에 접근할 권한이 없습니다');
  }

  // 조회수 증가
  const { error: updateError } = await client
    .from('analyses')
    .update({
      view_count: data.view_count + 1,
      last_viewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', analysisId);

  if (updateError) {
    console.error('Failed to increment view count:', updateError);
    // 조회수 업데이트 실패는 에러로 처리하지 않음
  }

  return success({
    ...data,
    view_count: data.view_count + 1,
  });
}

// 2. 분석 삭제
export async function deleteAnalysis(
  client: SupabaseClient,
  analysisId: string,
  userId: string,
): Promise<HandlerResult<void, AnalysisDetailServiceError, unknown>> {
  // 권한 확인
  const { data } = await client
    .from('analyses')
    .select('user_id')
    .eq('id', analysisId)
    .maybeSingle();

  if (!data) {
    return failure(404, analysisDetailErrorCodes.analysisNotFound, '분석 결과를 찾을 수 없습니다');
  }

  if (data.user_id !== userId) {
    return failure(403, analysisDetailErrorCodes.forbidden, '이 분석을 삭제할 권한이 없습니다');
  }

  // 삭제
  const { error } = await client
    .from('analyses')
    .delete()
    .eq('id', analysisId);

  if (error) {
    return failure(500, analysisDetailErrorCodes.databaseError, error.message);
  }

  return success(undefined);
}

// 3. 재분석 생성 (new-analysis 서비스 재사용)
// 이 함수는 new-analysis의 createNewAnalysis를 호출하여 재사용
```

**Unit Test (Service Layer)**:
```typescript
describe('getAnalysisById', () => {
  it('should return analysis and increment view count', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: 'analysis_123',
          user_id: 'user_123',
          subject_name: '홍길동',
          view_count: 5,
          analysis_result: { /* ... */ },
        },
        error: null,
      }),
      update: jest.fn().mockReturnThis(),
    };

    mockSupabase.update.mockResolvedValue({ error: null });

    const result = await getAnalysisById(mockSupabase as any, 'analysis_123', 'user_123');

    expect(result.ok).toBe(true);
    expect(result.data.view_count).toBe(6);
    expect(mockSupabase.update).toHaveBeenCalled();
  });

  it('should return FORBIDDEN if user does not own analysis', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: 'analysis_123',
          user_id: 'other_user',
        },
        error: null,
      }),
    };

    const result = await getAnalysisById(mockSupabase as any, 'analysis_123', 'user_123');

    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('FORBIDDEN');
  });
});
```

#### Task 2.4: Hono Routes 구현
- **파일**: `src/features/analysis-detail/backend/route.ts`

```typescript
import type { Hono } from 'hono';
import { respond, failure } from '@/backend/http/response';
import { getSupabase, getLogger, type AppEnv } from '@/backend/hono/context';
import { ReanalyzeRequestSchema } from './schema';
import { getAnalysisById, deleteAnalysis } from './service';
import { createNewAnalysis } from '@/features/new-analysis/backend/service';
import { analysisDetailErrorCodes } from './error';

export const registerAnalysisDetailRoutes = (app: Hono<AppEnv>) => {
  // GET /api/analyses/:id - 분석 조회
  app.get('/analyses/:id', async (c) => {
    const analysisId = c.req.param('id');
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    // ✅ Clerk v6: auth()는 비동기 함수이므로 await 필수
    // Clerk JWT 미들웨어에서 이미 추출된 userId 사용
    // 미들웨어 구현 예시:
    // import { auth } from '@clerk/nextjs/server';
    // const { userId } = await auth();
    // c.set('userId', userId);
    const userId = c.get('userId');

    const result = await getAnalysisById(supabase, analysisId, userId);

    if (!result.ok) {
      logger.error('Failed to fetch analysis', result.error);
    }

    return respond(c, result);
  });

  // DELETE /api/analyses/:id - 분석 삭제
  app.delete('/analyses/:id', async (c) => {
    const analysisId = c.req.param('id');
    const supabase = getSupabase(c);
    const logger = getLogger(c);
    const userId = c.get('userId');

    const result = await deleteAnalysis(supabase, analysisId, userId);

    if (!result.ok) {
      logger.error('Failed to delete analysis', result.error);
    }

    return respond(c, result);
  });

  // POST /api/analyses/reanalyze - 재분석 요청
  app.post('/analyses/reanalyze', async (c) => {
    const body = await c.req.json();
    const parsedBody = ReanalyzeRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return respond(
        c,
        failure(
          400,
          analysisDetailErrorCodes.validationError,
          '잘못된 요청 파라미터입니다',
          parsedBody.error.format(),
        ),
      );
    }

    const supabase = getSupabase(c);
    const logger = getLogger(c);
    const config = c.get('config');

    const userId = c.get('userId');
    const subscriptionTier = c.get('subscriptionTier'); // 'free' | 'pro'

    // Pro 회원 확인
    if (subscriptionTier !== 'pro') {
      return respond(
        c,
        failure(
          403,
          analysisDetailErrorCodes.reanalysisForbidden,
          'Pro 구독이 필요합니다',
        ),
      );
    }

    // new-analysis 서비스 재사용
    const result = await createNewAnalysis(
      supabase,
      userId,
      subscriptionTier,
      {
        subject_name: parsedBody.data.subject_name,
        birth_date: parsedBody.data.birth_date,
        birth_time: parsedBody.data.birth_time,
        gender: parsedBody.data.gender,
      },
      config.GEMINI_API_KEY,
    );

    if (!result.ok) {
      logger.error('Failed to create reanalysis', result.error);
      return respond(c, result);
    }

    return respond(c, success({
      new_analysis_id: result.data.analysis_id,
      status: result.data.status,
      remaining_count: result.data.remaining_count,
    }));
  });
};
```

---

### Phase 3: Frontend State Management

#### Task 3.1: Context & Reducer 구현
- **파일**: `src/features/analysis-detail/context/AnalysisDetailContext.tsx`
- **참고**: `/docs/pages/analysis-detail/state_management.md`의 Flux 패턴 구현
- **구현 내용**: 3개 상태 관리 (analysis, ui, user), 16개 Action 처리

*(상태 관리 문서에 이미 상세히 정의되어 있으므로 전체 코드는 생략, 문서 참조)*

**핵심 구현 포인트**:
1. `useReducer`로 전역 상태 관리
2. `useEffect`로 초기 분석 데이터 조회
3. Context Provider로 하위 컴포넌트에 상태 및 dispatch 제공

#### Task 3.2: Custom Hooks 구현
- **파일**: `src/features/analysis-detail/hooks/`

**주요 Hooks**:

```typescript
// useAnalysisDetailContext.ts
export function useAnalysisDetailContext() {
  const context = useContext(AnalysisDetailContext);
  if (!context) {
    throw new Error('useAnalysisDetailContext must be used within AnalysisDetailProvider');
  }
  return context;
}

// useAnalysisData.ts
export function useAnalysisData() {
  const { state } = useAnalysisDetailContext();
  return state.analysis;
}

// useActiveTab.ts
export function useActiveTab() {
  const { state, actions } = useAnalysisDetailContext();
  return {
    activeTab: state.ui.activeTab,
    setActiveTab: actions.setActiveTab,
  };
}

// useCanReanalyze.ts (Derived State)
export function useCanReanalyze() {
  const { state, computed } = useAnalysisDetailContext();
  return computed.canReanalyze;
}
```

#### Task 3.3: Actions 구현
- **파일**: `src/features/analysis-detail/actions/analysisDetailActions.ts`

```typescript
import { apiClient } from '@/lib/remote/api-client';
import type { AnalysisDetailAction } from '../context/types';

export async function fetchAnalysis(
  dispatch: React.Dispatch<AnalysisDetailAction>,
  analysisId: string,
) {
  dispatch({ type: 'FETCH_ANALYSIS_START' });

  try {
    const response = await apiClient.get(`/api/analyses/${analysisId}`);
    dispatch({
      type: 'FETCH_ANALYSIS_SUCCESS',
      payload: response.data,
    });
  } catch (error: any) {
    const errorCode = error.response?.data?.error?.code || 'UNKNOWN_ERROR';
    dispatch({
      type: 'FETCH_ANALYSIS_ERROR',
      payload: { error: errorCode },
    });
  }
}

export async function deleteAnalysis(
  dispatch: React.Dispatch<AnalysisDetailAction>,
  analysisId: string,
) {
  dispatch({ type: 'DELETE_START' });

  try {
    await apiClient.delete(`/api/analyses/${analysisId}`);
    dispatch({ type: 'DELETE_SUCCESS' });
    return { success: true };
  } catch (error: any) {
    dispatch({
      type: 'DELETE_ERROR',
      payload: { error: error.message },
    });
    return { success: false, error: error.message };
  }
}

export async function reanalyzeAnalysis(
  dispatch: React.Dispatch<AnalysisDetailAction>,
  request: {
    original_analysis_id: string;
    subject_name: string;
    birth_date: string;
    birth_time: string | null;
    gender: 'male' | 'female';
  },
) {
  dispatch({ type: 'REANALYZE_START' });

  try {
    const response = await apiClient.post('/api/analyses/reanalyze', request);
    dispatch({
      type: 'REANALYZE_SUCCESS',
      payload: { new_analysis_id: response.data.new_analysis_id },
    });
    return { success: true, new_analysis_id: response.data.new_analysis_id };
  } catch (error: any) {
    dispatch({
      type: 'REANALYZE_ERROR',
      payload: { error: error.message },
    });
    return { success: false, error: error.message };
  }
}
```

---

### Phase 4: Frontend Components

#### Task 4.1: 메인 컴포넌트들
1. **AnalysisDetailHeader.tsx** (헤더)
2. **BasicInfoSection.tsx** (기본 정보)
3. **HeavenlyStemsSection.tsx** (천간지지)
4. **FiveElementsSection.tsx** (오행 차트)
5. **FortuneFlowSection.tsx** (운세 흐름)
6. **InterpretationTabs.tsx** (종합 해석 탭)
7. **InterpretationContent.tsx** (마크다운 렌더링)
8. **ReanalyzeModal.tsx** (재분석 모달)
9. **DeleteModal.tsx** (삭제 모달)
10. **AnalysisDetailSkeleton.tsx** (스켈레톤 UI)
11. **AnalysisErrorState.tsx** (에러 상태 UI)

**QA Sheet (BasicInfoSection)**:
- [ ] 성함, 생년월일, 성별이 올바르게 표시되는가?
- [ ] 출생시간이 없을 때 "미상" 또는 숨김 처리되는가?
- [ ] 상대 시간이 올바르게 표시되는가? ("3시간 전")
- [ ] AI 모델 뱃지가 올바르게 표시되는가? (Flash, Pro)
- [ ] 조회수가 올바르게 표시되는가?

**QA Sheet (HeavenlyStemsSection)**:
- [ ] 천간지지 한자가 올바르게 표시되는가? (庚午, 丙寅 등)
- [ ] 한글 읽기가 올바르게 표시되는가? ((경오), (병인))
- [ ] 출생시간이 없을 때 시주가 "미상"으로 표시되는가?
- [ ] 4개 기둥이 가로로 정렬되어 표시되는가?

**QA Sheet (FiveElementsSection)**:
- [ ] 오행 차트가 올바르게 렌더링되는가?
- [ ] 각 오행의 개수가 올바르게 표시되는가?
- [ ] 오행 색상이 올바르게 적용되는가?
- [ ] 차트 로딩 중일 때 스피너가 표시되는가?
- [ ] 차트 렌더링 완료 후 `setChartLoading(false)` 호출되는가?

**QA Sheet (InterpretationTabs)**:
- [ ] 4개 탭(성격, 재운, 건강, 연애)이 표시되는가?
- [ ] 탭 클릭 시 내용이 전환되는가?
- [ ] 활성 탭에 시각적 강조가 적용되는가?
- [ ] 마크다운 렌더링이 올바르게 동작하는가?
- [ ] XSS 공격이 차단되는가? (sanitization)

**QA Sheet (ReanalyzeModal)**:
- [ ] Free 회원이 재분석 버튼 클릭 시 Pro 구독 유도 메시지가 표시되는가?
- [ ] Pro 회원이 재분석 버튼 클릭 시 모달이 열리는가?
- [ ] 모달에 분석 대상 정보와 남은 분석 횟수가 표시되는가?
- [ ] "재분석 시작" 버튼 클릭 시 로딩 상태가 표시되는가?
- [ ] 재분석 성공 시 새 분석 페이지로 리다이렉트되는가?
- [ ] 재분석 실패 시 에러 메시지가 표시되는가?

**QA Sheet (DeleteModal)**:
- [ ] 삭제 버튼 클릭 시 확인 모달이 열리는가?
- [ ] "복구 불가" 경고 메시지가 표시되는가?
- [ ] "삭제" 버튼 클릭 시 로딩 상태가 표시되는가?
- [ ] 삭제 성공 시 대시보드로 리다이렉트되는가?
- [ ] 삭제 실패 시 에러 메시지가 표시되는가?

#### Task 4.2: Pages 구현
1. **src/app/analysis/[id]/page.tsx**: 메인 페이지

```typescript
'use client';

import { use } from 'react';
import { useAuth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { AnalysisDetailProvider } from '@/features/analysis-detail/context/AnalysisDetailContext';
import { AnalysisDetailHeader } from '@/features/analysis-detail/components/AnalysisDetailHeader';
import { BasicInfoSection } from '@/features/analysis-detail/components/BasicInfoSection';
import { HeavenlyStemsSection } from '@/features/analysis-detail/components/HeavenlyStemsSection';
import { FiveElementsSection } from '@/features/analysis-detail/components/FiveElementsSection';
import { FortuneFlowSection } from '@/features/analysis-detail/components/FortuneFlowSection';
import { InterpretationTabs } from '@/features/analysis-detail/components/InterpretationTabs';
import { ReanalyzeModal } from '@/features/analysis-detail/components/ReanalyzeModal';
import { DeleteModal } from '@/features/analysis-detail/components/DeleteModal';
import { AnalysisDetailSkeleton } from '@/features/analysis-detail/components/AnalysisDetailSkeleton';
import { AnalysisErrorState } from '@/features/analysis-detail/components/AnalysisErrorState';
import { useAnalysisData } from '@/features/analysis-detail/hooks/useAnalysisData';

function AnalysisDetailContent() {
  const analysis = useAnalysisData();

  if (analysis.isLoading) {
    return <AnalysisDetailSkeleton />;
  }

  if (analysis.error) {
    return <AnalysisErrorState error={analysis.error} />;
  }

  if (!analysis.analysis_result) {
    return <div>분석 결과가 없습니다.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <AnalysisDetailHeader />

      {/* 기본 정보 */}
      <BasicInfoSection />

      {/* 천간지지 */}
      <HeavenlyStemsSection />

      {/* 오행 분석 */}
      <FiveElementsSection />

      {/* 운세 흐름 */}
      <FortuneFlowSection />

      {/* 종합 해석 */}
      <InterpretationTabs />

      {/* 모달들 */}
      <ReanalyzeModal />
      <DeleteModal />
    </div>
  );
}

export default function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  // ✅ Clerk v6: 클라이언트 컴포넌트에서 useAuth() 사용
  // 서버 컴포넌트에서는 await auth() 패턴을 사용해야 하지만,
  // 클라이언트 컴포넌트('use client')에서는 useAuth() 훅을 그대로 사용 가능
  // (useAuth()는 비동기 변경사항 없음)
  const { userId, isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <AnalysisDetailSkeleton />;
  }

  if (!isSignedIn) {
    redirect('/sign-in');
  }

  return (
    <AnalysisDetailProvider analysisId={id}>
      <AnalysisDetailContent />
    </AnalysisDetailProvider>
  );
}
```

---

### Phase 5: Integration & Testing

#### Task 5.1: Hono App에 라우터 등록
- **파일**: `src/backend/hono/app.ts`

```typescript
import { registerAnalysisDetailRoutes } from '@/features/analysis-detail/backend/route';

export function createHonoApp() {
  const app = new Hono<AppEnv>();

  // 기존 미들웨어...

  registerExampleRoutes(app);
  registerAnalysisDetailRoutes(app); // 추가

  return app;
}
```

#### Task 5.2: 통합 테스트
1. **초기 로딩 플로우** (E2E):
   - [ ] 페이지 진입 → 분석 데이터 조회 API 호출
   - [ ] 스켈레톤 UI 표시 → 실제 데이터 렌더링
   - [ ] 조회수 1 증가 확인
   - [ ] 모든 섹션 정상 표시 (기본 정보, 천간지지, 오행, 운세, 해석)

2. **탭 전환 플로우** (E2E):
   - [ ] "재운" 탭 클릭 → 재운 분석 표시
   - [ ] "건강" 탭 클릭 → 건강운 분석 표시
   - [ ] 마크다운 렌더링 정상 동작

3. **재분석 플로우** (E2E):
   - [ ] Pro 회원: "재분석" 버튼 클릭 → 모달 오픈
   - [ ] "재분석 시작" 클릭 → 새 분석 생성
   - [ ] 분석 횟수 차감 확인
   - [ ] 새 분석 페이지로 리다이렉트

4. **삭제 플로우** (E2E):
   - [ ] "삭제" 버튼 클릭 → 확인 모달 오픈
   - [ ] "삭제" 확인 클릭 → 분석 삭제
   - [ ] 대시보드로 리다이렉트
   - [ ] 삭제된 분석 재접근 시 404 에러

5. **에러 처리 플로우** (E2E):
   - [ ] 존재하지 않는 분석 ID 접근 → 404 에러 표시
   - [ ] 다른 사용자의 분석 접근 → 403 에러 표시
   - [ ] 로그아웃 상태에서 접근 → 로그인 페이지로 리다이렉트

---

## 필요한 Shadcn-ui 컴포넌트

```bash
npx shadcn@latest add card
npx shadcn@latest add button
npx shadcn@latest add badge
npx shadcn@latest add tabs
npx shadcn@latest add dialog
npx shadcn@latest add separator
npx shadcn@latest add skeleton
npx shadcn@latest add dropdown-menu
npx shadcn@latest add toast
```

---

## 필요한 npm 패키지

```bash
npm install react-markdown rehype-sanitize --save
npm install recharts --save
npm install date-fns --save
```

---

## Database Migration

이 페이지는 기존 `analyses` 테이블을 사용하므로 추가 마이그레이션이 필요 없습니다.

필요한 테이블 (이미 존재):
- `analyses`
- `users` (재분석 시 구독 등급 확인용)

---

## 보안 고려사항

1. **인증/인가**:
   - 모든 API는 Clerk JWT 토큰 검증 필수
   - 분석 소유자만 조회/삭제 가능 (`user_id` 검증)
   - Backend에서 철저한 권한 확인

2. **XSS 방지**:
   - 마크다운 렌더링 시 `rehype-sanitize` 플러그인 필수
   - `<script>`, `<iframe>`, `onclick` 등 위험한 태그/속성 제거

3. **SQL Injection 방지**:
   - Supabase ORM 사용 (Prepared Statements)
   - 사용자 입력값 직접 쿼리에 삽입 금지

4. **Rate Limiting**:
   - 동일 사용자 분당 최대 60회 조회 제한

---

## 성능 최적화

1. **React Query 캐싱**:
   - 분석 데이터: 5분 캐시
   - 조회수 증가는 optimistic update

2. **메모이제이션**:
   - 차트 데이터: `useMemo`로 캐싱
   - 마크다운 렌더링 결과: `useMemo`로 캐싱
   - 이벤트 핸들러: `useCallback`으로 메모이제이션

3. **코드 스플리팅**:
   - 차트 컴포넌트는 동적 import
   - 마크다운 렌더러는 동적 import

4. **이미지 최적화** (향후 추가되는 이미지):
   - Next.js Image 컴포넌트 사용
   - Lazy loading

---

## 모니터링 & 로깅

1. **페이지 로딩 시간 추적** (목표: 1초 이내)
2. **API 응답 시간 로깅**
3. **에러 발생률 모니터링** (5% 이하 목표)
4. **차트 렌더링 시간 추적** (목표: 300ms 이내)
5. **마크다운 렌더링 시간 추적**

---

## 향후 확장 고려사항

1. **공유 기능**: 공유 링크 생성, 카카오톡 공유
2. **PDF 다운로드**: `react-to-pdf` 또는 서버 사이드 PDF 생성
3. **SEO 최적화**: SSR/ISR 적용, Open Graph 태그
4. **사용자 피드백**: 분석 결과에 대한 별점, 코멘트
5. **비교 기능**: 2개 분석 결과 나란히 비교
6. **즐겨찾기**: 중요한 분석에 북마크 추가

---

## 구현 순서 요약

1. **Phase 1**: 유틸 함수 및 상수 생성 (마크다운, 천간지지, 오행, 차트)
2. **Phase 2**: Backend API 구현 (Service Layer, Routes, Schemas)
3. **Phase 3**: Frontend State Management (Context, Reducer, Actions)
4. **Phase 4**: Frontend Components (UI 컴포넌트, Pages)
5. **Phase 5**: Integration & Testing (E2E 테스트, 통합 테스트)

각 Phase는 순차적으로 진행하되, Phase 1과 Phase 2는 병렬로 진행 가능합니다.

---

## 충돌 방지 체크리스트

### 기존 코드베이스와의 충돌 확인

- [ ] `src/backend/hono/app.ts`에 `registerAnalysisDetailRoutes()` 추가 (기존 라우터와 충돌 없음)
- [ ] API 엔드포인트 경로 중복 없음 확인:
  - `GET /api/analyses/:id` (신규)
  - `DELETE /api/analyses/:id` (신규)
  - `POST /api/analyses/reanalyze` (신규)
- [ ] `analyses` 테이블이 `database.md`와 일치하는지 확인
- [ ] `src/lib/utils/date.ts`의 `formatRelativeTime` 재사용 (중복 방지)

### 공통 모듈 재사용

- [ ] `src/backend/http/response.ts`의 `success()`, `failure()`, `respond()` 사용
- [ ] `src/backend/hono/context.ts`의 `getSupabase()`, `getLogger()` 사용
- [ ] `src/lib/remote/api-client.ts`의 HTTP 클라이언트 사용
- [ ] `date-fns` 라이브러리 사용 (상대 시간 포맷)

### DRY 원칙 준수

- [ ] 재분석 로직은 `new-analysis` 서비스의 `createNewAnalysis` 재사용
- [ ] 마크다운 렌더링 로직을 공통 유틸 함수로 분리
- [ ] 차트 컴포넌트를 재사용 가능하도록 설계 (다른 페이지에서도 사용 가능)
- [ ] 천간지지/오행 상수를 공통 모듈로 분리

---

## 최종 체크리스트

- [ ] Shadcn-ui 컴포넌트가 모두 설치되었는가?
- [ ] npm 패키지가 모두 설치되었는가?
- [ ] Backend API가 올바르게 동작하는가?
- [ ] Frontend 분석 데이터 조회가 올바르게 동작하는가?
- [ ] 차트 렌더링이 올바르게 동작하는가?
- [ ] 마크다운 렌더링이 올바르게 동작하는가?
- [ ] XSS 방지 sanitization이 적용되었는가?
- [ ] 재분석 기능이 올바르게 동작하는가?
- [ ] 삭제 기능이 올바르게 동작하는가?
- [ ] 모든 에러 케이스가 처리되는가?
- [ ] E2E 테스트가 통과하는가?
- [ ] TypeScript 타입 오류가 없는가?
- [ ] ESLint 오류가 없는가?

---

이 계획에 따라 구현하면 분석 상세보기 페이지의 모든 기능이 완성됩니다.
