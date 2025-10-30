import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRouter, useSearchParams } from 'next/navigation';
import BillingSuccessPage from '../page';
import { useCreateSubscription } from '@/features/subscription/hooks/useSubscriptionQuery';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

// Mock React Query hook
vi.mock('@/features/subscription/hooks/useSubscriptionQuery', () => ({
  useCreateSubscription: vi.fn(),
}));

describe('BillingSuccessPage', () => {
  const mockPush = vi.fn();
  const mockMutate = vi.fn();
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
    });

    (useCreateSubscription as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockMutate,
      mutateAsync: mockMutateAsync,
      isPending: false,
      isSuccess: false,
      isError: false,
    });
  });

  it('authKey와 customerKey가 있을 때 구독 생성을 호출해야 함', async () => {
    const mockSearchParams = new URLSearchParams({
      authKey: 'test_auth_key_123',
      customerKey: 'customer_456',
    });

    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

    render(<BillingSuccessPage />);

    expect(screen.getByText(/결제 처리 중/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        authKey: 'test_auth_key_123',
        customerKey: 'customer_456',
      });
    });
  });

  it('authKey가 없을 때 실패 페이지로 리다이렉트해야 함', async () => {
    const mockSearchParams = new URLSearchParams({
      customerKey: 'customer_456',
    });

    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

    render(<BillingSuccessPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/subscription/billing-fail?code=MISSING_AUTH_KEY&message=%EC%9D%B8%EC%A6%9D%ED%82%A4%EA%B0%80%20%EC%97%86%EC%8A%B5%EB%8B%88%EB%8B%A4'
      );
    });
  });

  it('customerKey가 없을 때 실패 페이지로 리다이렉트해야 함', async () => {
    const mockSearchParams = new URLSearchParams({
      authKey: 'test_auth_key_123',
    });

    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

    render(<BillingSuccessPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/subscription/billing-fail?code=MISSING_CUSTOMER_KEY')
      );
    });
  });

  it('구독 생성 성공 시 성공 페이지로 리다이렉트해야 함', async () => {
    const mockSearchParams = new URLSearchParams({
      authKey: 'test_auth_key_123',
      customerKey: 'customer_456',
    });

    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

    const mockMutateAsync = vi.fn().mockResolvedValue({
      subscription_id: 'sub_789',
      subscription_status: 'active',
    });

    (useCreateSubscription as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockMutate,
      mutateAsync: mockMutateAsync,
      isPending: false,
      isSuccess: false,
      isError: false,
    });

    render(<BillingSuccessPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/subscription/success');
    }, { timeout: 3000 });
  });

  it('구독 생성 실패 시 실패 페이지로 리다이렉트해야 함', async () => {
    const mockSearchParams = new URLSearchParams({
      authKey: 'test_auth_key_123',
      customerKey: 'customer_456',
    });

    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

    const mockError = {
      response: {
        data: {
          error: {
            code: 'INITIAL_PAYMENT_FAILED',
            message: '결제에 실패했습니다',
          },
        },
      },
    };

    const mockMutateAsync = vi.fn().mockRejectedValue(mockError);

    (useCreateSubscription as ReturnType<typeof vi.fn>).mockReturnValue({
      mutate: mockMutate,
      mutateAsync: mockMutateAsync,
      isPending: false,
      isSuccess: false,
      isError: false,
    });

    render(<BillingSuccessPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/subscription/billing-fail?code=INITIAL_PAYMENT_FAILED')
      );
    }, { timeout: 3000 });
  });

  it('로딩 중 메시지를 표시해야 함', () => {
    const mockSearchParams = new URLSearchParams({
      authKey: 'test_auth_key_123',
      customerKey: 'customer_456',
    });

    (useSearchParams as ReturnType<typeof vi.fn>).mockReturnValue(mockSearchParams);

    render(<BillingSuccessPage />);

    expect(screen.getByText(/결제 처리 중/i)).toBeInTheDocument();
    expect(screen.getByText(/잠시만 기다려주세요/i)).toBeInTheDocument();
  });
});
