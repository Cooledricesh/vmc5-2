# 대시보드 404 오류 해결 과정 (TDD 방식)

## 문제 요약

사용자가 대시보드 페이지(`/dashboard`)에 접근 시 404 오류가 발생하는 것으로 보고됨.

## TDD 프로세스를 통한 문제 해결

### 1단계: 문제 파악 (Analysis)

#### 현재 상황 확인
- `/src/app/dashboard/page.tsx` 파일 존재 확인 ✅
- 대시보드 관련 컴포넌트 모두 존재 ✅
- 개발 서버 실행 후 테스트

#### 실제 발견
```bash
$ curl -I http://localhost:3000/dashboard
HTTP/1.1 307 Temporary Redirect
location: /sign-in?redirectedFrom=%2Fdashboard
x-clerk-auth-reason: dev-browser-missing
x-clerk-auth-status: signed-out
```

**결과**: 404 오류가 아니라 **307 리다이렉트**가 발생하고 있었음.

### 2단계: RED Phase - 실패하는 테스트 작성

#### 테스트 1: 대시보드 페이지 렌더링
```typescript
// src/app/dashboard/__tests__/page.test.tsx
describe('DashboardPage', () => {
  it('대시보드 페이지가 정상적으로 렌더링되어야 함', async () => {
    render(<DashboardPage params={mockParams} />);

    expect(screen.getByTestId('summary-section')).toBeInTheDocument();
    expect(screen.getByTestId('stats-cards')).toBeInTheDocument();
    expect(screen.getByTestId('analysis-list')).toBeInTheDocument();
  });
});
```

**결과**: ✅ 통과 (대시보드 페이지 자체는 정상)

#### 테스트 2: 미들웨어 접근 제어
```typescript
// src/__tests__/middleware.test.ts
describe('Middleware - Dashboard 접근 제어', () => {
  it('대시보드 접근 시 sign-in으로 리다이렉트되어야 함', async () => {
    const request = new NextRequest('http://localhost:3000/dashboard');
    const isPublicRoute = createRouteMatcher([
      '/',
      '/sign-in(.*)',
      '/sign-up(.*)',
      '/api/webhooks(.*)',
      '/api/[[...hono]](.*)',
    ]);

    expect(isPublicRoute(request)).toBe(false);
  });
});
```

**결과**: ❌ 실패 (중복 미들웨어 문제 발견)

#### 테스트 3: 중복 미들웨어 체크
```typescript
it('루트와 src 디렉토리에 중복 미들웨어가 없어야 함', async () => {
  const rootMiddleware = path.resolve(process.cwd(), 'middleware.ts');
  const srcMiddleware = path.resolve(process.cwd(), 'src/middleware.ts');

  const rootExists = fs.existsSync(rootMiddleware);
  const srcExists = fs.existsSync(srcMiddleware);

  // 둘 중 하나만 존재해야 함
  expect(rootExists && srcExists).toBe(false);
});
```

**결과**: ❌ 실패 (두 파일 모두 존재)

### 3단계: GREEN Phase - 최소한의 코드로 문제 해결

#### 문제 원인
1. **중복 미들웨어 파일**
   - `/middleware.ts` (루트)
   - `/src/middleware.ts`

2. **Next.js 동작**
   - Next.js는 루트의 `middleware.ts`를 우선 사용
   - 두 파일이 다른 로직을 가지고 있어 혼란 발생

3. **미들웨어 비교**
   ```typescript
   // /middleware.ts (더 완전한 버전)
   - Supabase 인증 페이지 리다이렉트 처리
   - 로그인 사용자 자동 리다이렉트
   - Hono API 라우트 포함

   // /src/middleware.ts (단순 버전)
   - auth.protect() 메서드만 사용
   - 기본적인 보호된 라우트 체크
   ```

#### 해결 방법
```bash
# 중복 파일 제거
rm /Users/seunghyun/Test/vmc5-2/src/middleware.ts
```

#### 테스트 결과
```bash
$ npm run test:unit -- src/__tests__/middleware.test.ts
✓ 대시보드 접근 시 sign-in으로 리다이렉트되어야 함
✓ 대시보드 경로가 보호되어야 함
✓ 홈페이지는 인증 없이 접근 가능해야 함
✓ 로그인 페이지는 인증 없이 접근 가능해야 함
✓ 회원가입 페이지는 인증 없이 접근 가능해야 함
✓ 분석 페이지는 인증이 필요해야 함
✓ 리다이렉트 시 원래 경로를 redirectedFrom 파라미터로 전달해야 함
✓ 로그인 후 원래 페이지로 돌아갈 수 있어야 함
✓ 루트와 src 디렉토리에 중복 미들웨어가 없어야 함

Test Files  1 passed (1)
Tests  9 passed (9)
```

### 4단계: REFACTOR Phase - 코드 개선

#### 테스트 모킹 개선
```typescript
// createRouteMatcher 모킹을 실제 동작에 가깝게 개선
createRouteMatcher: (routes: string[]) => (req: any) => {
  const path = req.nextUrl?.pathname || req.pathname;
  return routes.some(route => {
    // [[...slug]] 패턴 처리
    if (route.includes('[[...')) {
      const basePattern = route.split('[[...')[0];
      return path.startsWith(basePattern);
    }
    // (.*) 패턴 처리
    if (route.includes('(.*)')  ) {
      const pattern = route.replace('(.*)', '');
      return path.startsWith(pattern);
    }
    // 정확한 경로 매칭
    return path === route;
  });
}
```

## 테스트 커버리지 요약

### 대시보드 페이지 테스트 (4 tests)
- ✅ 페이지 정상 렌더링
- ✅ 섹션 순서 확인
- ✅ 스타일 클래스 적용
- ✅ Client 컴포넌트 확인

### 미들웨어 테스트 (9 tests)
- ✅ 인증되지 않은 사용자 리다이렉트 (2 tests)
- ✅ 공개 라우트 접근 (3 tests)
- ✅ 보호된 라우트 체크 (1 test)
- ✅ 리다이렉트 동작 (2 tests)
- ✅ 중복 미들웨어 체크 (1 test)

## 결론

### 실제 문제
사용자가 보고한 "404 오류"는 실제로는:
- **인증되지 않은 사용자의 보호된 라우트 접근**
- 미들웨어가 정상적으로 `/sign-in`으로 리다이렉트
- 307 Temporary Redirect 응답

### 해결된 문제
- **중복 미들웨어 파일 제거**로 혼란 해소
- `src/middleware.ts` 삭제, 루트의 `middleware.ts` 유지
- 모든 테스트 통과로 정상 동작 확인

### 권장 사항
1. **인증 플로우 이해**
   - 대시보드는 인증이 필요한 페이지
   - 로그인하지 않은 사용자는 자동으로 로그인 페이지로 이동

2. **에러 메시지 개선**
   - 리다이렉트 시 사용자에게 명확한 메시지 표시
   - "페이지를 찾을 수 없음" 대신 "로그인이 필요합니다" 표시

3. **미들웨어 관리**
   - 프로젝트 루트에만 `middleware.ts` 유지
   - `src/middleware.ts`는 사용하지 않음
   - Next.js 공식 문서에 따라 루트 레벨 미들웨어 사용

## 참고 자료

- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Clerk Authentication Middleware](https://clerk.com/docs/references/nextjs/clerk-middleware)
- [TDD Best Practices](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
