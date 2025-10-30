import type { SupabaseClient } from '@supabase/supabase-js';
import { success, failure, type HandlerResult } from '@/backend/http/response';
import { getUserIdByClerkId } from '@/backend/utils/user-helper';
import { TossPaymentsClient, TossPaymentsError } from '@/lib/external/tosspayments-client';
import { daysUntilNextPayment } from '@/lib/utils/date';
import type { SubscriptionResponse, SubscriptionRow, PaymentHistoryResponse } from './schema';
import { subscriptionErrorCodes, type SubscriptionErrorCode, getErrorMessage } from './error';
import {
  SUBSCRIPTION_PRICE,
  SUBSCRIPTION_TIERS,
  SUBSCRIPTION_STATUS,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  PRO_MONTHLY_ANALYSIS_COUNT,
  FREE_MONTHLY_ANALYSIS_COUNT,
} from './constants';

/**
 * 사용자의 구독 정보 조회
 * @param userId - Clerk User ID (e.g., "user_34k7JqEd8il5046H7aeiCZ1qA9G")
 */
export async function getSubscriptionByUserId(
  client: SupabaseClient,
  userId: string,
): Promise<HandlerResult<SubscriptionResponse, SubscriptionErrorCode, unknown>> {
  try {
    // Clerk ID로 내부 UUID 조회
    const userIdResult = await getUserIdByClerkId(client, userId, subscriptionErrorCodes.unauthorized);
    if (!userIdResult.ok) {
      return userIdResult as HandlerResult<SubscriptionResponse, SubscriptionErrorCode, unknown>;
    }
    const internalUserId = userIdResult.data;

    // 구독 정보 조회
    const { data: subscription, error: subError } = await client
      .from('subscriptions')
      .select('*')
      .eq('user_id', internalUserId)
      .maybeSingle();

    if (subError) {
      console.error('Failed to fetch subscription:', subError);
      return failure(500, subscriptionErrorCodes.databaseError, getErrorMessage(subscriptionErrorCodes.databaseError));
    }

    // 사용자 정보 조회 (subscription_tier)
    const { data: user, error: userError } = await client
      .from('users')
      .select('subscription_tier, monthly_analysis_count')
      .eq('id', internalUserId)
      .single();

    if (userError) {
      console.error('Failed to fetch user:', userError);
      return failure(500, subscriptionErrorCodes.databaseError, getErrorMessage(subscriptionErrorCodes.databaseError));
    }

    // 구독이 없는 경우 (Free 플랜)
    if (!subscription) {
      return success({
        subscription_id: null,
        subscription_tier: SUBSCRIPTION_TIERS.FREE as 'free',
        subscription_status: null,
        next_payment_date: null,
        effective_until: null,
        card_last_4digits: null,
        card_type: null,
        price: SUBSCRIPTION_PRICE,
        auto_renewal: false,
        monthly_analysis_count: user.monthly_analysis_count || FREE_MONTHLY_ANALYSIS_COUNT,
        remaining_days: null,
      });
    }

    // 남은 일수 계산
    let remainingDays: number | null = null;
    if (subscription.subscription_status === SUBSCRIPTION_STATUS.PENDING_CANCELLATION && subscription.effective_until) {
      remainingDays = daysUntilNextPayment(subscription.effective_until);
    }

    return success({
      subscription_id: subscription.id,
      subscription_tier: user.subscription_tier as 'free' | 'pro',
      subscription_status: subscription.subscription_status,
      next_payment_date: subscription.next_payment_date,
      effective_until: subscription.effective_until,
      card_last_4digits: subscription.card_last_4digits,
      card_type: subscription.card_type,
      price: subscription.price,
      auto_renewal: subscription.auto_renewal,
      monthly_analysis_count: user.monthly_analysis_count || PRO_MONTHLY_ANALYSIS_COUNT,
      remaining_days: remainingDays,
    });
  } catch (error: any) {
    console.error('Error in getSubscriptionByUserId:', error);
    return failure(500, subscriptionErrorCodes.internalError, getErrorMessage(subscriptionErrorCodes.internalError));
  }
}

/**
 * 빌링키 발급 및 초회 결제 실행 후 구독 생성
 * @param userId - Clerk User ID (e.g., "user_34k7JqEd8il5046H7aeiCZ1qA9G")
 * @param clerkUserId - Clerk User ID (중복 파라미터, userId와 동일)
 */
export async function createSubscriptionWithPayment(
  client: SupabaseClient,
  tossClient: TossPaymentsClient,
  userId: string,
  clerkUserId: string,
  authKey: string,
  userEmail: string,
  userName: string,
): Promise<HandlerResult<SubscriptionResponse, SubscriptionErrorCode, unknown>> {
  try {
    // Clerk ID로 내부 UUID 조회
    const userIdResult = await getUserIdByClerkId(client, userId, subscriptionErrorCodes.unauthorized);
    if (!userIdResult.ok) {
      return userIdResult as HandlerResult<SubscriptionResponse, SubscriptionErrorCode, unknown>;
    }
    const internalUserId = userIdResult.data;

    // 1. 기존 구독 확인
    const { data: existingSub } = await client
      .from('subscriptions')
      .select('id, subscription_status')
      .eq('user_id', internalUserId)
      .maybeSingle();

    if (existingSub && existingSub.subscription_status === SUBSCRIPTION_STATUS.ACTIVE) {
      return failure(
        400,
        subscriptionErrorCodes.alreadySubscribed,
        getErrorMessage(subscriptionErrorCodes.alreadySubscribed),
      );
    }

    // 2. 빌링키 발급
    let billingKeyResult;
    try {
      billingKeyResult = await tossClient.issueBillingKey({
        authKey,
        customerKey: clerkUserId,
        customerEmail: userEmail,
        customerName: userName,
      });
    } catch (error: any) {
      console.error('Failed to issue billing key:', error);
      if (error instanceof TossPaymentsError) {
        return failure(
          400,
          subscriptionErrorCodes.billingKeyIssueFailed,
          error.message || getErrorMessage(subscriptionErrorCodes.billingKeyIssueFailed),
        );
      }
      return failure(
        500,
        subscriptionErrorCodes.billingKeyIssueFailed,
        getErrorMessage(subscriptionErrorCodes.billingKeyIssueFailed),
      );
    }

    const { billingKey, card, cardNumber } = billingKeyResult;
    const cardLast4 = card?.number?.slice(-4) || cardNumber?.slice(-4) || '****';
    const cardType = card?.cardType || '신용';

    // 3. 초회 결제 실행
    const orderId = `SUB_${internalUserId}_${Date.now()}`;
    let paymentResult;
    try {
      paymentResult = await tossClient.executePayment({
        billingKey,
        customerKey: clerkUserId,
        amount: SUBSCRIPTION_PRICE,
        orderId,
        orderName: 'Pro 요금제 월 구독료',
        customerEmail: userEmail,
        customerName: userName,
      });
    } catch (error: any) {
      console.error('Failed to execute initial payment:', error);
      // 결제 실패 시 빌링키 삭제 시도
      try {
        await tossClient.deleteBillingKey(billingKey);
      } catch (deleteError) {
        console.error('Failed to delete billing key after payment failure:', deleteError);
      }

      if (error instanceof TossPaymentsError) {
        return failure(
          400,
          subscriptionErrorCodes.initialPaymentFailed,
          error.message || getErrorMessage(subscriptionErrorCodes.initialPaymentFailed),
        );
      }
      return failure(
        500,
        subscriptionErrorCodes.initialPaymentFailed,
        getErrorMessage(subscriptionErrorCodes.initialPaymentFailed),
      );
    }

    // 4. 트랜잭션: 구독 생성 + 사용자 정보 업데이트 + 결제 내역 저장
    const { data: rpcResult, error: rpcError } = await client.rpc('create_subscription_transaction', {
      p_user_id: internalUserId,
      p_billing_key: billingKey,
      p_card_last_4digits: cardLast4,
      p_card_type: cardType,
      p_price: SUBSCRIPTION_PRICE,
      p_order_id: orderId,
      p_payment_key: paymentResult.paymentKey,
      p_approved_at: paymentResult.approvedAt,
    });

    if (rpcError) {
      console.error('Failed to create subscription transaction:', rpcError);
      // 트랜잭션 실패 시 빌링키 삭제 및 결제 취소 시도
      try {
        await tossClient.cancelPayment({
          paymentKey: paymentResult.paymentKey,
          cancelReason: '구독 생성 실패로 인한 자동 취소',
        });
        await tossClient.deleteBillingKey(billingKey);
      } catch (cleanupError) {
        console.error('Failed to cleanup after transaction failure:', cleanupError);
      }

      return failure(
        500,
        subscriptionErrorCodes.transactionFailed,
        getErrorMessage(subscriptionErrorCodes.transactionFailed),
      );
    }

    // 5. 성공 응답
    return success({
      subscription_id: rpcResult.subscription_id,
      subscription_tier: SUBSCRIPTION_TIERS.PRO as 'pro',
      subscription_status: SUBSCRIPTION_STATUS.ACTIVE as 'active',
      next_payment_date: rpcResult.next_payment_date,
      effective_until: null,
      card_last_4digits: cardLast4,
      card_type: cardType,
      price: SUBSCRIPTION_PRICE,
      auto_renewal: true,
      monthly_analysis_count: PRO_MONTHLY_ANALYSIS_COUNT,
      remaining_days: null,
    });
  } catch (error: any) {
    console.error('Error in createSubscriptionWithPayment:', error);
    return failure(500, subscriptionErrorCodes.internalError, getErrorMessage(subscriptionErrorCodes.internalError));
  }
}

/**
 * 구독 해지 (빌링키 삭제 + DB 업데이트)
 * @param userId - Clerk User ID (e.g., "user_34k7JqEd8il5046H7aeiCZ1qA9G")
 */
export async function cancelSubscriptionService(
  client: SupabaseClient,
  tossClient: TossPaymentsClient,
  userId: string,
  cancellationReason: string | undefined,
  feedback: string | undefined,
): Promise<HandlerResult<SubscriptionResponse, SubscriptionErrorCode, unknown>> {
  try {
    // Clerk ID로 내부 UUID 조회
    const userIdResult = await getUserIdByClerkId(client, userId, subscriptionErrorCodes.unauthorized);
    if (!userIdResult.ok) {
      return userIdResult as HandlerResult<SubscriptionResponse, SubscriptionErrorCode, unknown>;
    }
    const internalUserId = userIdResult.data;

    // 1. 구독 정보 조회
    const { data: subscription, error: subError } = await client
      .from('subscriptions')
      .select('*')
      .eq('user_id', internalUserId)
      .eq('subscription_status', SUBSCRIPTION_STATUS.ACTIVE)
      .maybeSingle();

    if (subError) {
      console.error('Failed to fetch subscription:', subError);
      return failure(500, subscriptionErrorCodes.databaseError, getErrorMessage(subscriptionErrorCodes.databaseError));
    }

    if (!subscription) {
      return failure(
        404,
        subscriptionErrorCodes.subscriptionNotFound,
        getErrorMessage(subscriptionErrorCodes.subscriptionNotFound),
      );
    }

    // 2. 빌링키 삭제
    if (subscription.billing_key) {
      try {
        await tossClient.deleteBillingKey(subscription.billing_key);
      } catch (error: any) {
        console.error('Failed to delete billing key:', error);
        // 빌링키 삭제 실패 시에도 계속 진행 (이미 삭제되었을 수 있음)
      }
    }

    // 3. DB 업데이트: 구독 상태 변경
    const effectiveUntil = subscription.next_payment_date; // 다음 결제일까지 혜택 유지

    const { error: updateError } = await client
      .from('subscriptions')
      .update({
        subscription_status: SUBSCRIPTION_STATUS.PENDING_CANCELLATION,
        auto_renewal: false,
        effective_until: effectiveUntil,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Failed to update subscription status:', updateError);
      return failure(500, subscriptionErrorCodes.databaseError, getErrorMessage(subscriptionErrorCodes.databaseError));
    }

    // 4. 해지 사유 저장 (선택사항)
    if (cancellationReason || feedback) {
      const { error: reasonError } = await client.from('subscription_cancellations').insert({
        user_id: internalUserId,
        subscription_id: subscription.id,
        cancellation_reason: cancellationReason,
        feedback,
      });

      if (reasonError) {
        console.warn('Failed to save cancellation reason:', reasonError);
        // 사유 저장 실패는 무시
      }
    }

    // 5. 남은 일수 계산
    const remainingDays = effectiveUntil ? daysUntilNextPayment(effectiveUntil) : null;

    return success({
      subscription_id: subscription.id,
      subscription_tier: SUBSCRIPTION_TIERS.PRO as 'pro',
      subscription_status: SUBSCRIPTION_STATUS.PENDING_CANCELLATION as 'pending_cancellation',
      next_payment_date: subscription.next_payment_date,
      effective_until: effectiveUntil,
      card_last_4digits: subscription.card_last_4digits,
      card_type: subscription.card_type,
      price: subscription.price,
      auto_renewal: false,
      monthly_analysis_count: PRO_MONTHLY_ANALYSIS_COUNT,
      remaining_days: remainingDays,
    });
  } catch (error: any) {
    console.error('Error in cancelSubscriptionService:', error);
    return failure(500, subscriptionErrorCodes.internalError, getErrorMessage(subscriptionErrorCodes.internalError));
  }
}

/**
 * 구독 재활성화
 * @param userId - Clerk User ID (e.g., "user_34k7JqEd8il5046H7aeiCZ1qA9G")
 * @param clerkUserId - Clerk User ID (중복 파라미터, userId와 동일)
 */
export async function reactivateSubscriptionService(
  client: SupabaseClient,
  tossClient: TossPaymentsClient,
  userId: string,
  clerkUserId: string,
  option: 'existing_card' | 'new_card',
  authKey?: string,
  userEmail?: string,
  userName?: string,
): Promise<HandlerResult<SubscriptionResponse, SubscriptionErrorCode, unknown>> {
  try {
    // Clerk ID로 내부 UUID 조회
    const userIdResult = await getUserIdByClerkId(client, userId, subscriptionErrorCodes.unauthorized);
    if (!userIdResult.ok) {
      return userIdResult as HandlerResult<SubscriptionResponse, SubscriptionErrorCode, unknown>;
    }
    const internalUserId = userIdResult.data;

    // 1. 구독 정보 조회
    const { data: subscription, error: subError } = await client
      .from('subscriptions')
      .select('*')
      .eq('user_id', internalUserId)
      .maybeSingle();

    if (subError) {
      console.error('Failed to fetch subscription:', subError);
      return failure(500, subscriptionErrorCodes.databaseError, getErrorMessage(subscriptionErrorCodes.databaseError));
    }

    if (!subscription) {
      return failure(
        404,
        subscriptionErrorCodes.subscriptionNotFound,
        getErrorMessage(subscriptionErrorCodes.subscriptionNotFound),
      );
    }

    if (subscription.subscription_status !== SUBSCRIPTION_STATUS.PENDING_CANCELLATION) {
      return failure(
        400,
        subscriptionErrorCodes.cannotReactivate,
        getErrorMessage(subscriptionErrorCodes.cannotReactivate),
      );
    }

    // 2. 새 카드로 재활성화하는 경우 빌링키 재발급
    let newBillingKey: string | null = null;
    let newCardLast4: string | null = null;
    let newCardType: string | null = null;

    if (option === 'new_card') {
      if (!authKey || !userEmail || !userName) {
        return failure(
          400,
          subscriptionErrorCodes.validationError,
          '새 카드 등록을 위한 정보가 부족합니다',
        );
      }

      try {
        const billingKeyResult = await tossClient.issueBillingKey({
          authKey,
          customerKey: clerkUserId,
          customerEmail: userEmail,
          customerName: userName,
        });

        newBillingKey = billingKeyResult.billingKey;
        newCardLast4 = billingKeyResult.card?.number?.slice(-4) || billingKeyResult.cardNumber?.slice(-4) || '****';
        newCardType = billingKeyResult.card?.cardType || '신용';

        // 기존 빌링키 삭제 (있는 경우)
        if (subscription.billing_key) {
          try {
            await tossClient.deleteBillingKey(subscription.billing_key);
          } catch (deleteError) {
            console.warn('Failed to delete old billing key:', deleteError);
          }
        }
      } catch (error: any) {
        console.error('Failed to issue new billing key:', error);
        if (error instanceof TossPaymentsError) {
          return failure(
            400,
            subscriptionErrorCodes.billingKeyIssueFailed,
            error.message || getErrorMessage(subscriptionErrorCodes.billingKeyIssueFailed),
          );
        }
        return failure(
          500,
          subscriptionErrorCodes.billingKeyIssueFailed,
          getErrorMessage(subscriptionErrorCodes.billingKeyIssueFailed),
        );
      }
    }

    // 3. 구독 상태 업데이트
    const updateData: any = {
      subscription_status: SUBSCRIPTION_STATUS.ACTIVE,
      auto_renewal: true,
      effective_until: null,
      cancelled_at: null,
      updated_at: new Date().toISOString(),
    };

    if (option === 'new_card' && newBillingKey) {
      updateData.billing_key = newBillingKey;
      updateData.card_last_4digits = newCardLast4;
      updateData.card_type = newCardType;
    }

    const { error: updateError } = await client
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Failed to reactivate subscription:', updateError);
      // 새 빌링키 발급했으면 삭제
      if (newBillingKey) {
        try {
          await tossClient.deleteBillingKey(newBillingKey);
        } catch (cleanupError) {
          console.error('Failed to cleanup billing key:', cleanupError);
        }
      }
      return failure(500, subscriptionErrorCodes.databaseError, getErrorMessage(subscriptionErrorCodes.databaseError));
    }

    return success({
      subscription_id: subscription.id,
      subscription_tier: SUBSCRIPTION_TIERS.PRO as 'pro',
      subscription_status: SUBSCRIPTION_STATUS.ACTIVE as 'active',
      next_payment_date: subscription.next_payment_date,
      effective_until: null,
      card_last_4digits: newCardLast4 || subscription.card_last_4digits,
      card_type: newCardType || subscription.card_type,
      price: subscription.price,
      auto_renewal: true,
      monthly_analysis_count: PRO_MONTHLY_ANALYSIS_COUNT,
      remaining_days: null,
    });
  } catch (error: any) {
    console.error('Error in reactivateSubscriptionService:', error);
    return failure(500, subscriptionErrorCodes.internalError, getErrorMessage(subscriptionErrorCodes.internalError));
  }
}

/**
 * 결제 카드 변경
 * @param userId - Clerk User ID (e.g., "user_34k7JqEd8il5046H7aeiCZ1qA9G")
 * @param clerkUserId - Clerk User ID (중복 파라미터, userId와 동일)
 */
export async function changePaymentCardService(
  client: SupabaseClient,
  tossClient: TossPaymentsClient,
  userId: string,
  clerkUserId: string,
  authKey: string,
  userEmail: string,
  userName: string,
): Promise<HandlerResult<SubscriptionResponse, SubscriptionErrorCode, unknown>> {
  try {
    // Clerk ID로 내부 UUID 조회
    const userIdResult = await getUserIdByClerkId(client, userId, subscriptionErrorCodes.unauthorized);
    if (!userIdResult.ok) {
      return userIdResult as HandlerResult<SubscriptionResponse, SubscriptionErrorCode, unknown>;
    }
    const internalUserId = userIdResult.data;

    // 1. 구독 정보 조회
    const { data: subscription, error: subError } = await client
      .from('subscriptions')
      .select('*')
      .eq('user_id', internalUserId)
      .eq('subscription_status', SUBSCRIPTION_STATUS.ACTIVE)
      .maybeSingle();

    if (subError) {
      console.error('Failed to fetch subscription:', subError);
      return failure(500, subscriptionErrorCodes.databaseError, getErrorMessage(subscriptionErrorCodes.databaseError));
    }

    if (!subscription) {
      return failure(
        404,
        subscriptionErrorCodes.subscriptionNotFound,
        getErrorMessage(subscriptionErrorCodes.subscriptionNotFound),
      );
    }

    // 2. 새 빌링키 발급
    let billingKeyResult;
    try {
      billingKeyResult = await tossClient.issueBillingKey({
        authKey,
        customerKey: clerkUserId,
        customerEmail: userEmail,
        customerName: userName,
      });
    } catch (error: any) {
      console.error('Failed to issue billing key:', error);
      if (error instanceof TossPaymentsError) {
        return failure(
          400,
          subscriptionErrorCodes.billingKeyIssueFailed,
          error.message || getErrorMessage(subscriptionErrorCodes.billingKeyIssueFailed),
        );
      }
      return failure(
        500,
        subscriptionErrorCodes.billingKeyIssueFailed,
        getErrorMessage(subscriptionErrorCodes.billingKeyIssueFailed),
      );
    }

    const { billingKey, card, cardNumber } = billingKeyResult;
    const cardLast4 = card?.number?.slice(-4) || cardNumber?.slice(-4) || '****';
    const cardType = card?.cardType || '신용';

    // 3. 기존 빌링키 삭제
    if (subscription.billing_key) {
      try {
        await tossClient.deleteBillingKey(subscription.billing_key);
      } catch (deleteError) {
        console.warn('Failed to delete old billing key:', deleteError);
      }
    }

    // 4. 구독 정보 업데이트
    const { error: updateError } = await client
      .from('subscriptions')
      .update({
        billing_key: billingKey,
        card_last_4digits: cardLast4,
        card_type: cardType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('Failed to update subscription:', updateError);
      // 업데이트 실패 시 새 빌링키 삭제
      try {
        await tossClient.deleteBillingKey(billingKey);
      } catch (cleanupError) {
        console.error('Failed to cleanup billing key:', cleanupError);
      }
      return failure(500, subscriptionErrorCodes.databaseError, getErrorMessage(subscriptionErrorCodes.databaseError));
    }

    return success({
      subscription_id: subscription.id,
      subscription_tier: SUBSCRIPTION_TIERS.PRO as 'pro',
      subscription_status: subscription.subscription_status as 'active',
      next_payment_date: subscription.next_payment_date,
      effective_until: subscription.effective_until,
      card_last_4digits: cardLast4,
      card_type: cardType,
      price: subscription.price,
      auto_renewal: subscription.auto_renewal,
      monthly_analysis_count: PRO_MONTHLY_ANALYSIS_COUNT,
      remaining_days: null,
    });
  } catch (error: any) {
    console.error('Error in changePaymentCardService:', error);
    return failure(500, subscriptionErrorCodes.internalError, getErrorMessage(subscriptionErrorCodes.internalError));
  }
}

/**
 * 결제 내역 조회
 * @param userId - Clerk User ID (e.g., "user_34k7JqEd8il5046H7aeiCZ1qA9G")
 */
export async function getPaymentHistoryService(
  client: SupabaseClient,
  userId: string,
  limit: number = 20,
  offset: number = 0,
): Promise<HandlerResult<PaymentHistoryResponse, SubscriptionErrorCode, unknown>> {
  try {
    // Clerk ID로 내부 UUID 조회
    const userIdResult = await getUserIdByClerkId(client, userId, subscriptionErrorCodes.unauthorized);
    if (!userIdResult.ok) {
      return userIdResult as HandlerResult<PaymentHistoryResponse, SubscriptionErrorCode, unknown>;
    }
    const internalUserId = userIdResult.data;

    // 결제 내역 조회
    const { data: payments, error: paymentsError, count } = await client
      .from('payments')
      .select('*', { count: 'exact' })
      .eq('user_id', internalUserId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (paymentsError) {
      console.error('Failed to fetch payment history:', paymentsError);
      return failure(500, subscriptionErrorCodes.databaseError, getErrorMessage(subscriptionErrorCodes.databaseError));
    }

    return success({
      payments: payments.map((p) => ({
        id: p.id,
        order_id: p.order_id,
        amount: p.amount,
        payment_method: p.payment_method,
        payment_status: p.payment_status,
        payment_type: p.payment_type,
        approved_at: p.approved_at,
        created_at: p.created_at,
      })),
      total_count: count || 0,
    });
  } catch (error: any) {
    console.error('Error in getPaymentHistoryService:', error);
    return failure(500, subscriptionErrorCodes.internalError, getErrorMessage(subscriptionErrorCodes.internalError));
  }
}
