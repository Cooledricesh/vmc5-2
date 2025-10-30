import { test, expect } from '@playwright/test';

/**
 * 간단한 인증 상태 테스트
 *
 * 목적: 인증 상태 파일(tests-e2e/.auth/user.json)이 제대로 로드되는지 확인
 */

test.describe('인증 상태 확인', () => {
  test('이미 로그인된 상태로 대시보드 접근 가능', async ({ page }) => {
    // 대시보드로 직접 이동
    await page.goto('/dashboard');

    // 페이지가 로드될 때까지 대기
    await page.waitForLoadState('networkidle');

    // URL이 대시보드인지 확인 (로그인 페이지로 리다이렉트되지 않았는지)
    expect(page.url()).toContain('/dashboard');

    // 대시보드 제목이 표시되는지 확인
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    console.log('✅ 인증 상태가 제대로 로드되었습니다!');
    console.log('현재 URL:', page.url());
  });

  test('새 분석 페이지 접근 가능', async ({ page }) => {
    // 새 분석 페이지로 직접 이동
    await page.goto('/analysis/new');

    // 페이지가 로드될 때까지 대기
    await page.waitForLoadState('networkidle');

    // URL 확인
    expect(page.url()).toContain('/analysis/new');

    // 폼이 표시되는지 확인
    const form = page.locator('form').first();
    await expect(form).toBeVisible({ timeout: 10000 });

    console.log('✅ 새 분석 페이지 접근 성공!');
  });
});
