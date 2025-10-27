'use client';

import { useCallback } from 'react';
import { useSubscriptionContext } from '../context/SubscriptionContext';

/**
 * 해지 모달 관리 Hook
 */
export function useCancellationModal() {
  const { state, dispatch } = useSubscriptionContext();
  const { cancellationModal } = state;

  const openModal = useCallback(() => {
    dispatch({ type: 'OPEN_CANCELLATION_MODAL' });
  }, [dispatch]);

  const closeModal = useCallback(() => {
    dispatch({ type: 'CLOSE_CANCELLATION_MODAL' });
  }, [dispatch]);

  const selectReason = useCallback(
    (reason: string, feedback?: string) => {
      dispatch({ type: 'SELECT_CANCELLATION_REASON', payload: { reason, feedback } });
    },
    [dispatch],
  );

  const confirmCancellation = useCallback(() => {
    dispatch({ type: 'CONFIRM_CANCELLATION' });
  }, [dispatch]);

  return {
    modal: cancellationModal,
    openModal,
    closeModal,
    selectReason,
    confirmCancellation,
  };
}
