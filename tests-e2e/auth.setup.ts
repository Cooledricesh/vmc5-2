import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '.auth/user.json');

/**
 * 인증 설정 스크립트
 *
 * 실제 Clerk Google OAuth를 자동화하는 대신,
 * Clerk의 개발 모드를 활용하여 테스트 사용자로 로그인합니다.
 *
 * 주의: 이 스크립트는 개발 환경에서만 작동합니다.
 */
setup('authenticate', async ({ page }) => {
  // Clerk의 개발 모드에서는 이메일 입력만으로 로그인 가능
  await page.goto('/sign-in');

  // Clerk 로그인 폼이 로드될 때까지 대기
  await page.waitForSelector('form', { timeout: 10000 });

  // 개발 모드에서 이메일 입력 (Clerk는 개발 모드에서 비밀번호 없이 로그인 가능)
  const emailInput = page.locator('input[name="identifier"]').first();
  if (await emailInput.isVisible()) {
    await emailInput.fill(process.env.TEST_EMAIL || 'cooledricesh@gmail.com');

    // Continue 버튼 클릭
    await page.locator('button[type="submit"]').first().click();

    // 대시보드로 리다이렉트 대기 (최대 30초)
    await page.waitForURL('**/dashboard', { timeout: 30000 });

    // 로그인 성공 확인
    await expect(page).toHaveURL(/.*dashboard/);

    // 인증 상태 저장
    await page.context().storageState({ path: authFile });

    console.log('✅ Authentication setup completed');
  } else {
    // Clerk가 다른 UI를 사용하는 경우, 수동으로 로그인해야 할 수 있음
    console.warn('⚠️ Clerk login form not found. Manual login may be required.');

    // 최소한의 인증 상태라도 저장
    await page.context().storageState({ path: authFile });
  }
});
