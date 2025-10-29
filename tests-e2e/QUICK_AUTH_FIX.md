# 빠른 인증 설정 방법

## Clerk OAuth 문제 우회 방법

### 1단계: 일반 브라우저에서 로그인

1. 크롬/사파리 등에서 **시크릿 모드**로 열기
2. `https://vmc5-2.vercel.app/sign-in` 접속
3. Google 계정 `cooledricesh@gmail.com`으로 로그인
4. 대시보드가 정상적으로 열리는지 확인

### 2단계: Playwright에서 인증 상태 캡처

터미널에서 다음 명령 실행:

```bash
npx playwright codegen https://vmc5-2.vercel.app/dashboard --save-storage=tests-e2e/.auth/user.json
```

**중요**:
- 브라우저가 열리면 **자동으로 로그인 페이지로 리다이렉트**됩니다
- 수동으로 Google 로그인을 완료하세요
- 대시보드가 로드되면 **브라우저를 닫으세요**
- 인증 상태가 `tests-e2e/.auth/user.json`에 자동 저장됩니다

### 3단계: 파일 확인

```bash
ls -la tests-e2e/.auth/user.json
```

파일이 존재하면 성공!

### 4단계: E2E 테스트 실행

```bash
npm run test:e2e
```

## 대안 방법: 수동으로 JSON 파일 생성

만약 위 방법이 안 되면, 브라우저 개발자 도구에서 쿠키를 추출하여 수동으로 JSON 파일 생성:

1. 프로덕션 사이트에 로그인
2. F12 → Application → Cookies 확인
3. `__clerk_db_jwt`, `__session` 등의 쿠키 값 복사
4. `tests-e2e/.auth/user.json` 수동 작성

## 가장 쉬운 방법: 이미 로그인된 브라우저 활용

실제 브라우저에서 이미 로그인되어 있다면:

```bash
# Chrome 프로필 경로 사용
npx playwright codegen --load-storage=/path/to/chrome/profile https://vmc5-2.vercel.app
```
