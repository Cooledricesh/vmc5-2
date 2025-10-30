/**
 * GREEN Phase: 정기결제 자동 처리 서비스 로직 구현
 * UC-007: 정기결제 자동 처리
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { success, failure, type HandlerResult } from '@/backend/http/response';
import { TossPaymentsClient, TossPaymentsError } from '@/lib/external/tosspayments-client';
import { subscriptionErrorCodes, type SubscriptionErrorCode, getErrorMessage } from './error';
import { SUBSCRIPTION_PRICE, PRO_MONTHLY_ANALYSIS_COUNT } from './constants';

/**
 * 결제 대상 구독자 정보
 */
export interface PaymentTarget {
  subscription_id: string;
  user_id: string;
  billing_key: string;
  price: number;
  next_payment_date: string;
  retry_count: number;
  email: string;
  name: string;
  clerk_user_id: string;
}

/**
 * 결제 처리 결과
 */
export interface PaymentProcessResult {
  subscription_id: string;
  user_id: string;
  payment_key?: string;
  status: 'success' | 'failed';
  amount: number;
  error_code?: string;
  error_message?: string;
}

/**
 * 결제 성공 데이터
 */
export interface PaymentSuccessData {
  user_id: string;
  subscription_id: string;
  order_id: string;
  payment_key: string;
  amount: number;
  approved_at: string;
}

/**
 * 결제 실패 데이터
 */
export interface PaymentFailureData {
  user_id: string;
  subscription_id: string;
  order_id: string;
  amount: number;
  error_code: string;
  error_message: string;
  current_retry_count: number;
}

/**
 * 결제 실패 처리 결과
 */
export interface PaymentFailureResult {
  retry_count: number;
  should_suspend: boolean;
}

/**
 * 오늘 결제 대상 구독자 조회
 */
export async function getPaymentTargetsService(
  client: SupabaseClient,
): Promise<HandlerResult<PaymentTarget[], SubscriptionErrorCode, unknown>> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await client
      .from('subscriptions')
      .select(`
        id,
        user_id,
        billing_key,
        price,
        next_payment_date,
        retry_count,
        users!inner(email, name, clerk_user_id)
      `)
      .eq('subscription_status', 'active')
      .eq('next_payment_date', today)
      .not('billing_key', 'is', null);

    if (error) {
      console.error('Failed to fetch payment targets:', error);
      return failure(500, subscriptionErrorCodes.databaseError, getErrorMessage(subscriptionErrorCodes.databaseError));
    }

    // Transform data to PaymentTarget format
    const targets: PaymentTarget[] = (data || []).map((row: any) => ({
      subscription_id: row.id,
      user_id: row.user_id,
      billing_key: row.billing_key,
      price: row.price,
      next_payment_date: row.next_payment_date,
      retry_count: row.retry_count,
      email: row.users.email,
      name: row.users.name,
      clerk_user_id: row.users.clerk_user_id,
    }));

    return success(targets);
  } catch (error: any) {
    console.error('Error in getPaymentTargetsService:', error);
    return failure(500, subscriptionErrorCodes.internalError, getErrorMessage(subscriptionErrorCodes.internalError));
  }
}

/**
 * 단일 구독자 자동 결제 처리
 */
export async function processRecurringPaymentService(
  client: SupabaseClient,
  tossClient: TossPaymentsClient,
  subscription: Pick<PaymentTarget, 'subscription_id' | 'user_id' | 'billing_key' | 'price' | 'retry_count'>,
  user: Pick<PaymentTarget, 'clerk_user_id' | 'email' | 'name'>,
): Promise<HandlerResult<PaymentProcessResult, SubscriptionErrorCode, unknown>> {
  try {
    // 주문 ID 생성
    const timestamp = Date.now();
    const orderId = `SUBSCRIPTION_${new Date().toISOString().split('T')[0].replace(/-/g, '')}_${subscription.user_id}`;

    // 토스페이먼츠 자동결제 API 호출
    try {
      const paymentResult = await tossClient.executePayment({
        billingKey: subscription.billing_key,
        customerKey: user.clerk_user_id,
        amount: subscription.price,
        orderId,
        orderName: 'VMC5 Pro 요금제 월 구독료',
        customerEmail: user.email,
        customerName: user.name,
      });

      // 결제 성공
      return success({
        subscription_id: subscription.subscription_id,
        user_id: subscription.user_id,
        payment_key: paymentResult.paymentKey,
        status: 'success',
        amount: subscription.price,
      });
    } catch (error: any) {
      console.error('Failed to execute payment:', error);

      if (error instanceof TossPaymentsError) {
        return failure(
          400,
          subscriptionErrorCodes.paymentServiceError,
          error.message || '결제 처리에 실패했습니다',
        );
      }

      return failure(500, subscriptionErrorCodes.paymentServiceError, getErrorMessage(subscriptionErrorCodes.paymentServiceError));
    }
  } catch (error: any) {
    console.error('Error in processRecurringPaymentService:', error);
    return failure(500, subscriptionErrorCodes.internalError, getErrorMessage(subscriptionErrorCodes.internalError));
  }
}

/**
 * 결제 성공 처리
 * - payments 테이블 INSERT
 * - subscriptions 테이블 UPDATE (next_payment_date, retry_count 리셋)
 * - users 테이블 UPDATE (monthly_analysis_count 리셋)
 */
export async function handlePaymentSuccessService(
  client: SupabaseClient,
  paymentData: PaymentSuccessData,
): Promise<HandlerResult<void, SubscriptionErrorCode, unknown>> {
  try {
    // 1. payments 테이블 INSERT
    const { error: paymentInsertError } = await client.from('payments').insert({
      user_id: paymentData.user_id,
      subscription_id: paymentData.subscription_id,
      order_id: paymentData.order_id,
      payment_key: paymentData.payment_key,
      amount: paymentData.amount,
      payment_method: '카드',
      payment_status: 'completed',
      payment_type: 'subscription',
      approved_at: paymentData.approved_at,
      retry_count: 0,
      created_at: new Date().toISOString(),
    });

    if (paymentInsertError) {
      console.error('Failed to insert payment record:', paymentInsertError);
      return failure(500, subscriptionErrorCodes.databaseError, getErrorMessage(subscriptionErrorCodes.databaseError));
    }

    // 2. subscriptions 테이블 UPDATE
    // next_payment_date를 1개월 후로 설정, retry_count 리셋
    const nextPaymentDate = new Date();
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    const { error: subscriptionUpdateError } = await client
      .from('subscriptions')
      .update({
        next_payment_date: nextPaymentDate.toISOString().split('T')[0],
        retry_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentData.subscription_id);

    if (subscriptionUpdateError) {
      console.error('Failed to update subscription:', subscriptionUpdateError);
      return failure(500, subscriptionErrorCodes.databaseError, getErrorMessage(subscriptionErrorCodes.databaseError));
    }

    // 3. users 테이블 UPDATE (monthly_analysis_count 리셋)
    const { error: userUpdateError } = await client
      .from('users')
      .update({
        monthly_analysis_count: PRO_MONTHLY_ANALYSIS_COUNT,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentData.user_id);

    if (userUpdateError) {
      console.error('Failed to update user analysis count:', userUpdateError);
      return failure(500, subscriptionErrorCodes.databaseError, getErrorMessage(subscriptionErrorCodes.databaseError));
    }

    return success(undefined);
  } catch (error: any) {
    console.error('Error in handlePaymentSuccessService:', error);
    return failure(500, subscriptionErrorCodes.internalError, getErrorMessage(subscriptionErrorCodes.internalError));
  }
}

/**
 * 결제 실패 처리
 * - payments 테이블 INSERT (실패 기록)
 * - subscriptions 테이블 UPDATE (retry_count 증가)
 * - retry_count가 3회 이상이면 구독 정지 플래그 반환
 */
export async function handlePaymentFailureService(
  client: SupabaseClient,
  failureData: PaymentFailureData,
): Promise<HandlerResult<PaymentFailureResult, SubscriptionErrorCode, unknown>> {
  try {
    const newRetryCount = failureData.current_retry_count + 1;

    // 1. payments 테이블 INSERT (실패 기록)
    const { error: paymentInsertError } = await client.from('payments').insert({
      user_id: failureData.user_id,
      subscription_id: failureData.subscription_id,
      order_id: failureData.order_id,
      amount: failureData.amount,
      payment_method: null,
      payment_status: 'failed',
      payment_type: 'subscription',
      retry_count: newRetryCount,
      created_at: new Date().toISOString(),
    });

    if (paymentInsertError) {
      console.error('Failed to insert failed payment record:', paymentInsertError);
      return failure(500, subscriptionErrorCodes.databaseError, getErrorMessage(subscriptionErrorCodes.databaseError));
    }

    // 2. subscriptions 테이블 UPDATE (retry_count 증가)
    const { error: subscriptionUpdateError } = await client
      .from('subscriptions')
      .update({
        retry_count: newRetryCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', failureData.subscription_id);

    if (subscriptionUpdateError) {
      console.error('Failed to update subscription retry count:', subscriptionUpdateError);
      return failure(500, subscriptionErrorCodes.databaseError, getErrorMessage(subscriptionErrorCodes.databaseError));
    }

    // 3. retry_count가 3 이상이면 구독 정지 플래그 설정
    const shouldSuspend = newRetryCount >= 3;

    return success({
      retry_count: newRetryCount,
      should_suspend: shouldSuspend,
    });
  } catch (error: any) {
    console.error('Error in handlePaymentFailureService:', error);
    return failure(500, subscriptionErrorCodes.internalError, getErrorMessage(subscriptionErrorCodes.internalError));
  }
}

/**
 * 구독 정지 처리 (3회 결제 실패 후)
 * - subscriptions 테이블 UPDATE (subscription_status = 'suspended')
 * - users 테이블 UPDATE (subscription_tier = 'free')
 * - 토스페이먼츠 빌링키 삭제
 */
export async function suspendSubscriptionService(
  client: SupabaseClient,
  tossClient: TossPaymentsClient,
  subscriptionId: string,
  userId: string,
  billingKey: string,
): Promise<HandlerResult<void, SubscriptionErrorCode, unknown>> {
  try {
    // 1. 빌링키 삭제 (실패해도 계속 진행)
    try {
      await tossClient.deleteBillingKey(billingKey);
    } catch (error: any) {
      console.warn('Failed to delete billing key (continuing):', error);
    }

    // 2. subscriptions 테이블 UPDATE
    const { error: subscriptionUpdateError } = await client
      .from('subscriptions')
      .update({
        subscription_status: 'suspended',
        billing_key: null,
        auto_renewal: false,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: '결제 실패 (3회)',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (subscriptionUpdateError) {
      console.error('Failed to update subscription status:', subscriptionUpdateError);
      return failure(500, subscriptionErrorCodes.databaseError, getErrorMessage(subscriptionErrorCodes.databaseError));
    }

    // 3. users 테이블 UPDATE (free 티어로 변경)
    const { error: userUpdateError } = await client
      .from('users')
      .update({
        subscription_tier: 'free',
        monthly_analysis_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (userUpdateError) {
      console.error('Failed to update user tier:', userUpdateError);
      return failure(500, subscriptionErrorCodes.databaseError, getErrorMessage(subscriptionErrorCodes.databaseError));
    }

    return success(undefined);
  } catch (error: any) {
    console.error('Error in suspendSubscriptionService:', error);
    return failure(500, subscriptionErrorCodes.internalError, getErrorMessage(subscriptionErrorCodes.internalError));
  }
}
