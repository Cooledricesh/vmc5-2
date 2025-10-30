'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/remote/api-client';
import type { CancellationRequest, SubscriptionResponse } from '../lib/dto';
import { SUBSCRIPTION_QUERY_KEYS } from '../constants/query-keys';

interface CancelSubscriptionOptions {
  onSuccess?: (data: SubscriptionResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * 구독 해지 Mutation Hook
 *
 * @example
 * ```tsx
 * const cancelMutation = useCancelSubscription({
 *   onSuccess: (data) => {
 *     console.log('Subscription cancelled:', data);
 *   },
 *   onError: (error) => {
 *     console.error('Failed to cancel:', error);
 *   },
 * });
 *
 * cancelMutation.mutate({
 *   cancellation_reason: 'expensive',
 *   feedback: 'Too expensive for me',
 * });
 * ```
 */
export function useCancelSubscription(options?: CancelSubscriptionOptions) {
  const queryClient = useQueryClient();

  return useMutation<SubscriptionResponse, Error, CancellationRequest>({
    mutationFn: async (request: CancellationRequest) => {
      const response = await apiClient.delete('/api/subscription/cancel', {
        data: request,
      });
      return response.data;
    },
    onSuccess: (data) => {
      // 구독 정보 캐시 무효화
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEYS.all });

      // 콜백 실행
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      // 에러 콜백 실행
      options?.onError?.(error);
    },
  });
}
