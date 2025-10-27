/**
 * 구독 관련 상수
 */

// 구독 가격
export const SUBSCRIPTION_PRICE = 9900; // 9,900원

// 구독 플랜
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PRO: 'pro',
} as const;

// 구독 상태
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  PENDING_CANCELLATION: 'pending_cancellation',
  CANCELLED: 'cancelled',
  SUSPENDED: 'suspended',
} as const;

// 결제 상태
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

// 결제 타입
export const PAYMENT_TYPE = {
  SUBSCRIPTION: 'subscription',
  SUBSCRIPTION_RENEWAL: 'subscription_renewal',
  ONE_TIME: 'one_time',
} as const;

// Pro 플랜 월 분석 가능 횟수
export const PRO_MONTHLY_ANALYSIS_COUNT = 10;

// Free 플랜 월 분석 가능 횟수
export const FREE_MONTHLY_ANALYSIS_COUNT = 0;

export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS];
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
export type PaymentType = typeof PAYMENT_TYPE[keyof typeof PAYMENT_TYPE];
