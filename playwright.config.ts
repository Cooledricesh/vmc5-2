import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests-e2e',
  fullyParallel: false, // 인증 테스트는 순차 실행
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    // 로컬 개발: http://localhost:3000
    // 프로덕션 (OAuth 테스트용): https://vmc5-2.vercel.app
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    // 인증 설정 프로젝트 (수동 인증으로 대체)
    // {
    //   name: 'setup',
    //   testMatch: /.*\.setup\.ts/,
    // },
    // 실제 테스트 프로젝트
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // 인증 상태 저장 파일 사용 (수동으로 생성)
        storageState: 'tests-e2e/.auth/user.json',
      },
      // dependencies: ['setup'], // 수동 인증 사용
    },
  ],
  // 프로덕션 환경 테스트 시 webServer 불필요
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
});