import { Page, expect } from '@playwright/test';

/**
 * 사주 분석 관련 헬퍼 함수
 */

export interface AnalysisData {
  name: string;
  birthDate: string; // YYYY-MM-DD
  birthTime?: string; // HH:mm
  gender: 'male' | 'female';
}

/**
 * 새 사주 분석 생성
 *
 * @param page - Playwright Page 객체
 * @param data - 분석 데이터
 * @returns 생성된 분석 ID (URL에서 추출)
 */
export async function createNewAnalysis(
  page: Page,
  data: AnalysisData
): Promise<string> {
  // 1. "새 분석하기" 페이지로 이동
  await page.goto('/new-analysis');
  await page.waitForLoadState('networkidle');

  // 2. 폼이 로드될 때까지 대기
  await page.waitForSelector('form', { timeout: 5000 });

  // 3. 성함 입력
  const nameInput = page.locator('input[name="name"], input[id="name"]').first();
  await nameInput.fill(data.name);

  // 4. 생년월일 입력
  const birthDateInput = page.locator(
    'input[name="birthDate"], input[type="date"], input[id="birthDate"]'
  ).first();
  await birthDateInput.fill(data.birthDate);

  // 5. 출생시간 입력 (선택사항)
  if (data.birthTime) {
    const birthTimeInput = page.locator(
      'input[name="birthTime"], input[type="time"], input[id="birthTime"]'
    ).first();
    await birthTimeInput.fill(data.birthTime);
  }

  // 6. 성별 선택
  const genderValue = data.gender === 'male' ? '남' : '여';
  const genderRadio = page.locator(
    `input[type="radio"][value="${data.gender}"], input[type="radio"]:has-text("${genderValue}")`
  ).first();
  await genderRadio.check();

  // 7. "분석 시작" 버튼 클릭
  const submitButton = page.locator(
    'button[type="submit"], button:has-text("분석 시작")'
  ).first();
  await submitButton.click();

  // 8. 로딩 상태 확인
  await page.waitForSelector(
    '[data-testid="loading"], .loading-spinner, :has-text("분석 중")',
    { timeout: 5000 }
  );

  // 9. 분석 상세 페이지로 리다이렉트 대기
  await page.waitForURL('**/analysis/**', { timeout: 60000 });

  // 10. URL에서 분석 ID 추출
  const url = page.url();
  const analysisId = url.split('/analysis/')[1]?.split('?')[0] || '';

  if (!analysisId) {
    throw new Error('Failed to extract analysis ID from URL');
  }

  return analysisId;
}

/**
 * 분석 완료 대기
 *
 * @param page - Playwright Page 객체
 * @param analysisId - 분석 ID
 * @param timeout - 최대 대기 시간 (밀리초)
 */
export async function waitForAnalysisComplete(
  page: Page,
  analysisId: string,
  timeout: number = 60000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // 현재 페이지가 해당 분석 페이지가 아니면 이동
    if (!page.url().includes(`/analysis/${analysisId}`)) {
      await page.goto(`/analysis/${analysisId}`);
      await page.waitForLoadState('networkidle');
    }

    // 로딩 상태 확인
    const isLoading = await page
      .locator('[data-testid="loading"], .loading-spinner, :has-text("분석 중")')
      .isVisible()
      .catch(() => false);

    if (!isLoading) {
      // 분석 결과가 표시되는지 확인
      const hasResult = await page
        .locator('[data-testid="analysis-result"], .analysis-content')
        .isVisible()
        .catch(() => false);

      if (hasResult) {
        // 완료됨
        return;
      }
    }

    // 2초 대기 후 재확인
    await page.waitForTimeout(2000);
  }

  throw new Error(`Analysis did not complete within ${timeout}ms`);
}

/**
 * 분석 상세 페이지로 이동
 *
 * @param page - Playwright Page 객체
 * @param analysisId - 분석 ID
 */
export async function navigateToAnalysis(
  page: Page,
  analysisId: string
): Promise<void> {
  await page.goto(`/analysis/${analysisId}`);
  await page.waitForLoadState('networkidle');
}

/**
 * 대시보드에서 특정 분석 찾기 및 클릭
 *
 * @param page - Playwright Page 객체
 * @param name - 분석 대상 이름
 */
export async function openAnalysisFromDashboard(
  page: Page,
  name: string
): Promise<void> {
  // 대시보드로 이동
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  // 분석 카드 찾기
  const analysisCard = page.locator(
    `[data-testid="analysis-card"]:has-text("${name}"), .analysis-card:has-text("${name}")`
  ).first();

  await expect(analysisCard).toBeVisible({ timeout: 10000 });
  await analysisCard.click();

  // 분석 상세 페이지 로드 대기
  await page.waitForURL('**/analysis/**', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

/**
 * 분석 폼 유효성 검증 테스트
 *
 * @param page - Playwright Page 객체
 * @param fieldName - 검증할 필드 이름
 */
export async function triggerValidationError(
  page: Page,
  fieldName: string
): Promise<void> {
  // 필드를 비우고 제출 시도
  const input = page.locator(`input[name="${fieldName}"], input[id="${fieldName}"]`).first();
  await input.fill('');
  await input.blur(); // 포커스 해제하여 유효성 검증 트리거

  const submitButton = page.locator(
    'button[type="submit"], button:has-text("분석 시작")'
  ).first();
  await submitButton.click();
}

/**
 * 분석 횟수 확인
 *
 * @param page - Playwright Page 객체
 * @returns 남은 분석 횟수
 */
export async function getRemainingAnalysisCount(page: Page): Promise<number> {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  // 잔여 횟수 텍스트 찾기 (예: "3/3", "2/10")
  const countText = await page
    .locator('[data-testid="remaining-count"], :has-text("남은 횟수")')
    .textContent();

  if (!countText) {
    throw new Error('Could not find remaining analysis count');
  }

  // 숫자 추출 (예: "2/10" -> 2)
  const match = countText.match(/(\d+)\s*\/\s*\d+/);
  if (!match) {
    throw new Error(`Could not parse remaining count from: ${countText}`);
  }

  return parseInt(match[1], 10);
}

/**
 * Pro 구독 모달 확인
 *
 * @param page - Playwright Page 객체
 */
export async function assertProSubscriptionModal(page: Page): Promise<void> {
  const modal = page.locator(
    '[data-testid="pro-modal"], .modal:has-text("Pro"), [role="dialog"]:has-text("구독")'
  ).first();

  await expect(modal).toBeVisible({ timeout: 5000 });

  // "Pro 구독하기" 버튼 확인
  const subscribeButton = page.locator('button:has-text("Pro"), button:has-text("구독")').first();
  await expect(subscribeButton).toBeVisible();
}
