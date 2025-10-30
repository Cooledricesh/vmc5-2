'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import type { SubscriptionResponse, BillingKeyRequest } from '../lib/dto';

/**
 * 구독 정보 조회 Query Key
 */
export const subscriptionKeys = {
  all: ['subscription'] as const,
  detail: () => [...subscriptionKeys.all, 'detail'] as const,
  payments: () => [...subscriptionKeys.all, 'payments'] as const,
};

/**
 * 현재 사용자의 구독 정보를 조회하는 Hook
 */
export function useSubscriptionQuery() {
  return useQuery({
    queryKey: subscriptionKeys.detail(),
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: SubscriptionResponse }>(
        '/subscription'
      );
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분 (구 cacheTime)
  });
}

/**
 * 빌링키로 구독을 생성하는 Mutation Hook
 */
export function useCreateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BillingKeyRequest) => {
      const response = await apiClient.post<{ success: boolean; data: SubscriptionResponse }>(
        '/subscription/billing-key',
        data
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      // 구독 정보 캐시 무효화 및 업데이트
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      queryClient.setQueryData(subscriptionKeys.detail(), data);
    },
  });
}

/**
 * 구독 해지 Mutation Hook
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { cancellation_reason?: string; feedback?: string }) => {
      const response = await apiClient.delete<{ success: boolean; data: SubscriptionResponse }>(
        '/subscription/cancel',
        { data }
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      queryClient.setQueryData(subscriptionKeys.detail(), data);
    },
  });
}

/**
 * 구독 재활성화 Mutation Hook
 */
export function useReactivateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { option: 'existing_card' | 'new_card'; authKey?: string }) => {
      const response = await apiClient.post<{ success: boolean; data: SubscriptionResponse }>(
        '/subscription/reactivate',
        data
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      queryClient.setQueryData(subscriptionKeys.detail(), data);
    },
  });
}

/**
 * 결제 카드 변경 Mutation Hook
 */
export function useChangeCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { authKey: string }) => {
      const response = await apiClient.post<{ success: boolean; data: SubscriptionResponse }>(
        '/subscription/change-card',
        data
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
      queryClient.setQueryData(subscriptionKeys.detail(), data);
    },
  });
}
