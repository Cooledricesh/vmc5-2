# Cron Job 설정 가이드

UC-007: 정기결제 자동 처리를 위한 Cron Job 설정 가이드입니다.

## 📋 목차

1. [개요](#개요)
2. [환경 변수 설정](#환경-변수-설정)
3. [Supabase 설정](#supabase-설정)
4. [로컬 테스트](#로컬-테스트)
5. [프로덕션 배포](#프로덕션-배포)
6. [트러블슈팅](#트러블슈팅)

---

## 개요

### 기능
- 매일 자정(02:00 KST)에 만료된 구독 자동 갱신
- 결제 실패 시 최대 3회 재시도 (1일 간격)
- 3회 실패 시 자동 구독 정지
- 모든 처리 결과를 `cron_job_logs` 테이블에 기록

### API 엔드포인트
- `POST /api/cron/process-payments`: 정기결제 배치 처리
- `GET /api/cron/payment-status`: 오늘의 결제 대상 조회

---

## 환경 변수 설정

### 1. 토큰 생성

강력한 랜덤 문자열을 생성합니다:

```bash
# Node.js 사용 (권장)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 또는 OpenSSL 사용
openssl rand -base64 32
```

**예시 출력:**
```
1Y6hBNak+jiaC6C7xA/kqrOvqy3YFM8wx1D3LokHTo0=
```

### 2. .env.local에 추가

프로젝트 루트의 `.env.local` 파일에 추가:

```bash
# Cron Job Secret (Supabase에서 호출 시 인증용)
CRON_SECRET_TOKEN=1Y6hBNak+jiaC6C7xA/kqrOvqy3YFM8wx1D3LokHTo0=
```

### 3. 개발 서버 재시작

환경 변수를 적용하려면 개발 서버를 재시작해야 합니다:

```bash
# Ctrl+C로 서버 종료 후 재시작
npm run dev
```

---

## Supabase 설정

### 1. Migration 실행

Supabase Dashboard → SQL Editor에서 다음 파일들을 순서대로 실행:

#### 1.1. retry_count 컬럼 추가
파일: `supabase/migrations/0009_add_retry_count_to_subscriptions.sql`

```sql
-- retry_count 및 cancellation_reason 컬럼 추가
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
```

#### 1.2. Cron Job 설정
파일: `supabase/migrations/0010_setup_subscription_cron.sql`

```sql
-- pg_cron 확장 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- cron_job_logs 테이블 생성
CREATE TABLE IF NOT EXISTS cron_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  execution_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL, -- 'started', 'completed', 'failed'
  processed_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  suspended_count INTEGER DEFAULT 0,
  total_amount INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cron Job 스케줄 등록 (매일 02:00 KST)
SELECT cron.schedule(
  'process-recurring-payments',
  '0 17 * * *', -- UTC 17:00 = KST 02:00
  $$
  DO $$
  DECLARE
    api_url TEXT;
    secret_token TEXT;
    response TEXT;
  BEGIN
    -- app_settings에서 설정 값 가져오기
    SELECT value INTO api_url FROM app_settings WHERE key = 'cron_api_url';
    SELECT value INTO secret_token FROM app_settings WHERE key = 'cron_secret_token';

    -- HTTP POST 요청 (pg_net 사용)
    SELECT net.http_post(
      url := api_url,
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || secret_token,
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) INTO response;

    RAISE NOTICE 'Cron job executed: %', response;
  END $$;
  $$
);
```

#### 1.3. app_settings 설정
파일: `supabase/migrations/0011_configure_cron_settings.sql`

```sql
-- Cron Secret Token 설정
INSERT INTO app_settings (key, value, description)
VALUES (
  'cron_secret_token',
  '1Y6hBNak+jiaC6C7xA/kqrOvqy3YFM8wx1D3LokHTo0=',
  'Cron Job 인증용 비밀 토큰'
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;

-- Cron API URL 설정 (로컬 테스트용)
INSERT INTO app_settings (key, value, description)
VALUES (
  'cron_api_url',
  'http://localhost:3000/api/cron/process-payments',
  'Cron Job이 호출할 API URL'
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;

-- 설정 확인
SELECT * FROM app_settings WHERE key IN ('cron_secret_token', 'cron_api_url');
```

### 2. RLS 비활성화

Cron Job이 테이블에 접근할 수 있도록 RLS를 비활성화합니다:

```sql
ALTER TABLE cron_job_logs DISABLE ROW LEVEL SECURITY;
```

---

## 로컬 테스트

### 1. 테스트 스크립트 실행

프로젝트 루트에서:

```bash
./test-cron.sh
```

**예상 출력:**

```
🧪 Cron Job API 테스트
======================

📊 1. 결제 대상 조회...
{
  "ok": true,
  "data": {
    "target_date": "2025-10-30",
    "total_count": 0,
    "targets": []
  }
}

💳 2. 정기결제 배치 처리...
{
  "ok": true,
  "data": {
    "processed_count": 0,
    "success_count": 0,
    "failed_count": 0,
    "suspended_count": 0,
    "total_amount": 0,
    "processing_time_ms": 548,
    "details": []
  }
}

🔒 3. 인증 실패 테스트 (잘못된 토큰)...
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authorization token"
  }
}

✅ 테스트 완료!
```

### 2. 수동 curl 테스트

#### 결제 대상 조회
```bash
curl -X GET \
  "http://localhost:3000/api/cron/payment-status" \
  -H "Authorization: Bearer 1Y6hBNak+jiaC6C7xA/kqrOvqy3YFM8wx1D3LokHTo0=" \
  -H "Content-Type: application/json"
```

#### 정기결제 처리
```bash
curl -X POST \
  "http://localhost:3000/api/cron/process-payments" \
  -H "Authorization: Bearer 1Y6hBNak+jiaC6C7xA/kqrOvqy3YFM8wx1D3LokHTo0=" \
  -H "Content-Type: application/json"
```

---

## 프로덕션 배포

### 1. Vercel 환경 변수 설정

Vercel Dashboard에서:

1. 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 환경 변수 추가:
   - **Key**: `CRON_SECRET_TOKEN`
   - **Value**: `1Y6hBNak+jiaC6C7xA/kqrOvqy3YFM8wx1D3LokHTo0=`
   - **Environments**: Production, Preview, Development 모두 체크
4. **Save** 클릭
5. 프로젝트 재배포

### 2. Supabase app_settings 업데이트

배포 완료 후 Supabase SQL Editor에서:

```sql
-- 프로덕션 URL로 변경
UPDATE app_settings
SET value = 'https://your-actual-domain.vercel.app/api/cron/process-payments'
WHERE key = 'cron_api_url';

-- 확인
SELECT * FROM app_settings WHERE key = 'cron_api_url';
```

**⚠️ 중요**: `your-actual-domain.vercel.app`를 실제 배포된 도메인으로 변경하세요.

### 3. Cron Job 동작 확인

배포 후 다음 날 오전 2시(KST) 이후에 `cron_job_logs` 테이블을 확인:

```sql
SELECT * FROM cron_job_logs
ORDER BY created_at DESC
LIMIT 10;
```

---

## 트러블슈팅

### Q1. 500 Internal Server Error 발생

**원인**: `CRON_SECRET_TOKEN` 환경 변수가 로드되지 않음

**해결책**:
1. `.env.local`에 토큰이 추가되었는지 확인
2. 개발 서버 재시작 (`npm run dev`)
3. Vercel의 경우 환경 변수 추가 후 재배포

### Q2. 401 Unauthorized 에러

**원인**: 잘못된 토큰 또는 토큰 불일치

**해결책**:
1. `.env.local`의 `CRON_SECRET_TOKEN` 확인
2. Supabase `app_settings`의 `cron_secret_token` 확인
3. 두 값이 정확히 일치하는지 확인

### Q3. Cron Job이 실행되지 않음

**원인**: Supabase pg_cron 설정 오류

**해결책**:
1. `0010_setup_subscription_cron.sql` migration이 실행되었는지 확인
2. `app_settings` 테이블의 `cron_api_url` 확인
3. Supabase logs에서 에러 메시지 확인

### Q4. 로컬에서는 작동하는데 프로덕션에서 안됨

**원인**: 프로덕션 URL 미설정

**해결책**:
```sql
-- Supabase에서 실행
UPDATE app_settings
SET value = 'https://your-domain.vercel.app/api/cron/process-payments'
WHERE key = 'cron_api_url';
```

---

## 보안 주의사항

### ⚠️ 반드시 지켜야 할 사항

1. **토큰 관리**
   - ✅ 토큰을 절대 Git에 커밋하지 마세요 (`.env.local`은 .gitignore에 포함)
   - ✅ 프로덕션과 개발 환경에 동일한 토큰 사용
   - ✅ 토큰이 유출되면 즉시 재생성하고 모든 곳에서 업데이트

2. **환경 변수 보호**
   - Vercel 환경 변수는 팀원에게만 공개
   - Supabase `app_settings`는 외부 접근 차단

3. **모니터링**
   - `cron_job_logs` 테이블을 정기적으로 확인
   - 실패율이 높으면 즉시 조사

---

## 참고 자료

- [Supabase pg_cron 문서](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [Vercel 환경 변수 설정](https://vercel.com/docs/concepts/projects/environment-variables)
- UC-007 구현 문서: `docs/usecase-implementation-checker.md`

---

## 문의

문제가 발생하면 다음 정보를 포함하여 문의하세요:

1. 에러 메시지 전문
2. `cron_job_logs` 테이블의 최근 로그
3. 환경 (로컬/프로덕션)
4. 사용 중인 토큰 (앞 4자리만)
