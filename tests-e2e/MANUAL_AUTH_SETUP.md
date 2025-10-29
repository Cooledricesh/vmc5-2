# 수동 인증 설정 가이드

## 문제점

Clerk의 Google OAuth를 자동화하기 어렵기 때문에, 수동으로 인증 상태를 생성해야 합니다.

## 해결 방법

### 1단계: 개발 서버 실행

```bash
npm run dev
```

서버가 `http://localhost:3000`에서 실행되는지 확인합니다.

### 2단계: Playwright Codegen으로 로그인

새 터미널에서 다음 명령 실행:

```bash
npx playwright codegen http://localhost:3000
```

### 3단계: 수동 로그인 수행

1. 브라우저가 열리면 `/sign-in` 페이지로 이동
2. Google 계정으로 로그인: `cooledricesh@gmail.com`
3. 로그인 성공 후 대시보드 페이지(`/dashboard`)로 이동되는지 확인
4. 대시보드에서 사용자 정보가 표시되는지 확인

### 4단계: 인증 상태 저장

Codegen 창 하단의 "Record" 버튼 옆에 있는 "Source" 탭에서 생성된 코드를 확인합니다.

수동으로 인증 상태를 저장하려면, 브라우저 개발자 도구에서:

```javascript
// Console에서 실행
await context.storageState({ path: 'tests-e2e/.auth/user.json' });
```

또는 더 간단한 방법:

### 대안: 간단한 스크립트 실행

다음 스크립트를 실행하여 수동으로 인증 상태를 저장:

```bash
node tests-e2e/save-auth.js
```

## 5단계: auth.setup.ts 비활성화

인증 상태 파일이 생성되면, `auth.setup.ts`를 건너뛰도록 설정:

**playwright.config.ts 수정**:
```typescript
projects: [
  // setup 프로젝트 주석 처리
  // {
  //   name: 'setup',
  //   testMatch: /.*\.setup\.ts/,
  // },
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'tests-e2e/.auth/user.json',
    },
    // dependencies: ['setup'], // 주석 처리
  },
]
```

## 6단계: 테스트 실행

```bash
npm run test:e2e
```

## 주의사항

- `tests-e2e/.auth/user.json` 파일은 `.gitignore`에 포함되어 있어 커밋되지 않습니다
- 세션이 만료되면 이 과정을 다시 반복해야 합니다
- CI/CD 환경에서는 별도의 인증 전략이 필요합니다
