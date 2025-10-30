/**
 * React Query 쿼리 키 상수
 */
export const SUBSCRIPTION_QUERY_KEYS = {
  all: ['subscription'] as const,
  detail: () => [...SUBSCRIPTION_QUERY_KEYS.all, 'detail'] as const,
  payments: () => [...SUBSCRIPTION_QUERY_KEYS.all, 'payments'] as const,
} as const;
