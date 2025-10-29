import { Page, expect } from '@playwright/test';

/**
 * Clerk 인증 헬퍼 함수
 *
 * Clerk OAuth 자동화는 복잡하므로, 실제 프로덕션에서는:
 * 1. Clerk의 테스트 모드 사용
 * 2. 세션 토큰 직접 주입
 * 3. E2E 테스트용 별도 인증 엔드포인트
 *
 * 이 헬퍼는 실제 Clerk UI를 통한 로그인을 시뮬레이션합니다.
 */

export interface LoginOptions {
  email: string;
  waitForDashboard?: boolean;
}

/**
 * Google OAuth를 통한 Clerk 로그인
 *
 * @param page - Playwright Page 객체
 * @param options - 로그인 옵션 (이메일, 대시보드 대기 여부)
 */
export async function loginWithGoogle(
  page: Page,
  options: LoginOptions
): Promise<void> {
  const { email, waitForDashboard = true } = options;

  // 1. 로그인 페이지로 이동
  await page.goto('/sign-in');
  await page.waitForLoadState('networkidle');

  // 2. Clerk UI가 로드될 때까지 대기
  await page.waitForSelector('.cl-rootBox', { timeout: 10000 });

  // 3. "Continue with Google" 버튼 찾기 및 클릭
  // Clerk UI는 OAuth 프로바이더 버튼에 특정 클래스를 사용
  const googleButton = page.locator('button:has-text("Continue with Google"), .cl-socialButtonsBlockButton:has-text("Google")').first();
  await expect(googleButton).toBeVisible({ timeout: 5000 });
  await googleButton.click();

  // 4. Google OAuth 페이지로 리다이렉트 대기
  // 실제 E2E에서는 Google 계정 선택 및 인증이 필요
  // 테스트 환경에서는 Clerk의 테스트 모드를 활용하거나
  // 사전에 인증된 세션을 재사용

  // 5. 인증 완료 후 리다이렉트 대기
  if (waitForDashboard) {
    await page.waitForURL('**/dashboard', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
  }
}

/**
 * 로그아웃 처리
 *
 * @param page - Playwright Page 객체
 */
export async function logout(page: Page): Promise<void> {
  // 1. 사용자 프로필 메뉴 열기
  const userButton = page.locator('[data-testid="user-button"], .cl-userButtonTrigger, button:has-text("계정")').first();

  // 사용자 버튼이 없으면 이미 로그아웃 상태
  const isVisible = await userButton.isVisible().catch(() => false);
  if (!isVisible) {
    return;
  }

  await userButton.click();
  await page.waitForTimeout(500); // 메뉴 애니메이션 대기

  // 2. 로그아웃 버튼 클릭
  const logoutButton = page.locator('button:has-text("Sign out"), button:has-text("로그아웃")').first();
  await expect(logoutButton).toBeVisible({ timeout: 3000 });
  await logoutButton.click();

  // 3. 홈페이지로 리다이렉트 확인
  await page.waitForURL('/', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

/**
 * 인증 상태 확인 및 필요시 로그인
 *
 * @param page - Playwright Page 객체
 * @param email - 로그인할 이메일 주소
 */
export async function ensureAuthenticated(
  page: Page,
  email: string
): Promise<void> {
  // 대시보드 접근 시도
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  // 로그인 페이지로 리다이렉트되었는지 확인
  const currentUrl = page.url();

  if (currentUrl.includes('/sign-in') || currentUrl.includes('/sign-up')) {
    // 로그인 필요
    await loginWithGoogle(page, { email, waitForDashboard: true });
  } else if (currentUrl.includes('/dashboard')) {
    // 이미 로그인됨
    return;
  } else {
    // 예상치 못한 페이지
    throw new Error(`Unexpected page: ${currentUrl}`);
  }
}

/**
 * 인증 토큰 직접 주입 (고급 사용)
 *
 * Clerk 세션 토큰을 직접 주입하여 OAuth 플로우 우회
 * 주의: 이 방법은 Clerk의 내부 구조에 의존하므로 버전 업데이트 시 깨질 수 있음
 *
 * @param page - Playwright Page 객체
 * @param sessionToken - Clerk 세션 토큰
 */
export async function injectAuthToken(
  page: Page,
  sessionToken: string
): Promise<void> {
  await page.context().addCookies([
    {
      name: '__session',
      value: sessionToken,
      domain: new URL(page.url()).hostname,
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    },
  ]);

  // 페이지 새로고침하여 세션 적용
  await page.reload();
  await page.waitForLoadState('networkidle');
}

/**
 * 테스트용 세션 생성 (개발 환경 전용)
 *
 * 개발 환경에서 빠른 테스트를 위한 세션 생성
 * 프로덕션에서는 사용 불가
 *
 * @param page - Playwright Page 객체
 * @param email - 테스트 사용자 이메일
 */
export async function createTestSession(
  page: Page,
  email: string
): Promise<void> {
  // 개발 환경 확인
  const baseUrl = page.context().pages()[0]?.url() || '';
  if (!baseUrl.includes('localhost')) {
    throw new Error('createTestSession은 로컬 개발 환경에서만 사용 가능합니다');
  }

  // 테스트용 API 엔드포인트 호출 (구현 필요)
  const response = await page.request.post('/api/test/auth/create-session', {
    data: { email },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test session: ${response.status()}`);
  }

  const { sessionToken } = await response.json();
  await injectAuthToken(page, sessionToken);
}
