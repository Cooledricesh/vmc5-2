import { z } from 'zod';

/**
 * 빌링키 발급 요청 스키마
 */
export const BillingKeyRequestSchema = z.object({
  authKey: z.string().min(1, '인증키가 필요합니다'),
  customerKey: z.string().min(1, '고객키가 필요합니다'),
});

/**
 * 구독 해지 요청 스키마
 */
export const CancellationRequestSchema = z.object({
  cancellation_reason: z.string().optional(),
  feedback: z.string().max(500, '피드백은 500자 이내로 입력해주세요').optional(),
});

/**
 * 구독 재활성화 요청 스키마
 */
export const ReactivationRequestSchema = z.object({
  option: z.enum(['existing_card', 'new_card'], {
    errorMap: () => ({ message: '기존 카드 또는 새 카드 중 하나를 선택해주세요' }),
  }),
  authKey: z.string().optional(),
});

/**
 * 결제 카드 변경 요청 스키마
 */
export const ChangeCardRequestSchema = z.object({
  authKey: z.string().min(1, '인증키가 필요합니다'),
});

/**
 * 구독 정보 응답 스키마
 */
export const SubscriptionResponseSchema = z.object({
  subscription_id: z.string().uuid().nullable(),
  subscription_tier: z.enum(['free', 'pro']),
  subscription_status: z
    .enum(['active', 'pending_cancellation', 'cancelled', 'suspended'])
    .nullable(),
  next_payment_date: z.string().nullable(),
  effective_until: z.string().nullable(),
  card_last_4digits: z.string().nullable(),
  card_type: z.string().nullable(),
  price: z.number().int().positive(),
  auto_renewal: z.boolean(),
  monthly_analysis_count: z.number().int().min(0),
  remaining_days: z.number().int().nullable(),
});

/**
 * 결제 내역 아이템 스키마
 */
export const PaymentHistoryItemSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string(),
  amount: z.number().int().positive(),
  payment_method: z.string().nullable(),
  payment_status: z.string(),
  payment_type: z.string(),
  approved_at: z.string().nullable(),
  created_at: z.string(),
});

/**
 * 결제 내역 응답 스키마
 */
export const PaymentHistoryResponseSchema = z.object({
  payments: z.array(PaymentHistoryItemSchema),
  total_count: z.number().int().min(0),
});

/**
 * Supabase subscriptions 테이블 Row 스키마
 */
export const SubscriptionRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  billing_key: z.string().nullable(),
  card_last_4digits: z.string().nullable(),
  card_type: z.string().nullable(),
  subscription_status: z.string(),
  next_payment_date: z.string().nullable(),
  auto_renewal: z.boolean(),
  price: z.number().int(),
  cancelled_at: z.string().nullable(),
  effective_until: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * Supabase payments 테이블 Row 스키마
 */
export const PaymentRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  subscription_id: z.string().uuid().nullable(),
  order_id: z.string(),
  payment_key: z.string().nullable(),
  amount: z.number().int(),
  payment_method: z.string().nullable(),
  payment_status: z.string(),
  payment_type: z.string(),
  approved_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// 타입 추출
export type BillingKeyRequest = z.infer<typeof BillingKeyRequestSchema>;
export type CancellationRequest = z.infer<typeof CancellationRequestSchema>;
export type ReactivationRequest = z.infer<typeof ReactivationRequestSchema>;
export type ChangeCardRequest = z.infer<typeof ChangeCardRequestSchema>;
export type SubscriptionResponse = z.infer<typeof SubscriptionResponseSchema>;
export type PaymentHistoryItem = z.infer<typeof PaymentHistoryItemSchema>;
export type PaymentHistoryResponse = z.infer<typeof PaymentHistoryResponseSchema>;
export type SubscriptionRow = z.infer<typeof SubscriptionRowSchema>;
export type PaymentRow = z.infer<typeof PaymentRowSchema>;
