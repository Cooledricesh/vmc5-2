'use client';

import { useCallback } from 'react';
import { useSubscriptionContext } from '../context/SubscriptionContext';

/**
 * 결제 프로세스 관리 Hook
 */
export function usePaymentProcess() {
  const { state, dispatch } = useSubscriptionContext();
  const { paymentProcess, termsAgreement } = state;

  const initiateSubscription = useCallback(() => {
    dispatch({ type: 'INITIATE_SUBSCRIPTION' });
  }, [dispatch]);

  const updateTerms = useCallback(
    (payload: { termsAccepted?: boolean; privacyAccepted?: boolean; autoPaymentAccepted?: boolean }) => {
      dispatch({ type: 'UPDATE_TERMS', payload });
    },
    [dispatch],
  );

  const resetProcess = useCallback(() => {
    dispatch({ type: 'RESET_PAYMENT_PROCESS' });
  }, [dispatch]);

  return {
    process: paymentProcess,
    terms: termsAgreement,
    initiateSubscription,
    updateTerms,
    resetProcess,
  };
}
