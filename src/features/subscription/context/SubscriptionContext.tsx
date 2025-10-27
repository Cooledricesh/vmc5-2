'use client';

import { createContext, useContext, useReducer, useEffect, type ReactNode, type Dispatch } from 'react';
import { subscriptionReducer, initialState, type SubscriptionContextState } from './reducer';
import type { SubscriptionAction } from './actions';
import { apiClient } from '@/lib/remote/api-client';

/**
 * Context 타입
 */
interface SubscriptionContextValue {
  state: SubscriptionContextState;
  dispatch: Dispatch<SubscriptionAction>;
}

/**
 * Context 생성
 */
const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

/**
 * Provider Props
 */
interface SubscriptionProviderProps {
  children: ReactNode;
  initialData?: SubscriptionContextState['subscription'];
}

/**
 * Subscription Provider
 */
export function SubscriptionProvider({ children, initialData }: SubscriptionProviderProps) {
  const [state, dispatch] = useReducer(subscriptionReducer, {
    ...initialState,
    subscription: initialData || initialState.subscription,
  });

  // 초기 구독 정보 조회 (initialData가 없는 경우)
  useEffect(() => {
    if (!initialData) {
      fetchSubscriptionInfo();
    }
  }, [initialData]);

  const fetchSubscriptionInfo = async () => {
    dispatch({ type: 'FETCH_SUBSCRIPTION_START' });
    try {
      const response = await apiClient.get('/api/subscription');
      dispatch({
        type: 'FETCH_SUBSCRIPTION_SUCCESS',
        payload: response.data,
      });
    } catch (error: any) {
      console.error('Failed to fetch subscription:', error);
      dispatch({
        type: 'FETCH_SUBSCRIPTION_FAILURE',
        payload: { error: error.response?.data?.error?.message || '구독 정보를 불러올 수 없습니다' },
      });
    }
  };

  return (
    <SubscriptionContext.Provider value={{ state, dispatch }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

/**
 * Context Hook
 */
export function useSubscriptionContext(): SubscriptionContextValue {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within SubscriptionProvider');
  }
  return context;
}
