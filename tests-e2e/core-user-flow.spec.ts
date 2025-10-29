/**
 * 핵심 유저플로우 E2E 테스트
 *
 * TDD 방식으로 작성된 사주풀이 서비스의 핵심 기능 테스트
 * RED → GREEN → REFACTOR 사이클을 따릅니다.
 *
 * 테스트 시나리오:
 * 1. 로그인 플로우
 * 2. 사주 분석 의뢰 플로우
 * 3. 분석 결과 확인 플로우
 */

import { test, expect } from '@playwright/test';
import {
  loginWithGoogle,
  logout,
  ensureAuthenticated,
} from './helpers/auth.helper';
import {
  createNewAnalysis,
  waitForAnalysisComplete,
  navigateToAnalysis,
  openAnalysisFromDashboard,
  getRemainingAnalysisCount,
  type AnalysisData,
} from './helpers/analysis.helper';
import {
  assertDashboardLoaded,
  assertAnalysisFormVisible,
  assertAnalysisResultVisible,
  assertErrorMessage,
  assertAuthenticated,
  assertNotAuthenticated,
  assertNoHttpErrors,
  assertAnalysisCardExists,
} from './helpers/assertions.helper';

// 테스트 계정 정보
const TEST_EMAIL = 'cooledricesh@gmail.com';

// 테스트 데이터
const TEST_ANALYSIS_DATA: AnalysisData = {
  name: '테스트홍길동',
  birthDate: '1990-05-15',
  birthTime: '10:30',
  gender: 'male',
};

/**
 * ======================
 * 1. 로그인 플로우 테스트
 * ======================
 */
test.describe('1. 로그인 플로우', () => {
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 로그아웃 상태 보장
    await page.goto('/');
    await logout(page).catch(() => {
      // 이미 로그아웃 상태면 무시
    });
  });

  /**
   * RED Phase: 이 테스트는 처음에는 실패해야 합니다.
   * 로그인 기능이 제대로 구현되어 있지 않거나, UI 요소가 없으면 실패합니다.
   */
  test('1-1. Google OAuth를 통한 로그인 성공', async ({ page }) => {
    // Given: 사용자가 로그아웃 상태
    await assertNotAuthenticated(page);

    // When: 로그인 프로세스 실행
    // 주의: 실제 Google OAuth는 자동화하기 어려우므로
    // Clerk의 테스트 모드나 세션 주입을 사용해야 할 수 있습니다.
    await loginWithGoogle(page, {
      email: TEST_EMAIL,
      waitForDashboard: true,
    });

    // Then: 대시보드로 리다이렉트 및 인증 상태 확인
    await assertDashboardLoaded(page);
    await assertAuthenticated(page);
    await assertNoHttpErrors(page, [401, 403]);

    // 사용자 정보 표시 확인
    const userEmail = await page
      .locator('[data-testid="user-email"], .user-email')
      .textContent()
      .catch(() => null);

    // 이메일 또는 사용자 이름이 표시되어야 함
    if (userEmail) {
      expect(userEmail).toContain(TEST_EMAIL.split('@')[0]);
    }

    // 구독 상태 및 잔여 횟수 표시 확인
    const subscriptionInfo = page.locator(
      '[data-testid="subscription-info"], .subscription-status'
    ).first();
    await expect(subscriptionInfo).toBeVisible({ timeout: 5000 });
  });

  test('1-2. 로그인 후 페이지 새로고침 시 세션 유지', async ({ page }) => {
    // Given: 로그인된 상태
    await loginWithGoogle(page, {
      email: TEST_EMAIL,
      waitForDashboard: true,
    });
    await assertDashboardLoaded(page);

    // When: 페이지 새로고침
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Then: 여전히 인증 상태 유지
    await assertDashboardLoaded(page);
    await assertAuthenticated(page);
    await assertNoHttpErrors(page, [401, 403]);
  });

  test('1-3. 로그아웃 성공', async ({ page }) => {
    // Given: 로그인된 상태
    await loginWithGoogle(page, {
      email: TEST_EMAIL,
      waitForDashboard: true,
    });
    await assertAuthenticated(page);

    // When: 로그아웃 실행
    await logout(page);

    // Then: 홈페이지로 리다이렉트 및 비인증 상태 확인
    expect(page.url()).toContain('/');
    await assertNotAuthenticated(page);
  });
});

/**
 * ==================================
 * 2. 사주 분석 의뢰 플로우 테스트
 * ==================================
 */
test.describe('2. 사주 분석 의뢰 플로우', () => {
  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 로그인 상태 보장
    await ensureAuthenticated(page, TEST_EMAIL);
  });

  /**
   * RED Phase: 분석 생성 기능이 없으면 실패
   */
  test('2-1. 새 사주 분석 요청 성공', async ({ page }) => {
    // Given: 로그인 상태 및 대시보드에 위치
    await assertDashboardLoaded(page);

    // 초기 잔여 횟수 확인
    const initialCount = await getRemainingAnalysisCount(page).catch(() => null);

    // When: 새 분석하기 버튼 클릭
    const newAnalysisButton = page.locator(
      'button:has-text("새 분석"), a:has-text("새 분석")'
    ).first();
    await newAnalysisButton.click();

    // 분석 폼 페이지 로드 확인
    await assertAnalysisFormVisible(page);

    // 분석 정보 입력 및 제출
    const analysisId = await createNewAnalysis(page, TEST_ANALYSIS_DATA);

    // Then: 분석 상세 페이지로 리다이렉트
    expect(analysisId).toBeTruthy();
    expect(page.url()).toContain(`/analysis/${analysisId}`);

    // 로딩 상태 또는 결과 표시 확인
    const isLoading = await page
      .locator('[data-testid="loading"], :has-text("분석 중")')
      .isVisible()
      .catch(() => false);

    const hasResult = await page
      .locator('[data-testid="analysis-result"]')
      .isVisible()
      .catch(() => false);

    expect(isLoading || hasResult).toBeTruthy();

    // 분석 완료 대기 (최대 60초)
    if (isLoading) {
      await waitForAnalysisComplete(page, analysisId, 60000);
    }

    // 분석 결과 표시 확인
    await assertAnalysisResultVisible(page);

    // 대시보드로 돌아가서 잔여 횟수 감소 확인
    if (initialCount !== null) {
      await page.goto('/dashboard');
      const newCount = await getRemainingAnalysisCount(page);
      expect(newCount).toBe(initialCount - 1);
    }
  });

  test('2-2. 필수 필드 미입력 시 유효성 검증', async ({ page }) => {
    // Given: 새 분석 페이지
    await page.goto('/new-analysis');
    await assertAnalysisFormVisible(page);

    // When: 필수 필드를 비우고 제출
    const submitButton = page.locator(
      'button[type="submit"], button:has-text("분석")'
    ).first();
    await submitButton.click();

    // Then: 유효성 검증 에러 메시지 표시
    // 최소 하나의 에러 메시지가 표시되어야 함
    const errorMessages = page.locator(
      '[data-testid="error"], .error-message, .text-red-500, [role="alert"]'
    );

    const errorCount = await errorMessages.count();
    expect(errorCount).toBeGreaterThan(0);

    // 페이지가 그대로 유지됨
    expect(page.url()).toContain('/new-analysis');
  });

  test('2-3. 생년월일 유효성 검증 (미래 날짜 불가)', async ({ page }) => {
    // Given: 새 분석 페이지
    await page.goto('/new-analysis');
    await assertAnalysisFormVisible(page);

    // When: 미래 날짜 입력
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const futureDate = tomorrow.toISOString().split('T')[0];

    const birthDateInput = page.locator(
      'input[name="birthDate"], input[type="date"]'
    ).first();
    await birthDateInput.fill(futureDate);

    const submitButton = page.locator(
      'button[type="submit"], button:has-text("분석")'
    ).first();
    await submitButton.click();

    // Then: 에러 메시지 표시
    await assertErrorMessage(page, '날짜');
  });
});

/**
 * ==================================
 * 3. 분석 결과 확인 플로우 테스트
 * ==================================
 */
test.describe('3. 분석 결과 확인 플로우', () => {
  let analysisId: string;

  test.beforeAll(async () => {
    // 테스트용 분석 데이터 생성 (한 번만)
    // 실제로는 beforeAll에서 Playwright 페이지를 사용할 수 없으므로
    // 첫 테스트에서 생성하거나 API로 사전 생성 필요
  });

  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 로그인 상태 보장
    await ensureAuthenticated(page, TEST_EMAIL);
  });

  test('3-1. 대시보드에서 분석 결과 카드 클릭하여 상세 조회', async ({
    page,
  }) => {
    // Given: 완료된 분석이 존재
    // 먼저 분석 생성
    await page.goto('/new-analysis');
    analysisId = await createNewAnalysis(page, {
      ...TEST_ANALYSIS_DATA,
      name: '대시보드테스트',
    });
    await waitForAnalysisComplete(page, analysisId, 60000);

    // When: 대시보드로 이동하여 분석 카드 클릭
    await page.goto('/dashboard');
    await assertDashboardLoaded(page);

    await assertAnalysisCardExists(page, '대시보드테스트');

    const analysisCard = page.locator(
      '[data-testid="analysis-card"]:has-text("대시보드테스트")'
    ).first();
    await analysisCard.click();

    // Then: 분석 상세 페이지 로드
    expect(page.url()).toContain(`/analysis/${analysisId}`);
    await assertAnalysisResultVisible(page);
    await assertNoHttpErrors(page);
  });

  test('3-2. 분석 결과 페이지에서 기본 정보 표시 확인', async ({ page }) => {
    // Given: 분석 ID가 있음 (이전 테스트에서 생성)
    if (!analysisId) {
      await page.goto('/new-analysis');
      analysisId = await createNewAnalysis(page, TEST_ANALYSIS_DATA);
      await waitForAnalysisComplete(page, analysisId, 60000);
    }

    // When: 분석 상세 페이지 접근
    await navigateToAnalysis(page, analysisId);

    // Then: 기본 정보 모두 표시
    await assertAnalysisResultVisible(page);

    // 성함 표시
    await expect(page.locator(`:has-text("${TEST_ANALYSIS_DATA.name}")`).first()).toBeVisible();

    // 생년월일 표시
    const birthDateText = page.locator(':has-text("1990")').first();
    await expect(birthDateText).toBeVisible();

    // 성별 표시
    const genderText = page.locator(':has-text("남"), :has-text("male")').first();
    await expect(genderText).toBeVisible();
  });

  test('3-3. 분석 결과에 필수 섹션 포함 확인', async ({ page }) => {
    // Given: 완료된 분석
    if (!analysisId) {
      await page.goto('/new-analysis');
      analysisId = await createNewAnalysis(page, TEST_ANALYSIS_DATA);
      await waitForAnalysisComplete(page, analysisId, 60000);
    }

    // When: 분석 상세 페이지 접근
    await navigateToAnalysis(page, analysisId);
    await assertAnalysisResultVisible(page);

    // Then: 필수 섹션 존재 확인
    // 천간지지
    const cheonganjijiSection = page.locator(
      ':has-text("천간"), :has-text("지지"), :has-text("사주")'
    ).first();
    await expect(cheonganjijiSection).toBeVisible({ timeout: 10000 });

    // 오행
    const ohyeongSection = page.locator(
      ':has-text("오행"), :has-text("목화토금수")'
    ).first();
    await expect(ohyeongSection).toBeVisible({ timeout: 10000 });

    // 종합 해석
    const interpretationSection = page.locator(
      ':has-text("해석"), :has-text("분석"), :has-text("성격")'
    ).first();
    await expect(interpretationSection).toBeVisible({ timeout: 10000 });
  });
});

/**
 * ======================
 * 4. 엣지케이스 테스트
 * ======================
 */
test.describe('4. 엣지케이스', () => {
  test.beforeEach(async ({ page }) => {
    await ensureAuthenticated(page, TEST_EMAIL);
  });

  test('4-1. 존재하지 않는 분석 ID 접근 시 404 처리', async ({ page }) => {
    // When: 존재하지 않는 분석 ID로 접근
    const fakeId = 'non-existent-analysis-id-12345';
    const response = await page.goto(`/analysis/${fakeId}`);

    // Then: 404 에러 또는 에러 페이지 표시
    if (response) {
      const status = response.status();
      expect([404, 403]).toContain(status);
    }

    // 에러 메시지 확인
    const errorIndicator = page.locator(
      ':has-text("찾을 수 없"), :has-text("존재하지"), :has-text("404")'
    ).first();
    await expect(errorIndicator).toBeVisible({ timeout: 5000 });
  });

  test('4-2. 비로그인 상태에서 대시보드 접근 시 로그인 페이지로 리다이렉트', async ({
    page,
  }) => {
    // Given: 로그아웃 상태
    await logout(page);

    // When: 대시보드 접근 시도
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Then: 로그인 페이지로 리다이렉트
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/sign-in|login/i);
  });

  test('4-3. 비로그인 상태에서 분석 생성 시도 시 차단', async ({ page }) => {
    // Given: 로그아웃 상태
    await logout(page);

    // When: 새 분석 페이지 접근 시도
    await page.goto('/new-analysis');
    await page.waitForLoadState('networkidle');

    // Then: 로그인 페이지로 리다이렉트 또는 접근 차단
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/sign-in|login|unauthorized/i);
  });
});
