'use client';

import type { Dispatch } from 'react';
import { apiClient } from '@/lib/remote/api-client';
import type { SubscriptionAction } from '../context/actions';
import type { BillingKeyRequest, CancellationRequest, ReactivationRequest, ChangeCardRequest } from '../lib/dto';

/**
 * 결제 처리 (빌링키 발급 및 초회 결제)
 */
export async function processPayment(dispatch: Dispatch<SubscriptionAction>, authKey: string, customerKey: string) {
  dispatch({
    type: 'PROCESS_PAYMENT_START',
    payload: { authKey, customerKey },
  });

  try {
    const requestBody: BillingKeyRequest = {
      authKey,
      customerKey,
    };

    const response = await apiClient.post('/api/subscription/billing-key', requestBody);

    dispatch({
      type: 'PROCESS_PAYMENT_SUCCESS',
      payload: response.data,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Failed to process payment:', error);

    const errorCode = error.response?.data?.error?.code || 'UNKNOWN_ERROR';
    const errorMessage = error.response?.data?.error?.message || '결제 처리 중 오류가 발생했습니다';

    dispatch({
      type: 'PROCESS_PAYMENT_FAILURE',
      payload: {
        code: errorCode,
        message: errorMessage,
      },
    });

    return { success: false, error: { code: errorCode, message: errorMessage } };
  }
}

/**
 * 구독 해지
 */
export async function cancelSubscription(
  dispatch: Dispatch<SubscriptionAction>,
  reason: string | null,
  feedback: string,
) {
  dispatch({ type: 'CANCEL_SUBSCRIPTION_START' });

  try {
    const requestBody: CancellationRequest = {
      cancellation_reason: reason || undefined,
      feedback: feedback || undefined,
    };

    const response = await apiClient.delete('/api/subscription/cancel', {
      data: requestBody,
    });

    dispatch({
      type: 'CANCEL_SUBSCRIPTION_SUCCESS',
      payload: response.data,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Failed to cancel subscription:', error);

    const errorMessage = error.response?.data?.error?.message || '해지 처리 중 오류가 발생했습니다';

    dispatch({
      type: 'CANCEL_SUBSCRIPTION_FAILURE',
      payload: { error: errorMessage },
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * 구독 재활성화
 */
export async function reactivateSubscription(
  dispatch: Dispatch<SubscriptionAction>,
  option: 'existing_card' | 'new_card',
  authKey?: string,
) {
  dispatch({ type: 'REACTIVATE_SUBSCRIPTION_START' });

  try {
    const requestBody: ReactivationRequest = {
      option,
      authKey,
    };

    const response = await apiClient.post('/api/subscription/reactivate', requestBody);

    dispatch({
      type: 'REACTIVATE_SUBSCRIPTION_SUCCESS',
      payload: response.data,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Failed to reactivate subscription:', error);

    const errorMessage = error.response?.data?.error?.message || '재활성화 처리 중 오류가 발생했습니다';

    dispatch({
      type: 'REACTIVATE_SUBSCRIPTION_FAILURE',
      payload: { error: errorMessage },
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * 결제 카드 변경
 */
export async function changePaymentCard(dispatch: Dispatch<SubscriptionAction>, authKey: string) {
  dispatch({ type: 'CHANGE_CARD_START' });

  try {
    const requestBody: ChangeCardRequest = {
      authKey,
    };

    const response = await apiClient.post('/api/subscription/change-card', requestBody);

    dispatch({
      type: 'CHANGE_CARD_SUCCESS',
      payload: {
        card_last_4digits: response.data.card_last_4digits,
        card_type: response.data.card_type,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Failed to change payment card:', error);

    const errorMessage = error.response?.data?.error?.message || '카드 변경 중 오류가 발생했습니다';

    dispatch({
      type: 'CHANGE_CARD_FAILURE',
      payload: { error: errorMessage },
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * 구독 정보 새로고침
 */
export async function refreshSubscription(dispatch: Dispatch<SubscriptionAction>) {
  dispatch({ type: 'FETCH_SUBSCRIPTION_START' });

  try {
    const response = await apiClient.get('/api/subscription');

    dispatch({
      type: 'FETCH_SUBSCRIPTION_SUCCESS',
      payload: response.data,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Failed to refresh subscription:', error);

    const errorMessage = error.response?.data?.error?.message || '구독 정보를 불러올 수 없습니다';

    dispatch({
      type: 'FETCH_SUBSCRIPTION_FAILURE',
      payload: { error: errorMessage },
    });

    return { success: false, error: errorMessage };
  }
}
