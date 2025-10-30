import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSubscriptionQuery, useCreateSubscription } from '../useSubscriptionQuery';
import { apiClient } from '@/lib/remote/api-client';
import type { SubscriptionResponse } from '../../lib/dto';

// Mock API client
vi.mock('@/lib/remote/api-client');

const mockedApiClient = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('useSubscriptionQuery', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useSubscriptionQuery', () => {
    it('구독 정보를 성공적으로 조회해야 함', async () => {
      const mockData: SubscriptionResponse = {
        subscription_id: 'sub-123',
        subscription_tier: 'pro',
        subscription_status: 'active',
        next_payment_date: '2025-11-30',
        effective_until: null,
        card_last_4digits: '1234',
        card_type: '신용',
        price: 9900,
        auto_renewal: true,
        monthly_analysis_count: 10,
        remaining_days: null,
      };

      mockedApiClient.get.mockResolvedValueOnce({
        data: { success: true, data: mockData },
      });

      const { result } = renderHook(() => useSubscriptionQuery(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
      expect(mockedApiClient.get).toHaveBeenCalledWith('/subscription');
    });

    it('인증 실패 시 401 에러를 처리해야 함', async () => {
      mockedApiClient.get.mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            success: false,
            error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다' },
          },
        },
      });

      const { result } = renderHook(() => useSubscriptionQuery(), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('무료 사용자의 경우 기본 구독 정보를 반환해야 함', async () => {
      const mockFreeUser: SubscriptionResponse = {
        subscription_id: null,
        subscription_tier: 'free',
        subscription_status: null,
        next_payment_date: null,
        effective_until: null,
        card_last_4digits: null,
        card_type: null,
        price: 0,
        auto_renewal: false,
        monthly_analysis_count: 0,
        remaining_days: null,
      };

      mockedApiClient.get.mockResolvedValueOnce({
        data: { success: true, data: mockFreeUser },
      });

      const { result } = renderHook(() => useSubscriptionQuery(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.subscription_tier).toBe('free');
      expect(result.current.data?.subscription_id).toBeNull();
    });
  });

  describe('useCreateSubscription', () => {
    it('빌링키로 구독을 생성해야 함', async () => {
      const mockResponse: SubscriptionResponse = {
        subscription_id: 'sub-456',
        subscription_tier: 'pro',
        subscription_status: 'active',
        next_payment_date: '2025-11-30',
        effective_until: null,
        card_last_4digits: '5678',
        card_type: '신용',
        price: 9900,
        auto_renewal: true,
        monthly_analysis_count: 10,
        remaining_days: null,
      };

      mockedApiClient.post.mockResolvedValueOnce({
        data: { success: true, data: mockResponse },
      });

      const { result } = renderHook(() => useCreateSubscription(), { wrapper });

      const authKey = 'auth_test_key';
      const customerKey = 'customer_123';

      result.current.mutate({ authKey, customerKey });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(mockedApiClient.post).toHaveBeenCalledWith('/subscription/billing-key', {
        authKey,
        customerKey,
      });
    });

    it('이미 구독 중인 경우 에러를 반환해야 함', async () => {
      mockedApiClient.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            success: false,
            error: {
              code: 'ALREADY_SUBSCRIBED',
              message: '이미 Pro 구독 중입니다',
            },
          },
        },
      });

      const { result } = renderHook(() => useCreateSubscription(), { wrapper });

      result.current.mutate({ authKey: 'auth_key', customerKey: 'cus_123' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('결제 실패 시 에러를 반환해야 함', async () => {
      mockedApiClient.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            success: false,
            error: {
              code: 'INITIAL_PAYMENT_FAILED',
              message: '결제에 실패했습니다. 카드 정보를 확인해주세요',
            },
          },
        },
      });

      const { result } = renderHook(() => useCreateSubscription(), { wrapper });

      result.current.mutate({ authKey: 'auth_key', customerKey: 'cus_123' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });
});
