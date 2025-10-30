-- Migration: Add retry_count and cancellation_reason to subscriptions
-- Description: 정기결제 재시도 횟수와 해지 사유를 추적하기 위한 컬럼 추가

-- subscriptions 테이블에 retry_count 컬럼 추가
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0;

-- subscriptions 테이블에 cancellation_reason 컬럼 추가
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- 컬럼 설명 추가
COMMENT ON COLUMN public.subscriptions.retry_count IS '정기결제 실패 후 재시도 횟수 (최대 3회)';
COMMENT ON COLUMN public.subscriptions.cancellation_reason IS '구독 해지 사유';

-- retry_count 인덱스 생성 (Cron Job 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_subscriptions_retry_count ON public.subscriptions(retry_count)
WHERE subscription_status = 'active' AND next_payment_date IS NOT NULL;
