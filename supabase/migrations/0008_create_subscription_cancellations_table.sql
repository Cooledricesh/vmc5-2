-- pgcrypto 확장 활성화 (gen_random_uuid 함수 사용을 위해)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 구독 해지 사유 저장 테이블
CREATE TABLE IF NOT EXISTS subscription_cancellations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  cancellation_reason TEXT,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_subscription_cancellations_user_id ON subscription_cancellations(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_cancellations_subscription_id ON subscription_cancellations(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_cancellations_created_at ON subscription_cancellations(created_at DESC);

-- updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_subscription_cancellations_updated_at ON subscription_cancellations;
CREATE TRIGGER update_subscription_cancellations_updated_at
  BEFORE UPDATE ON subscription_cancellations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS 비활성화 (문서 지침에 따라)
ALTER TABLE subscription_cancellations DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE subscription_cancellations IS '구독 해지 사유 및 피드백 저장';
COMMENT ON COLUMN subscription_cancellations.cancellation_reason IS '해지 사유 (선택사항)';
COMMENT ON COLUMN subscription_cancellations.feedback IS '사용자 피드백 (선택사항, 최대 500자)';
