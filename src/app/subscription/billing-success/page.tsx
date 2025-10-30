'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCreateSubscription } from '@/features/subscription/hooks/useSubscriptionQuery';
import { Loader2 } from 'lucide-react';

export default function BillingSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutateAsync } = useCreateSubscription();

  useEffect(() => {
    const processPayment = async () => {
      const authKey = searchParams.get('authKey');
      const customerKey = searchParams.get('customerKey');

      // 파라미터 검증
      if (!authKey) {
        router.push(
          `/subscription/billing-fail?code=MISSING_AUTH_KEY&message=${encodeURIComponent('인증키가 없습니다')}`
        );
        return;
      }

      if (!customerKey) {
        router.push(
          `/subscription/billing-fail?code=MISSING_CUSTOMER_KEY&message=${encodeURIComponent('고객키가 없습니다')}`
        );
        return;
      }

      try {
        // 구독 생성 (빌링키 발급 + 초회 결제)
        await mutateAsync({ authKey, customerKey });

        // 성공 시 성공 페이지로 이동
        router.push('/subscription/success');
      } catch (error: any) {
        // 실패 시 실패 페이지로 이동
        const errorCode =
          error?.response?.data?.error?.code || 'UNKNOWN_ERROR';
        const errorMessage =
          error?.response?.data?.error?.message || '알 수 없는 오류가 발생했습니다';

        router.push(
          `/subscription/billing-fail?code=${errorCode}&message=${encodeURIComponent(errorMessage)}`
        );
      }
    };

    processPayment();
  }, [searchParams, mutateAsync, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
        <h2 className="mt-4 text-lg font-medium text-gray-900">결제 처리 중...</h2>
        <p className="mt-2 text-sm text-gray-500">잠시만 기다려주세요</p>
      </div>
    </div>
  );
}
