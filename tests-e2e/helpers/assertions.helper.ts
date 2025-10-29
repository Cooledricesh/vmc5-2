import { Page, expect } from '@playwright/test';

/**
 * 공통 검증(assertion) 헬퍼 함수
 */

/**
 * 대시보드 페이지 로드 검증
 *
 * @param page - Playwright Page 객체
 */
export async function assertDashboardLoaded(page: Page): Promise<void> {
  // 1. URL 확인
  expect(page.url()).toContain('/dashboard');

  // 2. 페이지 로딩 완료
  await page.waitForLoadState('networkidle');

  // 3. 주요 요소 존재 확인
  await expect(
    page.locator('h1, h2').first()
  ).toBeVisible({ timeout: 5000 });

  // 4. "새 분석하기" 버튼 존재
  await expect(
    page.locator('button:has-text("새 분석"), a:has-text("새 분석")').first()
  ).toBeVisible({ timeout: 5000 });

  // 5. 사용자 정보 또는 프로필 존재
  await expect(
    page.locator('[data-testid="user-profile"], .user-info, [data-testid="user-button"]').first()
  ).toBeVisible({ timeout: 5000 });
}

/**
 * 분석 폼 표시 검증
 *
 * @param page - Playwright Page 객체
 */
export async function assertAnalysisFormVisible(page: Page): Promise<void> {
  // 1. URL 확인
  expect(page.url()).toContain('/new-analysis');

  // 2. 폼 요소 존재
  await expect(page.locator('form').first()).toBeVisible({ timeout: 5000 });

  // 3. 필수 입력 필드 존재
  await expect(
    page.locator('input[name="name"], input[id="name"]').first()
  ).toBeVisible();

  await expect(
    page.locator('input[name="birthDate"], input[type="date"]').first()
  ).toBeVisible();

  await expect(
    page.locator('input[type="radio"]').first()
  ).toBeVisible();

  // 4. 제출 버튼 존재
  await expect(
    page.locator('button[type="submit"], button:has-text("분석")').first()
  ).toBeVisible();
}

/**
 * 분석 결과 표시 검증
 *
 * @param page - Playwright Page 객체
 */
export async function assertAnalysisResultVisible(page: Page): Promise<void> {
  // 1. URL 패턴 확인
  expect(page.url()).toMatch(/\/analysis\/[a-zA-Z0-9-]+/);

  // 2. 페이지 로딩 완료
  await page.waitForLoadState('networkidle');

  // 3. 분석 결과 컨테이너 존재
  await expect(
    page.locator('[data-testid="analysis-result"], .analysis-content, .result-container').first()
  ).toBeVisible({ timeout: 10000 });

  // 4. 기본 정보 표시 확인
  const hasBasicInfo = await page
    .locator(':has-text("성함"), :has-text("생년월일"), :has-text("성별")')
    .first()
    .isVisible()
    .catch(() => false);

  if (!hasBasicInfo) {
    throw new Error('분석 기본 정보가 표시되지 않음');
  }

  // 5. 분석 내용 존재 (텍스트 길이 체크)
  const resultText = await page
    .locator('[data-testid="analysis-result"], .analysis-content')
    .first()
    .textContent();

  if (!resultText || resultText.length < 100) {
    throw new Error('분석 결과 내용이 충분하지 않음');
  }
}

/**
 * 에러 메시지 표시 검증
 *
 * @param page - Playwright Page 객체
 * @param message - 예상 에러 메시지 (부분 일치)
 */
export async function assertErrorMessage(
  page: Page,
  message: string
): Promise<void> {
  const errorElement = page.locator(
    `[data-testid="error"], .error-message, .alert-error, :has-text("${message}")`
  ).first();

  await expect(errorElement).toBeVisible({ timeout: 5000 });
}

/**
 * 성공 메시지/토스트 표시 검증
 *
 * @param page - Playwright Page 객체
 * @param message - 예상 성공 메시지 (부분 일치)
 */
export async function assertSuccessMessage(
  page: Page,
  message: string
): Promise<void> {
  const successElement = page.locator(
    `[data-testid="success"], .success-message, .alert-success, .toast:has-text("${message}")`
  ).first();

  await expect(successElement).toBeVisible({ timeout: 5000 });
}

/**
 * 로딩 상태 확인
 *
 * @param page - Playwright Page 객체
 */
export async function assertLoadingState(page: Page): Promise<void> {
  const loadingElement = page.locator(
    '[data-testid="loading"], .loading-spinner, .spinner, :has-text("로딩"), :has-text("처리")'
  ).first();

  await expect(loadingElement).toBeVisible({ timeout: 5000 });
}

/**
 * 특정 URL로 리다이렉트 확인
 *
 * @param page - Playwright Page 객체
 * @param expectedPath - 예상 경로 (예: '/dashboard')
 * @param timeout - 최대 대기 시간
 */
export async function assertRedirectedTo(
  page: Page,
  expectedPath: string,
  timeout: number = 10000
): Promise<void> {
  await page.waitForURL(`**${expectedPath}`, { timeout });
  expect(page.url()).toContain(expectedPath);
}

/**
 * HTTP 에러 없음 확인
 *
 * @param page - Playwright Page 객체
 * @param errorCodes - 확인할 에러 코드 배열 (기본: [401, 403, 404, 500])
 */
export async function assertNoHttpErrors(
  page: Page,
  errorCodes: number[] = [401, 403, 404, 500]
): Promise<void> {
  // 페이지 리로드하여 네트워크 요청 확인
  const response = await page.reload();

  if (response && errorCodes.includes(response.status())) {
    throw new Error(`HTTP error detected: ${response.status()}`);
  }

  // 추가: 콘솔 에러 확인
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  await page.waitForTimeout(1000);

  if (errors.length > 0) {
    console.warn('Console errors detected:', errors);
  }
}

/**
 * 사용자 인증 상태 확인
 *
 * @param page - Playwright Page 객체
 */
export async function assertAuthenticated(page: Page): Promise<void> {
  // 사용자 버튼 또는 프로필 메뉴 존재 확인
  const userButton = page.locator(
    '[data-testid="user-button"], .cl-userButtonTrigger, .user-profile'
  ).first();

  await expect(userButton).toBeVisible({ timeout: 5000 });
}

/**
 * 비인증 상태 확인
 *
 * @param page - Playwright Page 객체
 */
export async function assertNotAuthenticated(page: Page): Promise<void> {
  // 로그인/회원가입 버튼 존재 확인
  const loginButton = page.locator(
    'button:has-text("로그인"), a:has-text("로그인"), button:has-text("Sign in")'
  ).first();

  await expect(loginButton).toBeVisible({ timeout: 5000 });
}

/**
 * 구독 상태 배지 확인
 *
 * @param page - Playwright Page 객체
 * @param tier - 예상 구독 등급 ('free' | 'pro')
 */
export async function assertSubscriptionTier(
  page: Page,
  tier: 'free' | 'pro'
): Promise<void> {
  const tierText = tier === 'pro' ? 'Pro' : '무료';
  const badge = page.locator(
    `[data-testid="subscription-badge"]:has-text("${tierText}"), .badge:has-text("${tierText}")`
  ).first();

  await expect(badge).toBeVisible({ timeout: 5000 });
}

/**
 * 모달 다이얼로그 표시 확인
 *
 * @param page - Playwright Page 객체
 * @param title - 모달 제목 (부분 일치)
 */
export async function assertModalVisible(
  page: Page,
  title: string
): Promise<void> {
  const modal = page.locator(
    `[role="dialog"]:has-text("${title}"), .modal:has-text("${title}")`
  ).first();

  await expect(modal).toBeVisible({ timeout: 5000 });
}

/**
 * 분석 카드가 대시보드에 존재하는지 확인
 *
 * @param page - Playwright Page 객체
 * @param name - 분석 대상 이름
 */
export async function assertAnalysisCardExists(
  page: Page,
  name: string
): Promise<void> {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  const card = page.locator(
    `[data-testid="analysis-card"]:has-text("${name}"), .analysis-card:has-text("${name}")`
  ).first();

  await expect(card).toBeVisible({ timeout: 10000 });
}
