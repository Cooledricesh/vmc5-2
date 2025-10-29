# 대시보드 401 인증 문제 해결

## 문제 상황

대시보드 페이지에서 다음과 같은 401 Unauthorized 에러가 발생했습니다:

```
GET http://localhost:3000/api/dashboard/summary - 401 (Unauthorized)
GET http://localhost:3000/api/dashboard/stats - 401 (Unauthorized)
GET http://localhost:3000/api/analyses?period=all&sort=latest&page=1&limit=10 - 401 (Unauthorized)
```

## 원인 분석

### 인증 플로우 분석

1. **서버측 인증 미들웨어**: `src/backend/middleware/clerk-auth.ts`
   - Clerk의 `auth()` 함수를 사용하여 Next.js 서버 컨텍스트에서 인증 검증
   - 서버 컴포넌트나 서버 액션에서는 잘 작동

2. **클라이언트측 API 요청**: `src/lib/remote/api-client.ts`
   - Axios 인스턴스를 사용하여 HTTP 요청
   - **문제**: Authorization 헤더가 설정되지 않음

3. **Clerk 인증 토큰**:
   - 클라이언트에서 `useAuth().getToken()`으로 가져올 수 있음
   - 하지만 React Hook이므로 Axios interceptor에서 직접 호출할 수 없음

### 근본 원인

**클라이언트에서 API를 호출할 때 Clerk 인증 토큰을 Authorization 헤더에 포함시키지 않았습니다.**

## TDD 해결 과정

### RED Phase: 실패하는 테스트 작성

#### 1. api-client 단위 테스트 (`src/lib/remote/api-client.test.ts`)

```typescript
it('토큰 getter가 등록되고 토큰이 있을 때 Authorization 헤더에 Bearer 토큰을 추가해야 한다', async () => {
  // Arrange
  const mockToken = 'mock-clerk-token-12345';
  const mockGetToken = vi.fn().mockResolvedValue(mockToken);
  setAuthTokenGetter(mockGetToken);

  // Mock API 응답
  mockAxios.onGet('/api/test').reply((config) => {
    expect(config.headers?.Authorization).toBe(`Bearer ${mockToken}`);
    return [200, { success: true }];
  });

  // Act
  const response = await apiClient.get('/api/test');

  // Assert
  expect(mockGetToken).toHaveBeenCalled();
  expect(response.data).toEqual({ success: true });
});
```

**결과**: ❌ 테스트 실패 - Authorization 헤더가 추가되지 않음

### GREEN Phase: 최소한의 코드로 문제 해결

#### 2. api-client에 인증 토큰 주입 기능 추가

```typescript
// src/lib/remote/api-client.ts

type AuthTokenGetter = () => Promise<string | null>;
let getTokenFn: AuthTokenGetter | null = null;

export const setAuthTokenGetter = (getter: AuthTokenGetter): void => {
  getTokenFn = getter;
};

export const clearAuthTokenGetter = (): void => {
  getTokenFn = null;
};

apiClient.interceptors.request.use(
  async (config: AxiosRequestConfig) => {
    try {
      if (getTokenFn) {
        const token = await getTokenFn();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.warn("Failed to get auth token:", error);
    }
    return config;
  }
);
```

**결과**: ✅ api-client 테스트 통과

#### 3. AuthTokenSetter 컴포넌트 생성

```typescript
// src/lib/remote/AuthTokenSetter.tsx

'use client';

export function AuthTokenSetter(): null {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => {
      clearAuthTokenGetter();
    };
  }, [getToken]);

  return null;
}
```

#### 4. Providers에 AuthTokenSetter 추가

```typescript
// src/app/providers.tsx

<ClerkProvider>
  <AuthTokenSetter />
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  </ThemeProvider>
</ClerkProvider>
```

**결과**: ✅ 모든 대시보드 API 호출이 인증 토큰과 함께 전송됨

#### 5. 통합 테스트 작성 및 검증

```typescript
// src/features/dashboard/actions/dashboardActions.test.ts

describe('dashboardActions 통합 테스트', () => {
  beforeEach(() => {
    const mockToken = 'test-clerk-token';
    setAuthTokenGetter(async () => mockToken);
  });

  it('인증 토큰과 함께 대시보드 요약 정보를 요청해야 한다', async () => {
    mockAxios.onGet('/api/dashboard/summary').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer test-clerk-token');
      return [200, mockSummaryData];
    });

    await fetchSummary(mockDispatch);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'FETCH_SUMMARY_SUCCESS',
      payload: mockSummaryData,
    });
  });
});
```

**결과**: ✅ 모든 통합 테스트 통과 (12/12)

### REFACTOR Phase: 코드 개선

#### 개선 사항

1. **타입 안정성 강화**
   - `AuthTokenGetter` 타입 정의
   - 함수 시그니처에 명시적 반환 타입 추가

2. **문서화 추가**
   - JSDoc 주석으로 사용 방법과 동작 원리 설명
   - 예제 코드 포함

3. **에러 처리 개선**
   - 토큰 가져오기 실패 시에도 요청이 계속 진행되도록 처리
   - 서버에서 401 에러를 반환하면 클라이언트가 적절히 처리

**결과**: ✅ 리팩토링 후에도 모든 테스트 통과 (12/12)

## 테스트 커버리지

### 단위 테스트 (4개)

- ✅ 토큰 getter 등록 및 Authorization 헤더 추가
- ✅ 토큰 getter 미등록 시 헤더 추가 안 함
- ✅ 토큰이 null일 때 헤더 추가 안 함
- ✅ getToken 실패 시에도 요청 계속 진행

### 통합 테스트 (8개)

#### fetchSummary
- ✅ 인증 토큰과 함께 요청
- ✅ 401 에러 시 적절한 에러 처리

#### fetchStats
- ✅ 인증 토큰과 함께 요청
- ✅ 401 에러 시 적절한 에러 처리

#### fetchAnalyses
- ✅ 인증 토큰과 함께 요청
- ✅ 처리 중인 분석이 있으면 폴링 시작
- ✅ 처리 중인 분석이 없으면 폴링 중지
- ✅ 401 에러 시 적절한 에러 처리

## 해결 결과

### Before
```
❌ 401 Unauthorized - Authorization 헤더 없음
❌ 클라이언트에서 서버 API 호출 실패
❌ 대시보드 데이터 로드 불가
```

### After
```
✅ Authorization: Bearer <clerk-token> 자동 추가
✅ 모든 API 요청이 인증 토큰과 함께 전송
✅ 대시보드 데이터 정상 로드
✅ 12/12 테스트 통과
```

## 핵심 교훈

1. **React Hook의 제약**: useAuth()는 React 컴포넌트/Hook에서만 호출 가능
2. **의존성 주입 패턴**: getToken 함수를 글로벌하게 등록하여 Axios interceptor에서 사용
3. **TDD의 가치**: 테스트가 없었다면 문제 재현과 수정 검증이 어려웠을 것
4. **클린 아키텍처**: 관심사의 분리 (AuthTokenSetter는 토큰 등록만, api-client는 HTTP만)

## 관련 파일

- `src/lib/remote/api-client.ts` - HTTP 클라이언트 및 인증 토큰 주입
- `src/lib/remote/AuthTokenSetter.tsx` - Clerk 토큰 getter 등록 컴포넌트
- `src/app/providers.tsx` - AuthTokenSetter 통합
- `src/lib/remote/api-client.test.ts` - 단위 테스트
- `src/features/dashboard/actions/dashboardActions.test.ts` - 통합 테스트
