-- Migration: create subscriptions table
-- Description: Pro 구독 및 정기결제 정보를 관리하는 테이블
-- 토스페이먼츠 빌링키를 저장하고 자동결제를 추적

-- subscriptions 테이블 생성
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  billing_key text,
  card_last_4digits text,
  card_type text,
  subscription_status text NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'pending_cancellation', 'suspended')),
  next_payment_date date,
  auto_renewal boolean NOT NULL DEFAULT true,
  price integer NOT NULL,
  cancelled_at timestamptz,
  effective_until date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 테이블 설명
COMMENT ON TABLE public.subscriptions IS 'Pro 구독 및 정기결제 정보 관리 테이블';
COMMENT ON COLUMN public.subscriptions.id IS '구독 고유 ID';
COMMENT ON COLUMN public.subscriptions.user_id IS '사용자 ID (외래 키, 1:1 관계)';
COMMENT ON COLUMN public.subscriptions.billing_key IS '토스페이먼츠 빌링키 (자동결제용)';
COMMENT ON COLUMN public.subscriptions.card_last_4digits IS '카드 마지막 4자리';
COMMENT ON COLUMN public.subscriptions.card_type IS '카드 타입: 신용, 체크';
COMMENT ON COLUMN public.subscriptions.subscription_status IS '구독 상태: active(활성), pending_cancellation(해지예정), suspended(정지)';
COMMENT ON COLUMN public.subscriptions.next_payment_date IS '다음 결제일';
COMMENT ON COLUMN public.subscriptions.auto_renewal IS '자동갱신 여부';
COMMENT ON COLUMN public.subscriptions.price IS '구독 가격 (원 단위)';
COMMENT ON COLUMN public.subscriptions.cancelled_at IS '구독 해지 요청 시간';
COMMENT ON COLUMN public.subscriptions.effective_until IS '혜택 종료일 (해지 시 설정)';
COMMENT ON COLUMN public.subscriptions.created_at IS '구독 시작일';
COMMENT ON COLUMN public.subscriptions.updated_at IS '구독 정보 수정일';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_payment_date ON public.subscriptions(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(subscription_status);

-- RLS 비활성화
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;
