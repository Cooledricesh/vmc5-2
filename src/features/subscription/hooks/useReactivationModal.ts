'use client';

import { useCallback } from 'react';
import { useSubscriptionContext } from '../context/SubscriptionContext';

/**
 * 재활성화 모달 관리 Hook
 */
export function useReactivationModal() {
  const { state, dispatch } = useSubscriptionContext();
  const { reactivationModal } = state;

  const openModal = useCallback(() => {
    dispatch({ type: 'OPEN_REACTIVATION_MODAL' });
  }, [dispatch]);

  const closeModal = useCallback(() => {
    dispatch({ type: 'CLOSE_REACTIVATION_MODAL' });
  }, [dispatch]);

  const selectOption = useCallback(
    (option: 'existing_card' | 'new_card') => {
      dispatch({ type: 'SELECT_REACTIVATION_OPTION', payload: { option } });
    },
    [dispatch],
  );

  return {
    modal: reactivationModal,
    openModal,
    closeModal,
    selectOption,
  };
}
