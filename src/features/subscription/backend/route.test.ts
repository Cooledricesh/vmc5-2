import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '@/backend/hono/context';
import { getSupabase, getUserId as getContextUserId } from '@/backend/hono/context';
import { getUserId as getAuthUserId, getUserEmail } from '@/backend/middleware/auth';
import { registerSubscriptionRoutes } from './route';
import * as service from './service';
import { subscriptionErrorCodes } from './error';
import { SUBSCRIPTION_TIERS, SUBSCRIPTION_STATUS, SUBSCRIPTION_PRICE, PRO_MONTHLY_ANALYSIS_COUNT } from './constants';

// Mock the auth middleware
vi.mock('@/backend/middleware/auth', () => ({
  withClerkAuth: vi.fn(() => async (c: any, next: any) => {
    await next();
  }),
  getUserId: vi.fn(),
  getUserEmail: vi.fn(),
}));

// Mock the context helpers
vi.mock('@/backend/hono/context', () => ({
  getSupabase: vi.fn(),
  getUserId: vi.fn(),
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

// Mock the config
vi.mock('@/backend/config/env', () => ({
  getServerEnv: vi.fn(() => ({
    TOSS_SECRET_KEY: 'test_secret_key',
  })),
}));

// Mock the TossPayments client
vi.mock('@/lib/external/tosspayments-client', () => ({
  getTossPaymentsClient: vi.fn(() => ({})),
  TossPaymentsError: class TossPaymentsError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'TossPaymentsError';
    }
  },
}));

describe('Subscription Routes', () => {
  let app: Hono<AppEnv>;
  let mockSupabase: any;
  const mockUserId = 'test-user-id';
  const mockClerkUserId = 'clerk-user-id';
  const mockUserEmail = 'test@example.com';
  const mockUserName = 'Test User';
  const mockedGetSupabase = vi.mocked(getSupabase);
  const mockedGetContextUserId = vi.mocked(getContextUserId);
  const mockedGetAuthUserId = vi.mocked(getAuthUserId);
  const mockedGetUserEmail = vi.mocked(getUserEmail);

  beforeEach(() => {
    app = new Hono<AppEnv>();
    registerSubscriptionRoutes(app);

    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: mockUserId,
                clerk_user_id: mockClerkUserId,
                email: mockUserEmail,
                name: mockUserName,
              },
              error: null,
            })),
          })),
        })),
      })),
    };

    // Setup context mocks
    mockedGetSupabase.mockReturnValue(mockSupabase);
    mockedGetContextUserId.mockReturnValue(mockUserId);
    mockedGetAuthUserId.mockReturnValue(mockUserId);
    mockedGetUserEmail.mockReturnValue(mockUserEmail);

    // Clear all service mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/subscription', () => {
    it('should return subscription data for authenticated user', async () => {
      // Mock successful service response
      const mockSubscription = {
        subscription_id: 'sub-123',
        subscription_tier: SUBSCRIPTION_TIERS.PRO,
        subscription_status: SUBSCRIPTION_STATUS.ACTIVE,
        next_payment_date: '2024-02-01',
        effective_until: null,
        card_last_4digits: '4242',
        card_type: '신용',
        price: SUBSCRIPTION_PRICE,
        auto_renewal: true,
        monthly_analysis_count: PRO_MONTHLY_ANALYSIS_COUNT,
        remaining_days: null,
      };

      vi.spyOn(service, 'getSubscriptionByUserId').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockSubscription,
      });

      const res = await app.request('/subscription', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data).toEqual(mockSubscription);
      expect(service.getSubscriptionByUserId).toHaveBeenCalledWith(mockSupabase, mockUserId);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockedGetAuthUserId.mockReturnValue(null);

      const res = await app.request('/subscription', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(subscriptionErrorCodes.unauthorized);
    });

    it('should return 401 when getUserId returns empty string', async () => {
      // RED: This test reproduces the actual bug
      // When Clerk authentication fails silently, getUserId might return empty string
      mockedGetAuthUserId.mockReturnValue('');

      const res = await app.request('/subscription', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(subscriptionErrorCodes.unauthorized);
      expect(body.error.message).toContain('인증이 필요합니다');
    });

    it('should return 401 when getUserId returns undefined', async () => {
      // RED: Another edge case
      mockedGetAuthUserId.mockReturnValue(undefined as any);

      const res = await app.request('/subscription', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(subscriptionErrorCodes.unauthorized);
    });

    it('should handle service errors correctly', async () => {
      vi.spyOn(service, 'getSubscriptionByUserId').mockResolvedValue({
        ok: false,
        status: 500,
        error: {
          code: subscriptionErrorCodes.databaseError,
          message: '데이터베이스 오류가 발생했습니다',
        },
      });

      const res = await app.request('/subscription', {
        method: 'GET',
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(subscriptionErrorCodes.databaseError);
    });

    it('should return free tier for users without subscription', async () => {
      const mockFreeSubscription = {
        subscription_id: null,
        subscription_tier: SUBSCRIPTION_TIERS.FREE,
        subscription_status: null,
        next_payment_date: null,
        effective_until: null,
        card_last_4digits: null,
        card_type: null,
        price: SUBSCRIPTION_PRICE,
        auto_renewal: false,
        monthly_analysis_count: 5,
        remaining_days: null,
      };

      vi.spyOn(service, 'getSubscriptionByUserId').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockFreeSubscription,
      });

      const res = await app.request('/subscription', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.subscription_tier).toBe(SUBSCRIPTION_TIERS.FREE);
      expect(body.data.subscription_id).toBeNull();
    });
  });

  describe('POST /api/subscription/billing-key', () => {
    it('should create subscription with valid billing key', async () => {
      const mockResponse = {
        subscription_id: 'sub-new-123',
        subscription_tier: SUBSCRIPTION_TIERS.PRO,
        subscription_status: SUBSCRIPTION_STATUS.ACTIVE,
        next_payment_date: '2024-02-01',
        effective_until: null,
        card_last_4digits: '4242',
        card_type: '신용',
        price: SUBSCRIPTION_PRICE,
        auto_renewal: true,
        monthly_analysis_count: PRO_MONTHLY_ANALYSIS_COUNT,
        remaining_days: null,
      };

      vi.spyOn(service, 'createSubscriptionWithPayment').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockResponse,
      });

      const res = await app.request('/subscription/billing-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authKey: 'auth-key-123',
          customerKey: mockClerkUserId,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data).toEqual(mockResponse);
      expect(service.createSubscriptionWithPayment).toHaveBeenCalledWith(
        mockSupabase,
        expect.any(Object), // TossClient
        mockUserId,
        mockClerkUserId,
        'auth-key-123',
        mockUserEmail,
        mockUserName
      );
    });

    it('should return 400 for invalid request body', async () => {
      const res = await app.request('/subscription/billing-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required authKey
          customerKey: mockClerkUserId,
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(subscriptionErrorCodes.validationError);
    });

    it('should handle already subscribed error', async () => {
      vi.spyOn(service, 'createSubscriptionWithPayment').mockResolvedValue({
        ok: false,
        status: 400,
        error: {
          code: subscriptionErrorCodes.alreadySubscribed,
          message: '이미 Pro 구독 중입니다',
        },
      });

      const res = await app.request('/subscription/billing-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authKey: 'auth-key-123',
          customerKey: mockClerkUserId,
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(subscriptionErrorCodes.alreadySubscribed);
    });

    it('should handle user fetch error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: null,
              error: new Error('Database error'),
            })),
          })),
        })),
      });

      const res = await app.request('/subscription/billing-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authKey: 'auth-key-123',
          customerKey: mockClerkUserId,
        }),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(subscriptionErrorCodes.databaseError);
    });

    it('should return 401 when not authenticated', async () => {
      mockedGetAuthUserId.mockReturnValue(null);

      const res = await app.request('/subscription/billing-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authKey: 'auth-key-123',
          customerKey: mockClerkUserId,
        }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(subscriptionErrorCodes.unauthorized);
    });
  });

  describe('DELETE /api/subscription/cancel', () => {
    it('should cancel subscription successfully', async () => {
      const mockResponse = {
        subscription_id: 'sub-123',
        subscription_tier: SUBSCRIPTION_TIERS.PRO,
        subscription_status: SUBSCRIPTION_STATUS.PENDING_CANCELLATION,
        next_payment_date: '2024-02-01',
        effective_until: '2024-02-01',
        card_last_4digits: '4242',
        card_type: '신용',
        price: SUBSCRIPTION_PRICE,
        auto_renewal: false,
        monthly_analysis_count: PRO_MONTHLY_ANALYSIS_COUNT,
        remaining_days: 30,
      };

      vi.spyOn(service, 'cancelSubscriptionService').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockResponse,
      });

      const res = await app.request('/subscription/cancel', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancellation_reason: '가격이 비싸서',
          feedback: '더 저렴한 플랜이 있었으면 좋겠습니다',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.subscription_status).toBe(SUBSCRIPTION_STATUS.PENDING_CANCELLATION);
      expect(body.data.auto_renewal).toBe(false);
      expect(service.cancelSubscriptionService).toHaveBeenCalledWith(
        mockSupabase,
        expect.any(Object),
        mockUserId,
        '가격이 비싸서',
        '더 저렴한 플랜이 있었으면 좋겠습니다'
      );
    });

    it('should handle cancellation without reason and feedback', async () => {
      const mockResponse = {
        subscription_id: 'sub-123',
        subscription_tier: SUBSCRIPTION_TIERS.PRO,
        subscription_status: SUBSCRIPTION_STATUS.PENDING_CANCELLATION,
        next_payment_date: '2024-02-01',
        effective_until: '2024-02-01',
        card_last_4digits: '4242',
        card_type: '신용',
        price: SUBSCRIPTION_PRICE,
        auto_renewal: false,
        monthly_analysis_count: PRO_MONTHLY_ANALYSIS_COUNT,
        remaining_days: 30,
      };

      vi.spyOn(service, 'cancelSubscriptionService').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockResponse,
      });

      const res = await app.request('/subscription/cancel', {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(service.cancelSubscriptionService).toHaveBeenCalledWith(
        mockSupabase,
        expect.any(Object),
        mockUserId,
        undefined,
        undefined
      );
    });

    it('should return error when subscription not found', async () => {
      vi.spyOn(service, 'cancelSubscriptionService').mockResolvedValue({
        ok: false,
        status: 404,
        error: {
          code: subscriptionErrorCodes.subscriptionNotFound,
          message: '구독 정보를 찾을 수 없습니다',
        },
      });

      const res = await app.request('/subscription/cancel', {
        method: 'DELETE',
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(subscriptionErrorCodes.subscriptionNotFound);
    });

    it('should return 401 when not authenticated', async () => {
      mockedGetAuthUserId.mockReturnValue(null);

      const res = await app.request('/subscription/cancel', {
        method: 'DELETE',
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(subscriptionErrorCodes.unauthorized);
    });
  });

  describe('POST /api/subscription/reactivate', () => {
    it('should reactivate subscription with existing card', async () => {
      const mockResponse = {
        subscription_id: 'sub-123',
        subscription_tier: SUBSCRIPTION_TIERS.PRO,
        subscription_status: SUBSCRIPTION_STATUS.ACTIVE,
        next_payment_date: '2024-03-01',
        effective_until: null,
        card_last_4digits: '4242',
        card_type: '신용',
        price: SUBSCRIPTION_PRICE,
        auto_renewal: true,
        monthly_analysis_count: PRO_MONTHLY_ANALYSIS_COUNT,
        remaining_days: null,
      };

      vi.spyOn(service, 'reactivateSubscriptionService').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockResponse,
      });

      const res = await app.request('/subscription/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          option: 'existing_card',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.subscription_status).toBe(SUBSCRIPTION_STATUS.ACTIVE);
      expect(body.data.auto_renewal).toBe(true);
      expect(service.reactivateSubscriptionService).toHaveBeenCalledWith(
        mockSupabase,
        expect.any(Object),
        mockUserId,
        mockClerkUserId,
        'existing_card',
        undefined,
        mockUserEmail,
        mockUserName
      );
    });

    it('should reactivate subscription with new card', async () => {
      const mockResponse = {
        subscription_id: 'sub-123',
        subscription_tier: SUBSCRIPTION_TIERS.PRO,
        subscription_status: SUBSCRIPTION_STATUS.ACTIVE,
        next_payment_date: '2024-03-01',
        effective_until: null,
        card_last_4digits: '5555',
        card_type: '체크',
        price: SUBSCRIPTION_PRICE,
        auto_renewal: true,
        monthly_analysis_count: PRO_MONTHLY_ANALYSIS_COUNT,
        remaining_days: null,
      };

      vi.spyOn(service, 'reactivateSubscriptionService').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockResponse,
      });

      const res = await app.request('/subscription/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          option: 'new_card',
          authKey: 'new-auth-key-456',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.card_last_4digits).toBe('5555');
      expect(service.reactivateSubscriptionService).toHaveBeenCalledWith(
        mockSupabase,
        expect.any(Object),
        mockUserId,
        mockClerkUserId,
        'new_card',
        'new-auth-key-456',
        mockUserEmail,
        mockUserName
      );
    });

    it('should return error when cannot reactivate', async () => {
      vi.spyOn(service, 'reactivateSubscriptionService').mockResolvedValue({
        ok: false,
        status: 400,
        error: {
          code: subscriptionErrorCodes.cannotReactivate,
          message: '재활성화할 수 없는 구독입니다',
        },
      });

      const res = await app.request('/subscription/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          option: 'existing_card',
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(subscriptionErrorCodes.cannotReactivate);
    });

    it('should return 400 for invalid option', async () => {
      const res = await app.request('/subscription/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          option: 'invalid_option',
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(subscriptionErrorCodes.validationError);
    });
  });

  describe('POST /api/subscription/change-card', () => {
    it('should change payment card successfully', async () => {
      const mockResponse = {
        subscription_id: 'sub-123',
        subscription_tier: SUBSCRIPTION_TIERS.PRO,
        subscription_status: SUBSCRIPTION_STATUS.ACTIVE,
        next_payment_date: '2024-02-01',
        effective_until: null,
        card_last_4digits: '9999',
        card_type: '체크',
        price: SUBSCRIPTION_PRICE,
        auto_renewal: true,
        monthly_analysis_count: PRO_MONTHLY_ANALYSIS_COUNT,
        remaining_days: null,
      };

      vi.spyOn(service, 'changePaymentCardService').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockResponse,
      });

      const res = await app.request('/subscription/change-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authKey: 'change-card-auth-789',
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.card_last_4digits).toBe('9999');
      expect(service.changePaymentCardService).toHaveBeenCalledWith(
        mockSupabase,
        expect.any(Object),
        mockUserId,
        mockClerkUserId,
        'change-card-auth-789',
        mockUserEmail,
        mockUserName
      );
    });

    it('should return 400 when authKey is missing', async () => {
      const res = await app.request('/subscription/change-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(subscriptionErrorCodes.validationError);
    });

    it('should handle billing key issue failure', async () => {
      vi.spyOn(service, 'changePaymentCardService').mockResolvedValue({
        ok: false,
        status: 400,
        error: {
          code: subscriptionErrorCodes.billingKeyIssueFailed,
          message: '빌링키 발급에 실패했습니다',
        },
      });

      const res = await app.request('/subscription/change-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authKey: 'invalid-auth-key',
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(subscriptionErrorCodes.billingKeyIssueFailed);
    });
  });

  describe('GET /api/subscription/payments', () => {
    it('should fetch payment history successfully', async () => {
      const mockPayments = [
        {
          id: 'payment-1',
          order_id: 'SUB_test-user-id_1234567890',
          amount: SUBSCRIPTION_PRICE,
          payment_method: 'CARD',
          payment_status: 'DONE',
          payment_type: 'NORMAL',
          approved_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'payment-2',
          order_id: 'SUB_test-user-id_1234567891',
          amount: SUBSCRIPTION_PRICE,
          payment_method: 'CARD',
          payment_status: 'DONE',
          payment_type: 'NORMAL',
          approved_at: '2024-02-01T00:00:00Z',
          created_at: '2024-02-01T00:00:00Z',
        },
      ];

      vi.spyOn(service, 'getPaymentHistoryService').mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          payments: mockPayments,
          total_count: 2,
        },
      });

      const res = await app.request('/subscription/payments', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.payments).toHaveLength(2);
      expect(body.data.total_count).toBe(2);
      expect(service.getPaymentHistoryService).toHaveBeenCalledWith(
        mockSupabase,
        mockUserId,
        20,  // default limit
        0    // default offset
      );
    });

    it('should handle pagination parameters', async () => {
      vi.spyOn(service, 'getPaymentHistoryService').mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          payments: [],
          total_count: 100,
        },
      });

      const res = await app.request('/subscription/payments?limit=10&offset=20', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      expect(service.getPaymentHistoryService).toHaveBeenCalledWith(
        mockSupabase,
        mockUserId,
        10,  // custom limit
        20   // custom offset
      );
    });

    it('should return empty array when no payments exist', async () => {
      vi.spyOn(service, 'getPaymentHistoryService').mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          payments: [],
          total_count: 0,
        },
      });

      const res = await app.request('/subscription/payments', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.payments).toEqual([]);
      expect(body.data.total_count).toBe(0);
    });

    it('should handle database errors', async () => {
      vi.spyOn(service, 'getPaymentHistoryService').mockResolvedValue({
        ok: false,
        status: 500,
        error: {
          code: subscriptionErrorCodes.databaseError,
          message: '데이터베이스 오류가 발생했습니다',
        },
      });

      const res = await app.request('/subscription/payments', {
        method: 'GET',
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(subscriptionErrorCodes.databaseError);
    });

    it('should return 401 when not authenticated', async () => {
      mockedGetAuthUserId.mockReturnValue(null);

      const res = await app.request('/subscription/payments', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(subscriptionErrorCodes.unauthorized);
    });
  });
});