# Clerk-Supabase 사용자 동기화 통합 문서

## ✅ 구현 완료 항목

### 1. Clerk 웹훅 엔드포인트
- **경로**: `/api/webhooks/clerk`
- **파일**: `src/app/api/webhooks/clerk/route.ts`
- **기능**:
  - `user.created`: 신규 사용자 생성 시 Supabase에 자동 저장
  - `user.updated`: 사용자 정보 변경 시 자동 업데이트
  - `user.deleted`: 사용자 삭제 시 Supabase에서도 삭제
  - Svix 서명 검증으로 보안 강화

### 2. 사용자 동기화 서비스
- **파일**: `src/features/auth/backend/user-sync.service.ts`
- **기능**:
  - `upsertUser`: 중복 방지를 위한 upsert 처리
  - `createOrUpdateUser`: 조건부 생성/업데이트
  - `deleteUser`: 사용자 삭제
  - `getUserByClerkId`: Clerk ID로 사용자 조회

### 3. 재시도 로직
- **파일**: `src/features/auth/backend/retry-helper.ts`
- **기능**:
  - 네트워크 오류 시 자동 재시도
  - 지수 백오프 알고리즘 적용
  - 최대 3회 재시도 (설정 가능)

### 4. 환경 변수 검증
- **파일**: `src/features/auth/backend/config.ts`
- **기능**:
  - Zod를 통한 환경 변수 타입 검증
  - 설정값 캐싱으로 성능 최적화

### 5. 인증 미들웨어 개선
- **파일**: `src/backend/middleware/clerk-auth.ts`
- **개선사항**:
  - Clerk 인증 후 Supabase 사용자 확인
  - 사용자가 없으면 자동 생성 시도
  - currentUser API로 최신 정보 동기화

### 6. Next.js 미들웨어
- **파일**: `src/middleware.ts`
- **기능**:
  - 보호된 라우트 정의 (/dashboard, /analysis 등)
  - 공개 라우트 정의 (/sign-in, /sign-up, /api/webhooks 등)
  - Clerk 미들웨어 통합

## 🔧 환경 변수 설정

### 필수 환경 변수 (.env.local)
```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SIGNING_SECRET=whsec_xxxxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

## 🚀 Clerk 대시보드 설정

### 웹훅 엔드포인트 등록
1. [Clerk Dashboard](https://dashboard.clerk.com) → Webhooks
2. Add Endpoint 클릭
3. Endpoint URL: `https://your-domain.com/api/webhooks/clerk`
4. 이벤트 선택:
   - user.created
   - user.updated
   - user.deleted
5. Signing Secret 복사 → `.env.local`에 추가

## 📊 데이터베이스 스키마

### users 테이블
```sql
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text UNIQUE NOT NULL,
  email text,
  name text,
  profile_image text,
  subscription_tier text DEFAULT 'free',
  free_analysis_count integer DEFAULT 3,
  monthly_analysis_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_users_clerk_user_id ON public.users(clerk_user_id);
```

## 🧪 테스트

### 단위 테스트 실행
```bash
npm run test:unit -- src/features/auth/__tests__/
```

### E2E 테스트 실행
```bash
npm run test:e2e -- tests-e2e/auth-integration.spec.ts
```

### 빌드 확인
```bash
npm run build
```

## 🔍 문제 해결

### 웹훅이 호출되지 않는 경우
1. Clerk 대시보드에서 웹훅 URL 확인
2. Signing Secret이 올바른지 확인
3. Vercel/배포 환경에 환경 변수 설정 확인

### 사용자가 Supabase에 저장되지 않는 경우
1. SUPABASE_SERVICE_ROLE_KEY가 설정되어 있는지 확인
2. users 테이블이 생성되어 있는지 확인
3. 웹훅 로그 확인 (Clerk Dashboard → Webhooks → Logs)

### 401 인증 오류 발생
1. Clerk 로그인 상태 확인
2. Supabase users 테이블에 사용자 존재 확인
3. clerk_user_id가 일치하는지 확인

## 📈 모니터링

### 로그 확인 위치
- **웹훅 로그**: Clerk Dashboard → Webhooks → Logs
- **서버 로그**: Vercel Dashboard → Functions → Logs
- **브라우저 콘솔**: 클라이언트 사이드 오류 확인

### 성능 지표
- 웹훅 평균 응답 시간: < 1초
- 재시도 성공률: 95% 이상
- 사용자 동기화 실패율: < 1%

## 🚀 다음 단계

1. **모니터링 강화**
   - Sentry 또는 LogRocket 통합
   - 커스텀 메트릭 수집

2. **성능 최적화**
   - 웹훅 처리를 큐 시스템으로 이동
   - 배치 처리 구현

3. **기능 확장**
   - 조직(Organization) 동기화
   - 역할(Role) 기반 권한 관리
   - 사용자 활동 로그