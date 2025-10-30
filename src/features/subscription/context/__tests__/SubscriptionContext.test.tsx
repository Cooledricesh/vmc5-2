import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SubscriptionProvider, useSubscriptionContext } from '../SubscriptionContext';
import * as apiClient from '@/lib/remote/api-client';
import type { ReactNode } from 'react';

// Mock the api-client
vi.mock('@/lib/remote/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('SubscriptionContext', () => {
  const mockApiClient = vi.mocked(apiClient.apiClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <SubscriptionProvider>{children}</SubscriptionProvider>
  );

  describe('Initial subscription fetch', () => {
    it('should handle 500 error gracefully and set error state', async () => {
      // RED: Test for the reported bug - 500 error when fetching subscription
      const mockError = {
        response: {
          status: 500,
          data: {
            ok: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: '내부 서버 오류가 발생했습니다',
            },
          },
        },
      };

      mockApiClient.get.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useSubscriptionContext(), { wrapper });

      // Initially loading should be true
      expect(result.current.state.loading.fetchingSubscription).toBe(true);

      // Wait for the error to be set
      await waitFor(() => {
        expect(result.current.state.loading.fetchingSubscription).toBe(false);
      });

      // Should have error state
      expect(result.current.state.errors.fetchError).toBeTruthy();
      expect(result.current.state.errors.fetchError).toContain('내부 서버 오류');
      expect(result.current.state.subscription.subscription_id).toBeNull();
    });

    it('should handle 401 unauthorized error and set appropriate error message', async () => {
      // RED: Test for authentication failure
      const mockError = {
        response: {
          status: 401,
          data: {
            ok: false,
            error: {
              code: 'UNAUTHORIZED',
              message: '인증이 필요합니다',
            },
          },
        },
      };

      mockApiClient.get.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useSubscriptionContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.loading.fetchingSubscription).toBe(false);
      });

      expect(result.current.state.errors.fetchError).toBeTruthy();
      expect(result.current.state.errors.fetchError).toContain('인증이 필요');
    });

    it('should handle network error without response', async () => {
      // RED: Test for network errors (no response from server)
      const mockError = new Error('Network Error');

      mockApiClient.get.mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useSubscriptionContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.loading.fetchingSubscription).toBe(false);
      });

      expect(result.current.state.errors.fetchError).toBeTruthy();
      expect(result.current.state.errors.fetchError).toContain('구독 정보를 불러올 수 없습니다');
    });

    it('should successfully fetch subscription data', async () => {
      // This should already pass, but let's ensure it works
      const mockSubscriptionData = {
        data: {
          subscription_id: 'sub-123',
          subscription_tier: 'pro',
          subscription_status: 'active',
          next_payment_date: '2024-02-01',
          price: 9900,
          auto_renewal: true,
          monthly_analysis_count: 10,
        },
      };

      mockApiClient.get.mockResolvedValueOnce(mockSubscriptionData);

      const { result } = renderHook(() => useSubscriptionContext(), { wrapper });

      await waitFor(() => {
        expect(result.current.state.loading.fetchingSubscription).toBe(false);
      });

      expect(result.current.state.errors.fetchError).toBeNull();
      expect(result.current.state.subscription.subscription_id).toEqual('sub-123');
    });
  });

  describe('With initialData', () => {
    it('should not fetch subscription if initialData is provided', async () => {
      const initialData = {
        subscription_id: 'sub-initial',
        subscription_tier: 'free' as const,
        subscription_status: null,
        price: 9900,
      };

      const wrapperWithInitialData = ({ children }: { children: ReactNode }) => (
        <SubscriptionProvider initialData={initialData as any}>
          {children}
        </SubscriptionProvider>
      );

      const { result } = renderHook(() => useSubscriptionContext(), {
        wrapper: wrapperWithInitialData,
      });

      // Should not trigger fetch
      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(result.current.state.subscription.subscription_id).toEqual('sub-initial');
      expect(result.current.state.loading.fetchingSubscription).toBe(false);
    });
  });
});
