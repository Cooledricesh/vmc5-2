'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';

// TossPaymentsInstance 타입을 직접 정의
type TossPaymentsInstance = any;

export interface TossPaymentsBillingAuthParams {
  method: 'CARD';
  successUrl: string;
  failUrl: string;
  customerName: string;
  customerEmail: string;
}

export interface UseTossPaymentsReturn {
  tossPayments: TossPaymentsInstance | null;
  isLoading: boolean;
  isLoaded: boolean;
  error: Error | null;
  requestBillingAuth: (
    customerKey: string,
    params: TossPaymentsBillingAuthParams
  ) => Promise<void>;
}

/**
 * 토스페이먼츠 SDK를 로드하고 빌링키 발급 요청을 관리하는 Hook
 * Context에 독립적이며, 단독으로 사용 가능
 */
export function useTossPayments(): UseTossPaymentsReturn {
  const [tossPayments, setTossPayments] = useState<TossPaymentsInstance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    // 이미 로드되었거나 로딩 중이면 중복 로드 방지
    if (loadingRef.current || isLoaded) {
      return;
    }

    const loadSDK = async () => {
      loadingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

        if (!clientKey) {
          throw new Error('Client key is not configured');
        }

        const sdk = await loadTossPayments(clientKey);
        setTossPayments(sdk);
        setIsLoaded(true);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load SDK');
        setError(error);
      } finally {
        setIsLoading(false);
        loadingRef.current = false;
      }
    };

    loadSDK();
  }, [isLoaded]);

  const requestBillingAuth = useCallback(
    async (customerKey: string, params: TossPaymentsBillingAuthParams) => {
      if (!tossPayments) {
        throw new Error('토스페이먼츠 SDK가 로드되지 않았습니다');
      }

      const payment = tossPayments.payment({ customerKey });
      await payment.requestBillingAuth(params);
    },
    [tossPayments]
  );

  return {
    tossPayments,
    isLoading,
    isLoaded,
    error,
    requestBillingAuth,
  };
}
