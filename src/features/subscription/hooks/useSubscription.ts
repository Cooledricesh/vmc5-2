'use client';

import { useMemo } from 'react';
import { useSubscriptionContext } from '../context/SubscriptionContext';
import type { SubscriptionState } from '../lib/types';

/**
 * 구독 정보만 필요한 경우 사용하는 Hook
 */
export function useSubscription(): SubscriptionState {
  const { state } = useSubscriptionContext();
  return state.subscription;
}

/**
 * 구독 상태 관련 파생 데이터 Hook
 */
export function useSubscriptionStatus() {
  const subscription = useSubscription();

  const status = useMemo(() => {
    const isActive = subscription.subscription_status === 'active';
    const isPendingCancellation = subscription.subscription_status === 'pending_cancellation';
    const isCancelled = subscription.subscription_status === 'cancelled';
    const isFree = subscription.subscription_tier === 'free' || !subscription.subscription_status;
    const isPro = subscription.subscription_tier === 'pro';

    return {
      isActive,
      isPendingCancellation,
      isCancelled,
      isFree,
      isPro,
      canSubscribe: isFree || isCancelled,
      canCancel: isActive,
      canReactivate: isPendingCancellation,
    };
  }, [subscription]);

  return { subscription, ...status };
}
