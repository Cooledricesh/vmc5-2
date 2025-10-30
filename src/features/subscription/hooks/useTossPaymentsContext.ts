'use client';

import { useEffect } from 'react';
import { useSubscriptionContext } from '../context/SubscriptionContext';
import { SDK_LOAD_TIMEOUT } from '../lib/constants';
import { getClientEnv } from '@/backend/config/env';

/**
 * 토스페이먼츠 SDK 로딩 Hook
 */
export function useTossPayments() {
  const { state, dispatch } = useSubscriptionContext();
  const { tossSDK } = state;

  useEffect(() => {
    // SDK가 이미 로드되었거나 로딩 중이면 중복 로드 방지
    if (tossSDK.isLoaded || tossSDK.isReady) {
      return;
    }

    // 결제 프로세스가 SDK 로딩 단계가 아니면 실행하지 않음
    if (state.paymentProcess.step !== 'loading_sdk') {
      return;
    }

    loadTossPaymentsSDK();
  }, [state.paymentProcess.step, tossSDK.isLoaded, tossSDK.isReady]);

  const loadTossPaymentsSDK = async () => {
    dispatch({ type: 'LOAD_SDK_START' });

    try {
      const env = getClientEnv();
      const clientKey = env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

      if (!clientKey) {
        throw new Error('토스페이먼츠 클라이언트 키가 설정되지 않았습니다');
      }

      // 동적 import로 SDK 로드
      const { loadTossPayments } = await Promise.race([
        import('@tosspayments/tosspayments-sdk'),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SDK 로딩 시간 초과')), SDK_LOAD_TIMEOUT),
        ),
      ]);

      const tossPayments = await loadTossPayments(clientKey);

      // TODO: customerKey는 Clerk user ID로 설정
      const payment = tossPayments.payment({
        customerKey: 'CUSTOMER_KEY_PLACEHOLDER',
      });

      dispatch({
        type: 'LOAD_SDK_SUCCESS',
        payload: {
          instance: tossPayments,
          payment,
        },
      });
    } catch (error: any) {
      console.error('Failed to load TossPayments SDK:', error);
      dispatch({
        type: 'LOAD_SDK_FAILURE',
        payload: { error: error.message || '토스페이먼츠 SDK 로딩에 실패했습니다' },
      });
    }
  };

  return {
    tossSDK,
    isLoading: state.paymentProcess.step === 'loading_sdk',
    error: tossSDK.loadError,
  };
}
