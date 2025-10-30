-- Migration: Setup Supabase Cron Job for recurring payments
-- Description: 매일 02:00 KST에 정기결제를 자동 처리하는 Cron Job 설정
-- UC-007: 정기결제 자동 처리

-- 1. pg_cron extension 활성화 (Supabase에서 기본 제공)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Cron Job 등록
-- 매일 02:00 KST (UTC 기준 17:00 전날) 실행
-- Supabase는 UTC 타임존을 사용하므로 KST 02:00 = UTC 17:00 (전날)
SELECT cron.schedule(
  'process-recurring-payments',           -- Job name
  '0 17 * * *',                           -- Cron expression (매일 17:00 UTC = 02:00 KST 다음날)
  $$
  -- Supabase Edge Function 또는 Next.js API Route 호출
  -- 실제 URL은 배포 후 환경변수로 관리
  SELECT net.http_post(
    url := current_setting('app.settings.cron_api_url', true),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret_token', true)
    ),
    body := jsonb_build_object(
      'trigger', 'cron',
      'job_name', 'process-recurring-payments',
      'execution_time', now()
    )
  );
  $$
);

-- 3. Cron Job 로깅을 위한 테이블 생성
CREATE TABLE IF NOT EXISTS public.cron_job_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  execution_time timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  processed_count integer DEFAULT 0,
  success_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  suspended_count integer DEFAULT 0,
  total_amount integer DEFAULT 0,
  processing_time_ms integer,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cron_job_logs IS 'Cron Job 실행 로그';
COMMENT ON COLUMN public.cron_job_logs.job_name IS 'Cron Job 이름';
COMMENT ON COLUMN public.cron_job_logs.execution_time IS '실행 시작 시간';
COMMENT ON COLUMN public.cron_job_logs.status IS '실행 상태: started, completed, failed';
COMMENT ON COLUMN public.cron_job_logs.processed_count IS '처리된 총 건수';
COMMENT ON COLUMN public.cron_job_logs.success_count IS '결제 성공 건수';
COMMENT ON COLUMN public.cron_job_logs.failed_count IS '결제 실패 건수';
COMMENT ON COLUMN public.cron_job_logs.suspended_count IS '구독 정지 건수';
COMMENT ON COLUMN public.cron_job_logs.total_amount IS '총 결제 금액';
COMMENT ON COLUMN public.cron_job_logs.processing_time_ms IS '처리 시간 (밀리초)';
COMMENT ON COLUMN public.cron_job_logs.error_message IS '에러 메시지';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_job_name ON public.cron_job_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_execution_time ON public.cron_job_logs(execution_time DESC);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_status ON public.cron_job_logs(status);

-- RLS 비활성화
ALTER TABLE public.cron_job_logs DISABLE ROW LEVEL SECURITY;

-- 4. Cron Job 설정 저장을 위한 테이블
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.app_settings IS '애플리케이션 설정 저장';
COMMENT ON COLUMN public.app_settings.key IS '설정 키';
COMMENT ON COLUMN public.app_settings.value IS '설정 값';
COMMENT ON COLUMN public.app_settings.description IS '설정 설명';

-- RLS 비활성화
ALTER TABLE public.app_settings DISABLE ROW LEVEL SECURITY;

-- 5. 기본 설정 값 삽입 (실제 값은 배포 시 업데이트 필요)
INSERT INTO public.app_settings (key, value, description) VALUES
  ('cron_api_url', 'https://your-domain.vercel.app/api/cron/process-payments', 'Cron Job API URL'),
  ('cron_secret_token', 'YOUR_CRON_SECRET_TOKEN_HERE', 'Cron Job 인증 토큰')
ON CONFLICT (key) DO NOTHING;

-- 6. Cron Job 목록 조회 함수 (모니터링용)
CREATE OR REPLACE FUNCTION get_cron_jobs()
RETURNS TABLE (
  jobid bigint,
  schedule text,
  command text,
  nodename text,
  nodeport integer,
  database text,
  username text,
  active boolean,
  jobname text
) AS $$
BEGIN
  RETURN QUERY SELECT * FROM cron.job;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_cron_jobs() IS '등록된 모든 Cron Job 조회';

-- 7. Cron Job 수동 실행 함수 (테스트 및 긴급 상황용)
-- 주의: 이 함수는 서버 API에서 직접 호출하는 것이 안전합니다
-- Supabase에서 직접 HTTP 요청을 보내는 것은 제한될 수 있습니다
