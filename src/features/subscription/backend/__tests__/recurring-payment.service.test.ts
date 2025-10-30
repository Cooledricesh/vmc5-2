/**
 * RED Phase: 정기결제 자동 처리 서비스 로직 테스트
 * UC-007: 정기결제 자동 처리
 *
 * 테스트 시나리오:
 * 1. 오늘 결제 대상 구독자 조회
 * 2. 단일 구독자 자동 결제 처리 (성공)
 * 3. 결제 실패 시 재시도 카운트 증가
 * 4. 3회 실패 후 구독 정지 처리
 * 5. 결제 성공 시 사용자 monthly_analysis_count 리셋
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { TossPaymentsClient, TossPaymentsError } from '@/lib/external/tosspayments-client';
import {
  getPaymentTargetsService,
  processRecurringPaymentService,
  handlePaymentSuccessService,
  handlePaymentFailureService,
  suspendSubscriptionService,
} from '../recurring-payment.service';

// Mock Supabase Client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('정기결제 자동 처리 서비스', () => {
  let mockSupabaseClient: any;
  let mockTossClient: any;

  beforeEach(() => {
    // Supabase Client Mock
    mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
    };

    // TossPayments Client Mock
    mockTossClient = {
      executePayment: vi.fn(),
      deleteBillingKey: vi.fn(),
    };

    vi.clearAllMocks();
  });

  describe('getPaymentTargetsService - 결제 대상 조회', () => {
    it('오늘 결제 대상인 active 구독자를 조회해야 한다', async () => {
      // Arrange
      const today = new Date().toISOString().split('T')[0];
      const mockData = [
        {
          id: 'sub-1',
          user_id: 'user-1',
          billing_key: 'billing-key-1',
          price: 9900,
          next_payment_date: today,
          retry_count: 0,
          users: {
            email: 'user1@example.com',
            name: '홍길동',
            clerk_user_id: 'clerk-user-1',
          },
        },
        {
          id: 'sub-2',
          user_id: 'user-2',
          billing_key: 'billing-key-2',
          price: 9900,
          next_payment_date: today,
          retry_count: 1,
          users: {
            email: 'user2@example.com',
            name: '김철수',
            clerk_user_id: 'clerk-user-2',
          },
        },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      });

      // Act
      const result = await getPaymentTargetsService(mockSupabaseClient);

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(2);
      }
    });

    it('결제 대상이 없으면 빈 배열을 반환해야 한다', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      // Act
      const result = await getPaymentTargetsService(mockSupabaseClient);

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([]);
      }
    });

    it('데이터베이스 조회 실패 시 에러를 반환해야 한다', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      // Act
      const result = await getPaymentTargetsService(mockSupabaseClient);

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(500);
      }
    });
  });

  describe('processRecurringPaymentService - 자동 결제 처리', () => {
    const mockSubscription = {
      subscription_id: 'sub-1',
      user_id: 'user-1',
      billing_key: 'billing-key-1',
      price: 9900,
      retry_count: 0,
    };

    const mockUser = {
      clerk_user_id: 'clerk-user-1',
      email: 'user@example.com',
      name: '홍길동',
    };

    it('빌링키로 자동 결제를 성공적으로 처리해야 한다', async () => {
      // Arrange
      const mockPaymentResult = {
        paymentKey: 'pay-key-1',
        orderId: 'SUBSCRIPTION_20251030_user-1',
        status: 'DONE',
        approvedAt: '2025-10-30T02:00:15+09:00',
        totalAmount: 9900,
        method: '카드',
      };

      mockTossClient.executePayment.mockResolvedValue(mockPaymentResult);

      // Act
      const result = await processRecurringPaymentService(
        mockSupabaseClient,
        mockTossClient,
        mockSubscription,
        mockUser,
      );

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({
          subscription_id: 'sub-1',
          user_id: 'user-1',
          payment_key: 'pay-key-1',
          status: 'success',
          amount: 9900,
        });
      }
      expect(mockTossClient.executePayment).toHaveBeenCalledWith({
        billingKey: 'billing-key-1',
        customerKey: 'clerk-user-1',
        amount: 9900,
        orderId: expect.stringContaining('SUBSCRIPTION_'),
        orderName: 'VMC5 Pro 요금제 월 구독료',
        customerEmail: 'user@example.com',
        customerName: '홍길동',
      });
    });

    it('토스페이먼츠 API 호출 실패 시 에러를 반환해야 한다', async () => {
      // Arrange
      const tossError = new TossPaymentsError(
        '카드 유효기간이 만료되었습니다',
        'INVALID_CARD_EXPIRATION',
        400,
      );

      mockTossClient.executePayment.mockRejectedValue(tossError);

      // Act
      const result = await processRecurringPaymentService(
        mockSupabaseClient,
        mockTossClient,
        mockSubscription,
        mockUser,
      );

      // Assert
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(400);
        expect(result.error.code).toBe('PAYMENT_SERVICE_ERROR');
      }
    });
  });

  describe('handlePaymentSuccessService - 결제 성공 처리', () => {
    it('결제 성공 시 payments INSERT, subscriptions UPDATE, users UPDATE를 수행해야 한다', async () => {
      // Arrange
      const paymentData = {
        user_id: 'user-1',
        subscription_id: 'sub-1',
        order_id: 'SUBSCRIPTION_20251030_user-1',
        payment_key: 'pay-key-1',
        amount: 9900,
        approved_at: '2025-10-30T02:00:15+09:00',
      };

      mockSupabaseClient.from.mockImplementation((table: string) => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }));

      // Act
      const result = await handlePaymentSuccessService(mockSupabaseClient, paymentData);

      // Assert
      expect(result.ok).toBe(true);
    });

    it('next_payment_date를 1개월 후로 업데이트해야 한다', async () => {
      // Arrange
      const paymentData = {
        user_id: 'user-1',
        subscription_id: 'sub-1',
        order_id: 'SUBSCRIPTION_20251030_user-1',
        payment_key: 'pay-key-1',
        amount: 9900,
        approved_at: '2025-10-30T02:00:15+09:00',
      };

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return { update: mockUpdate };
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      });

      // Act
      await handlePaymentSuccessService(mockSupabaseClient, paymentData);

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          retry_count: 0,
        }),
      );
    });

    it('monthly_analysis_count를 10으로 리셋해야 한다', async () => {
      // Arrange
      const paymentData = {
        user_id: 'user-1',
        subscription_id: 'sub-1',
        order_id: 'SUBSCRIPTION_20251030_user-1',
        payment_key: 'pay-key-1',
        amount: 9900,
        approved_at: '2025-10-30T02:00:15+09:00',
      };

      const mockUpdateUsers = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return { update: mockUpdateUsers };
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      });

      // Act
      await handlePaymentSuccessService(mockSupabaseClient, paymentData);

      // Assert
      expect(mockUpdateUsers).toHaveBeenCalledWith({
        monthly_analysis_count: 10,
        updated_at: expect.any(String),
      });
    });
  });

  describe('handlePaymentFailureService - 결제 실패 처리', () => {
    it('결제 실패 시 payments INSERT와 retry_count 증가를 수행해야 한다', async () => {
      // Arrange
      const failureData = {
        user_id: 'user-1',
        subscription_id: 'sub-1',
        order_id: 'SUBSCRIPTION_20251030_user-1',
        amount: 9900,
        error_code: 'INVALID_CARD_EXPIRATION',
        error_message: '카드 유효기간이 만료되었습니다',
        current_retry_count: 0,
      };

      mockSupabaseClient.from.mockImplementation((table: string) => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }));

      // Act
      const result = await handlePaymentFailureService(mockSupabaseClient, failureData);

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.retry_count).toBe(1);
      }
    });

    it('retry_count가 2회 미만일 때는 재시도 가능 상태로 반환해야 한다', async () => {
      // Arrange
      const failureData = {
        user_id: 'user-1',
        subscription_id: 'sub-1',
        order_id: 'SUBSCRIPTION_20251030_user-1',
        amount: 9900,
        error_code: 'INVALID_CARD_EXPIRATION',
        error_message: '카드 유효기간이 만료되었습니다',
        current_retry_count: 1,
      };

      mockSupabaseClient.from.mockImplementation((table: string) => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }));

      // Act
      const result = await handlePaymentFailureService(mockSupabaseClient, failureData);

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.retry_count).toBe(2);
        expect(result.data.should_suspend).toBe(false);
      }
    });

    it('retry_count가 3회 이상일 때는 구독 정지 플래그를 반환해야 한다', async () => {
      // Arrange
      const failureData = {
        user_id: 'user-1',
        subscription_id: 'sub-1',
        order_id: 'SUBSCRIPTION_20251030_user-1',
        amount: 9900,
        error_code: 'INVALID_CARD_EXPIRATION',
        error_message: '카드 유효기간이 만료되었습니다',
        current_retry_count: 2,
      };

      mockSupabaseClient.from.mockImplementation((table: string) => ({
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }));

      // Act
      const result = await handlePaymentFailureService(mockSupabaseClient, failureData);

      // Assert
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.retry_count).toBe(3);
        expect(result.data.should_suspend).toBe(true);
      }
    });
  });

  describe('suspendSubscriptionService - 구독 정지 처리', () => {
    it('3회 결제 실패 후 구독을 suspended 상태로 변경해야 한다', async () => {
      // Arrange
      const subscriptionId = 'sub-1';
      const userId = 'user-1';
      const billingKey = 'billing-key-1';

      mockSupabaseClient.from.mockImplementation((table: string) => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }));

      mockTossClient.deleteBillingKey.mockResolvedValue(undefined);

      // Act
      const result = await suspendSubscriptionService(
        mockSupabaseClient,
        mockTossClient,
        subscriptionId,
        userId,
        billingKey,
      );

      // Assert
      expect(result.ok).toBe(true);
      expect(mockTossClient.deleteBillingKey).toHaveBeenCalledWith(billingKey);
    });

    it('구독 정지 시 subscription_status를 suspended로 변경해야 한다', async () => {
      // Arrange
      const subscriptionId = 'sub-1';
      const userId = 'user-1';
      const billingKey = 'billing-key-1';

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'subscriptions') {
          return { update: mockUpdate };
        }
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      });

      mockTossClient.deleteBillingKey.mockResolvedValue(undefined);

      // Act
      await suspendSubscriptionService(
        mockSupabaseClient,
        mockTossClient,
        subscriptionId,
        userId,
        billingKey,
      );

      // Assert
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: 'suspended',
          billing_key: null,
          auto_renewal: false,
          cancellation_reason: '결제 실패 (3회)',
        }),
      );
    });

    it('구독 정지 시 사용자를 free 티어로 변경해야 한다', async () => {
      // Arrange
      const subscriptionId = 'sub-1';
      const userId = 'user-1';
      const billingKey = 'billing-key-1';

      const mockUpdateUsers = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'users') {
          return { update: mockUpdateUsers };
        }
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      });

      mockTossClient.deleteBillingKey.mockResolvedValue(undefined);

      // Act
      await suspendSubscriptionService(
        mockSupabaseClient,
        mockTossClient,
        subscriptionId,
        userId,
        billingKey,
      );

      // Assert
      expect(mockUpdateUsers).toHaveBeenCalledWith({
        subscription_tier: 'free',
        monthly_analysis_count: 0,
        updated_at: expect.any(String),
      });
    });

    it('빌링키 삭제 실패 시에도 구독 정지를 계속 진행해야 한다', async () => {
      // Arrange
      const subscriptionId = 'sub-1';
      const userId = 'user-1';
      const billingKey = 'billing-key-1';

      mockSupabaseClient.from.mockImplementation((table: string) => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }));

      mockTossClient.deleteBillingKey.mockRejectedValue(
        new TossPaymentsError('Already deleted', 'ALREADY_DELETED_BILLING_KEY'),
      );

      // Act
      const result = await suspendSubscriptionService(
        mockSupabaseClient,
        mockTossClient,
        subscriptionId,
        userId,
        billingKey,
      );

      // Assert
      expect(result.ok).toBe(true);
    });
  });
});
