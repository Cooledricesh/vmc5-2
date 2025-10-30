import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSubscriptionByUserId } from '../service';
import { subscriptionErrorCodes } from '../error';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Subscription Service', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    mockSupabaseClient = {
      from: vi.fn(),
    };
  });

  describe('getSubscriptionByUserId', () => {
    it('should handle missing user gracefully and return 500 error', async () => {
      // RED: Test for database errors when user doesn't exist
      // This could cause 500 errors in production
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      // Second call for user info
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'User not found', code: 'PGRST116' },
            }),
          }),
        }),
      });

      const result = await getSubscriptionByUserId(mockSupabaseClient as unknown as SupabaseClient, 'non-existent-user-id');

      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error?.code).toBe(subscriptionErrorCodes.databaseError);
    });

    it('should handle database connection errors', async () => {
      // RED: Test for network/database connection errors
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockRejectedValue(new Error('Connection timeout')),
          }),
        }),
      });

      const result = await getSubscriptionByUserId(mockSupabaseClient as unknown as SupabaseClient, 'test-user-id');

      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error?.code).toBe(subscriptionErrorCodes.internalError);
    });

    it('should successfully return subscription for existing user', async () => {
      const mockUser = {
        id: 'user-123',
        subscription_tier: 'pro',
        monthly_analysis_count: 10,
      };

      const mockSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        subscription_status: 'active',
        next_payment_date: '2024-02-01',
        card_last_4digits: '4242',
        card_type: '신용',
        price: 9900,
        auto_renewal: true,
        billing_key: 'test-billing-key',
        effective_until: null,
      };

      // Mock subscriptions table query
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockSubscription,
              error: null,
            }),
          }),
        }),
      });

      // Mock users table query
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      });

      const result = await getSubscriptionByUserId(mockSupabaseClient as unknown as SupabaseClient, 'user-123');

      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data?.subscription_id).toBe('sub-123');
      expect(result.data?.subscription_tier).toBe('pro');
    });

    it('should return free tier for user without subscription', async () => {
      const mockUser = {
        id: 'user-456',
        subscription_tier: 'free',
        monthly_analysis_count: 5,
      };

      // Mock subscriptions table query (no subscription)
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      // Mock users table query
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUser,
              error: null,
            }),
          }),
        }),
      });

      const result = await getSubscriptionByUserId(mockSupabaseClient as unknown as SupabaseClient, 'user-456');

      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data?.subscription_id).toBeNull();
      expect(result.data?.subscription_tier).toBe('free');
    });

    it('should handle empty userId gracefully', async () => {
      // RED: Edge case - empty userId should be caught earlier but good to test
      const result = await getSubscriptionByUserId(mockSupabaseClient as unknown as SupabaseClient, '');

      // This might cause a database error depending on implementation
      expect(result.ok).toBe(false);
      expect(result.status).toBeGreaterThanOrEqual(400);
    });
  });
});
