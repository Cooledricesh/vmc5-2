/**
 * 수동 인증 상태 저장 스크립트
 *
 * 사용법:
 * 1. 개발 서버 실행: npm run dev
 * 2. 이 스크립트 실행: node tests-e2e/save-auth.js
 * 3. 열리는 브라우저에서 수동으로 로그인
 * 4. 대시보드 페이지로 이동되면 자동으로 인증 상태 저장
 */

const { chromium } = require('@playwright/test');
const path = require('path');

(async () => {
  console.log('🚀 브라우저를 실행합니다...');
  console.log('📝 다음 단계를 따라주세요:');
  console.log('   1. 로그인 페이지에서 Google 계정으로 로그인');
  console.log('   2. 대시보드 페이지로 이동될 때까지 대기');
  console.log('   3. 대시보드에서 아무 키나 누르면 인증 상태가 저장됩니다');
  console.log('');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 로그인 페이지로 이동 (프로덕션 환경 사용)
  await page.goto('https://vmc5-2.vercel.app/sign-in');

  console.log('⏳ 수동 로그인을 기다리는 중...');
  console.log('   (대시보드 페이지로 이동하면 계속됩니다)');

  // 대시보드로 이동할 때까지 대기 (최대 5분)
  try {
    await page.waitForURL('**/dashboard', { timeout: 300000 });
    console.log('✅ 로그인 성공! 대시보드 페이지 감지됨');

    // 3초 대기 (페이지가 완전히 로드되도록)
    await page.waitForTimeout(3000);

    // 인증 상태 저장
    const authFile = path.join(__dirname, '.auth', 'user.json');
    await context.storageState({ path: authFile });

    console.log('');
    console.log('✅ 인증 상태가 저장되었습니다!');
    console.log(`   파일 위치: ${authFile}`);
    console.log('');
    console.log('🎉 이제 E2E 테스트를 실행할 수 있습니다:');
    console.log('   npm run test:e2e');
    console.log('');

  } catch (error) {
    console.error('❌ 타임아웃: 5분 내에 로그인하지 못했습니다.');
    console.error('   다시 시도해주세요.');
  }

  await browser.close();
  process.exit(0);
})();
