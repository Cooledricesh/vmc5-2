-- 구독 생성 트랜잭션 RPC 함수
-- 구독 생성 + 사용자 정보 업데이트 + 결제 내역 저장을 하나의 트랜잭션으로 처리

CREATE OR REPLACE FUNCTION create_subscription_transaction(
  p_user_id UUID,
  p_billing_key TEXT,
  p_card_last_4digits VARCHAR(4),
  p_card_type VARCHAR(20),
  p_price INTEGER,
  p_order_id VARCHAR(100),
  p_payment_key VARCHAR(200),
  p_approved_at TIMESTAMPTZ
) RETURNS TABLE(subscription_id UUID, next_payment_date DATE) AS $$
DECLARE
  v_subscription_id UUID;
  v_next_payment_date DATE;
BEGIN
  -- 1. 구독 생성
  INSERT INTO subscriptions (
    user_id,
    billing_key,
    card_last_4digits,
    card_type,
    subscription_status,
    next_payment_date,
    auto_renewal,
    price
  ) VALUES (
    p_user_id,
    p_billing_key,
    p_card_last_4digits,
    p_card_type,
    'active',
    CURRENT_DATE + INTERVAL '1 month',
    true,
    p_price
  ) RETURNING id, next_payment_date INTO v_subscription_id, v_next_payment_date;

  -- 2. 사용자 정보 업데이트 (subscription_tier = 'pro', monthly_analysis_count = 10)
  UPDATE users
  SET
    subscription_tier = 'pro',
    monthly_analysis_count = 10,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- 3. 결제 내역 저장
  INSERT INTO payments (
    user_id,
    subscription_id,
    order_id,
    payment_key,
    amount,
    payment_method,
    payment_status,
    payment_type,
    approved_at
  ) VALUES (
    p_user_id,
    v_subscription_id,
    p_order_id,
    p_payment_key,
    p_price,
    '카드',
    'completed',
    'subscription',
    p_approved_at
  );

  -- 4. 결과 반환
  RETURN QUERY SELECT v_subscription_id, v_next_payment_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_subscription_transaction IS '구독 생성 트랜잭션: 구독 생성 + 사용자 정보 업데이트 + 결제 내역 저장';
