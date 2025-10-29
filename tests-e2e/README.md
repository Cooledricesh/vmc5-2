# E2E 테스트 가이드

## 개요

이 디렉토리는 사주풀이 AI 서비스의 End-to-End 테스트를 포함하고 있습니다. TDD(Test-Driven Development) 방식으로 작성되었습니다.

## 테스트 파일

### 핵심 테스트
- **`core-user-flow.spec.ts`**: 핵심 유저플로우 테스트 (12개)
  - 로그인 플로우 (3개)
  - 사주 분석 의뢰 (3개)
  - 분석 결과 확인 (3개)
  - 엣지케이스 (3개)

### 헬퍼 함수
- **`helpers/auth.helper.ts`**: 인증 관련 헬퍼
- **`helpers/analysis.helper.ts`**: 분석 기능 헬퍼
- **`helpers/assertions.helper.ts`**: 검증 헬퍼

### 기존 테스트
- **`smoke.spec.ts`**: 기본 스모크 테스트
- **`auth-integration.spec.ts`**: 인증 통합 테스트

## 빠른 시작

### 1. 환경 설정

`.env.local` 파일에 다음 환경 변수 추가:

```bash
# Clerk 인증 (필수)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# 테스트 계정 (선택)
TEST_EMAIL=cooledricesh@gmail.com
TEST_PASSWORD=xxxxx
```

### 2. 개발 서버 시작

```bash
npm run dev
```

### 3. 테스트 실행

```bash
# 모든 E2E 테스트 실행
npm run test:e2e

# 특정 파일만 실행
npm run test:e2e -- core-user-flow.spec.ts

# 특정 테스트만 실행 (grep)
npm run test:e2e -- -g "로그인 플로우"

# UI 모드 (디버깅에 유용)
npm run test:e2e:ui

# 코드 생성 도구
npm run test:e2e:codegen
```

## 테스트 커맨드

### 기본 실행
```bash
npm run test:e2e
```

### 헤드리스 모드 (CI/CD)
```bash
CI=true npm run test:e2e
```

### 디버그 모드
```bash
npm run test:e2e:ui
```

### 특정 브라우저
```bash
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit
```

### 병렬 실행 제한
```bash
npm run test:e2e -- --workers=1
```

## 테스트 작성 가이드

### 1. 헬퍼 함수 사용

```typescript
import { loginWithGoogle, ensureAuthenticated } from './helpers/auth.helper';
import { createNewAnalysis } from './helpers/analysis.helper';
import { assertDashboardLoaded } from './helpers/assertions.helper';

test('새 분석 생성', async ({ page }) => {
  // Given: 로그인 상태
  await ensureAuthenticated(page, 'test@example.com');

  // When: 새 분석 생성
  const analysisId = await createNewAnalysis(page, {
    name: '홍길동',
    birthDate: '1990-01-01',
    gender: 'male',
  });

  // Then: 분석 페이지로 이동
  expect(page.url()).toContain(`/analysis/${analysisId}`);
});
```

### 2. AAA 패턴 (Arrange-Act-Assert)

```typescript
test('example', async ({ page }) => {
  // Arrange (준비)
  await page.goto('/dashboard');

  // Act (실행)
  await page.click('button:has-text("새 분석")');

  // Assert (검증)
  expect(page.url()).toContain('/new-analysis');
});
```

### 3. data-testid 사용

```typescript
// 좋은 예: 고유한 테스트 ID
await page.locator('[data-testid="user-profile"]').click();

// 나쁜 예: CSS 클래스에 의존
await page.locator('.user-button').click(); // 스타일 변경 시 깨짐
```

## 디버깅

### 1. 스크린샷 캡처

```typescript
test('example', async ({ page }) => {
  await page.screenshot({ path: 'screenshot.png' });
});
```

### 2. 페이지 HTML 출력

```typescript
test('example', async ({ page }) => {
  const html = await page.content();
  console.log(html);
});
```

### 3. 트레이스 확인

테스트 실패 시 자동으로 트레이스가 생성됩니다:

```bash
npx playwright show-trace test-results/[test-name]/trace.zip
```

### 4. UI 모드에서 디버깅

```bash
npm run test:e2e:ui
```

UI 모드에서는:
- 각 단계를 시각적으로 확인
- 브레이크포인트 설정
- 타임라인 탐색
- 네트워크 요청 확인

## 일반적인 문제 해결

### 1. Clerk OAuth 로그인 실패

**문제**: Google OAuth 자동화 실패

**해결방법**:
```typescript
// 옵션 1: 세션 토큰 주입
await injectAuthToken(page, 'valid-session-token');

// 옵션 2: 테스트용 API 사용 (개발 환경)
await createTestSession(page, 'test@example.com');
```

### 2. 타임아웃 에러

**문제**: 요소를 찾을 수 없음

**해결방법**:
```typescript
// 타임아웃 증가
await expect(page.locator('button')).toBeVisible({ timeout: 10000 });

// 명시적 대기
await page.waitForLoadState('networkidle');
```

### 3. 불안정한 테스트 (Flaky Test)

**문제**: 테스트가 간헐적으로 실패

**해결방법**:
```typescript
// 네트워크 안정화 대기
await page.waitForLoadState('networkidle');

// 요소가 실제로 상호작용 가능할 때까지 대기
await page.waitForSelector('button', { state: 'visible' });

// 애니메이션 완료 대기
await page.waitForTimeout(500);
```

### 4. 404 에러

**문제**: 페이지를 찾을 수 없음

**확인사항**:
- 개발 서버가 실행 중인지 확인
- URL 경로가 올바른지 확인
- 라우트가 구현되었는지 확인

## 테스트 베스트 프랙티스

### 1. 테스트 격리
각 테스트는 독립적으로 실행 가능해야 합니다:

```typescript
test.beforeEach(async ({ page }) => {
  // 각 테스트 전에 초기화
  await page.goto('/');
});

test.afterEach(async ({ page }) => {
  // 테스트 후 정리
  await cleanup(page);
});
```

### 2. 의미있는 테스트 이름
```typescript
// 좋은 예
test('사용자가 분석 횟수 부족 시 Pro 구독 모달이 표시된다', ...);

// 나쁜 예
test('test1', ...);
```

### 3. Given-When-Then 주석
```typescript
test('example', async ({ page }) => {
  // Given: 사용자가 로그인 상태
  await ensureAuthenticated(page, TEST_EMAIL);

  // When: 새 분석 페이지 접근
  await page.goto('/new-analysis');

  // Then: 분석 폼이 표시됨
  await assertAnalysisFormVisible(page);
});
```

### 4. 재사용 가능한 헬퍼
공통 로직은 헬퍼 함수로 추출:

```typescript
// helpers/custom.helper.ts
export async function fillAnalysisForm(page: Page, data: AnalysisData) {
  await page.fill('[name="name"]', data.name);
  await page.fill('[name="birthDate"]', data.birthDate);
  // ...
}
```

## CI/CD 통합

### GitHub Actions 예시

```yaml
name: E2E Tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
        env:
          CI: true
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_PUBLISHABLE_KEY }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
```

## 리포트

테스트 실행 후 HTML 리포트 확인:

```bash
npx playwright show-report
```

리포트는 `playwright-report/` 디렉토리에 생성됩니다.

## 추가 리소스

### 공식 문서
- [Playwright 공식 문서](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Clerk Testing Guide](https://clerk.com/docs/testing/overview)

### 프로젝트 문서
- [E2E 테스트 설계](../docs/e2e-test-design.md)
- [구현 보고서](../docs/e2e-test-implementation-report.md)
- [GREEN Phase 가이드](../docs/e2e-test-green-phase-guide.md)

## 문의 및 기여

테스트 관련 문제나 개선사항은 이슈로 등록해주세요.

---

**작성일**: 2025-10-30
**TDD Phase**: RED ✅ | GREEN ⏳ | REFACTOR ⏳
