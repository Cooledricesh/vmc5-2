import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCancelSubscription } from '../useCancelSubscription';
import { apiClient } from '@/lib/remote/api-client';
import type { ReactNode } from 'react';

// Mock API client
vi.mock('@/lib/remote/api-client', () => ({
  apiClient: {
    delete: vi.fn(),
  },
}));

describe('useCancelSubscription', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  describe('구독 해지 성공', () => {
    it('should cancel subscription successfully', async () => {
      const mockResponse = {
        data: {
          subscription_id: '123',
          subscription_tier: 'pro',
          subscription_status: 'pending_cancellation',
          effective_until: '2024-12-31',
        },
      };

      vi.mocked(apiClient.delete).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCancelSubscription(), { wrapper });

      result.current.mutate({
        cancellation_reason: 'expensive',
        feedback: 'Too expensive for me',
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.delete).toHaveBeenCalledWith('/api/subscription/cancel', {
        data: {
          cancellation_reason: 'expensive',
          feedback: 'Too expensive for me',
        },
      });

      expect(result.current.data).toEqual(mockResponse.data);
    });

    it('should cancel subscription without optional fields', async () => {
      const mockResponse = {
        data: {
          subscription_id: '123',
          subscription_tier: 'pro',
          subscription_status: 'pending_cancellation',
        },
      };

      vi.mocked(apiClient.delete).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useCancelSubscription(), { wrapper });

      result.current.mutate({});

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(apiClient.delete).toHaveBeenCalledWith('/api/subscription/cancel', {
        data: {},
      });
    });
  });

  describe('구독 해지 실패', () => {
    it('should handle API error', async () => {
      const mockError = {
        response: {
          data: {
            error: {
              code: 'SUBSCRIPTION_NOT_FOUND',
              message: '활성 구독을 찾을 수 없습니다',
            },
          },
        },
      };

      vi.mocked(apiClient.delete).mockRejectedValueOnce(mockError);

      const { result } = renderHook(() => useCancelSubscription(), { wrapper });

      result.current.mutate({
        cancellation_reason: 'not_useful',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });

    it('should handle network error', async () => {
      vi.mocked(apiClient.delete).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useCancelSubscription(), { wrapper });

      result.current.mutate({
        cancellation_reason: 'temporary',
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });

  describe('로딩 상태', () => {
    it('should track loading state', async () => {
      const mockResponse = { data: { subscription_id: '123' } };
      vi.mocked(apiClient.delete).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockResponse), 100))
      );

      const { result } = renderHook(() => useCancelSubscription(), { wrapper });

      expect(result.current.isPending).toBe(false);

      result.current.mutate({ cancellation_reason: 'expensive' });

      await waitFor(() => expect(result.current.isPending).toBe(true));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.isPending).toBe(false);
    });
  });

  describe('onSuccess 콜백', () => {
    it('should call onSuccess callback when mutation succeeds', async () => {
      const mockResponse = { data: { subscription_id: '123' } };
      const onSuccessMock = vi.fn();

      vi.mocked(apiClient.delete).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(
        () => useCancelSubscription({ onSuccess: onSuccessMock }),
        { wrapper }
      );

      result.current.mutate({ cancellation_reason: 'expensive' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(onSuccessMock).toHaveBeenCalledWith(mockResponse.data);
    });
  });

  describe('onError 콜백', () => {
    it('should call onError callback when mutation fails', async () => {
      const mockError = new Error('API Error');
      const onErrorMock = vi.fn();

      vi.mocked(apiClient.delete).mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () => useCancelSubscription({ onError: onErrorMock }),
        { wrapper }
      );

      result.current.mutate({ cancellation_reason: 'expensive' });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(onErrorMock).toHaveBeenCalledWith(mockError);
    });
  });
});
