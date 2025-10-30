import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useTossPayments } from '../useTossPayments';

// Mock loadTossPayments function
const mockLoadTossPayments = vi.fn();

// Mock the SDK module
vi.mock('@tosspayments/tosspayments-sdk', () => ({
  loadTossPayments: (...args: unknown[]) => mockLoadTossPayments(...args),
}));

describe('useTossPayments', () => {
  const mockClientKey = 'test_ck_1234567890';

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock environment variable
    vi.stubEnv('NEXT_PUBLIC_TOSS_CLIENT_KEY', mockClientKey);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('토스페이먼츠 SDK를 성공적으로 로드해야 함', async () => {
    const mockTossPayments = {
      payment: vi.fn().mockReturnValue({
        requestBillingAuth: vi.fn(),
      }),
    };

    mockLoadTossPayments.mockResolvedValue(mockTossPayments);

    const { result } = renderHook(() => useTossPayments());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.tossPayments).toBe(mockTossPayments);
    expect(mockLoadTossPayments).toHaveBeenCalledWith(mockClientKey);
  });

  it('SDK 로드 실패 시 에러를 처리해야 함', async () => {
    const mockError = new Error('Failed to load SDK');
    mockLoadTossPayments.mockRejectedValue(mockError);

    const { result } = renderHook(() => useTossPayments());

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isLoaded).toBe(false);
      expect(result.current.tossPayments).toBeNull();
      expect(result.current.error?.message).toBe('Failed to load SDK');
    });
  });

  it('클라이언트 키가 없을 경우 에러를 반환해야 함', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('NEXT_PUBLIC_TOSS_CLIENT_KEY', '');

    const { result } = renderHook(() => useTossPayments());

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error?.message).toContain('Client key');
    expect(mockLoadTossPayments).not.toHaveBeenCalled();
  });

  it('SDK는 한 번만 로드되어야 함 (중복 로드 방지)', async () => {
    const mockTossPayments = {
      payment: vi.fn(),
    };

    mockLoadTossPayments.mockResolvedValue(mockTossPayments);

    const { result, rerender } = renderHook(() => useTossPayments());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(mockLoadTossPayments).toHaveBeenCalledTimes(1);

    // Re-render should not trigger another load
    rerender();

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(mockLoadTossPayments).toHaveBeenCalledTimes(1);
  });

  it('requestBillingAuth를 호출할 수 있어야 함', async () => {
    const mockRequestBillingAuth = vi.fn().mockResolvedValue(undefined);
    const mockPayment = {
      requestBillingAuth: mockRequestBillingAuth,
    };
    const mockTossPayments = {
      payment: vi.fn().mockReturnValue(mockPayment),
    };

    mockLoadTossPayments.mockResolvedValue(mockTossPayments);

    const { result } = renderHook(() => useTossPayments());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    const customerKey = 'customer_123';
    const billingAuthParams = {
      method: 'CARD' as const,
      successUrl: 'http://localhost:3000/subscription/billing-success',
      failUrl: 'http://localhost:3000/subscription/billing-fail',
      customerName: 'Test User',
      customerEmail: 'test@example.com',
    };

    await result.current.requestBillingAuth(customerKey, billingAuthParams);

    expect(mockTossPayments.payment).toHaveBeenCalledWith({ customerKey });
    expect(mockRequestBillingAuth).toHaveBeenCalledWith(billingAuthParams);
  });

  it('SDK가 로드되지 않았을 때 requestBillingAuth 호출 시 에러를 throw해야 함', async () => {
    mockLoadTossPayments.mockRejectedValue(new Error('SDK load failed'));

    const { result } = renderHook(() => useTossPayments());

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    const customerKey = 'customer_123';
    const billingAuthParams = {
      method: 'CARD' as const,
      successUrl: 'http://localhost:3000/subscription/billing-success',
      failUrl: 'http://localhost:3000/subscription/billing-fail',
      customerName: 'Test User',
      customerEmail: 'test@example.com',
    };

    await expect(async () => {
      await result.current.requestBillingAuth(customerKey, billingAuthParams);
    }).rejects.toThrow('토스페이먼츠 SDK가 로드되지 않았습니다');
  });
});
