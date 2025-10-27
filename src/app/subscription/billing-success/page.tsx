'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSubscriptionContext } from '@/features/subscription/context/SubscriptionContext';
import { processPayment } from '@/features/subscription/actions/subscriptionActions';

function BillingSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dispatch } = useSubscriptionContext();

  useEffect(() => {
    const authKey = searchParams.get('authKey');
    const customerKey = searchParams.get('customerKey');

    if (!authKey || !customerKey) {
      router.push('/subscription/billing-fail?code=MISSING_PARAMS');
      return;
    }

    processPayment(dispatch, authKey, customerKey).then((result) => {
      if (result.success) {
        router.push('/subscription/success');
      } else {
        router.push(`/subscription/billing-fail?code=${result.error?.code || 'UNKNOWN'}`);
      }
    });
  }, [searchParams, dispatch, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" />
        <p className="text-lg font-medium">결제 처리 중...</p>
        <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요</p>
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BillingSuccessContent />
    </Suspense>
  );
}
