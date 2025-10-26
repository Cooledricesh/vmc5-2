-- Migration: create payments table
-- Description: 모든 결제 트랜잭션을 기록하는 테이블
-- 토스페이먼츠 결제 내역 및 환불 정보를 저장

-- payments 테이블 생성
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  order_id text UNIQUE NOT NULL,
  payment_key text,
  amount integer NOT NULL,
  payment_method text,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_type text NOT NULL CHECK (payment_type IN ('subscription', 'refund')),
  approved_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 테이블 설명
COMMENT ON TABLE public.payments IS '결제 트랜잭션 기록 테이블';
COMMENT ON COLUMN public.payments.id IS '결제 고유 ID';
COMMENT ON COLUMN public.payments.user_id IS '사용자 ID (외래 키)';
COMMENT ON COLUMN public.payments.subscription_id IS '구독 ID (외래 키, NULL 가능)';
COMMENT ON COLUMN public.payments.order_id IS '주문 ID (토스페이먼츠 orderId)';
COMMENT ON COLUMN public.payments.payment_key IS '결제 고유 키 (토스페이먼츠 paymentKey)';
COMMENT ON COLUMN public.payments.amount IS '결제 금액 (원 단위)';
COMMENT ON COLUMN public.payments.payment_method IS '결제 수단: 카드, 계좌이체 등';
COMMENT ON COLUMN public.payments.payment_status IS '결제 상태: pending(대기), completed(완료), failed(실패), cancelled(취소)';
COMMENT ON COLUMN public.payments.payment_type IS '결제 유형: subscription(구독), refund(환불)';
COMMENT ON COLUMN public.payments.approved_at IS '결제 승인 시간';
COMMENT ON COLUMN public.payments.cancelled_at IS '결제 취소 시간';
COMMENT ON COLUMN public.payments.cancel_reason IS '취소 사유';
COMMENT ON COLUMN public.payments.retry_count IS '결제 재시도 횟수 (자동결제 실패 시)';
COMMENT ON COLUMN public.payments.created_at IS '결제 생성일';
COMMENT ON COLUMN public.payments.updated_at IS '결제 정보 수정일';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON public.payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(payment_status);

-- RLS 비활성화
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
