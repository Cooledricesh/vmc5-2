# Clerk 환경 변수 설정 가이드

## 🔐 Vercel 배포 환경에서 Clerk Production Keys 설정하기

### 1. Clerk Dashboard에서 Production Keys 가져오기

1. [Clerk Dashboard](https://dashboard.clerk.com)에 로그인
2. 프로젝트 선택 또는 새 프로젝트 생성
3. **API Keys** 섹션으로 이동
4. **Production** 탭 선택
5. 다음 키들을 복사:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (pk_live_로 시작)
   - `CLERK_SECRET_KEY` (sk_live_로 시작)

### 2. Vercel 환경 변수 설정

1. [Vercel Dashboard](https://vercel.com)에 로그인
2. 프로젝트 선택
3. **Settings** → **Environment Variables** 로 이동
4. 다음 환경 변수를 추가:

```bash
# Clerk 필수 환경 변수
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxx

# Clerk 라우트 설정 (선택사항 - 기본값 사용 가능)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### 3. 로컬 개발 환경 설정 (.env.local)

```bash
# Development Keys (개발용)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# 라우트 설정
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### 4. 배포 후 확인 사항

✅ **체크리스트:**
- [ ] Production keys가 Vercel 환경 변수에 설정되었는지 확인
- [ ] 배포 후 브라우저 콘솔에 "development keys" 경고가 없는지 확인
- [ ] `/sign-up` 페이지가 404 없이 정상 로드되는지 확인
- [ ] `/sign-in` 페이지가 404 없이 정상 로드되는지 확인
- [ ] 회원가입/로그인 후 `/dashboard`로 리다이렉트되는지 확인

### 5. 문제 해결

#### 문제: "Clerk has been loaded with development keys" 경고
**해결:** Vercel 환경 변수에 Production keys가 제대로 설정되었는지 확인

#### 문제: 404 Not Found on /sign-up or /sign-in
**해결:**
1. 페이지 파일이 올바른 경로에 있는지 확인: `src/app/sign-up/[[...sign-up]]/page.tsx`
2. middleware.ts가 올바르게 설정되었는지 확인
3. Vercel에서 재배포 실행

#### 문제: "afterSignInUrl is deprecated" 경고
**해결:** 이미 수정됨 - `fallbackRedirectUrl` 사용 중

### 6. Clerk와 Supabase 마이그레이션 계획

현재 프로젝트는 Clerk와 Supabase 인증이 혼재되어 있습니다.
점진적으로 Clerk로 통합하는 것을 권장합니다:

1. **현재 상태:**
   - `/sign-up`, `/sign-in` - Clerk 사용 ✅
   - `/signup`, `/login` - Supabase 사용 (추후 제거 예정)

2. **다음 단계:**
   - Supabase 인증 관련 코드를 Clerk로 마이그레이션
   - `/signup`, `/login` 페이지 제거
   - Supabase는 데이터베이스 용도로만 사용

### 7. 추가 리소스

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Next.js Quickstart](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk Production Deployment](https://clerk.com/docs/deployments/overview)