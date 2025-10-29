import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardSummary, getDashboardStats, getAnalysesList } from './service';
import { dashboardErrorCodes } from './error';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Dashboard Service - Clerk ID Integration', () => {
  let mockSupabase: any;
  const clerkUserId = 'user_34k7JqEd8il5046H7aeiCZ1qA9G'; // Real Clerk ID format
  const internalUserId = '550e8400-e29b-41d4-a716-446655440000'; // UUID format

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn(),
    };
  });

  describe('getDashboardSummary', () => {
    it('🔴 RED: should fail when querying by Clerk ID against UUID column', async () => {
      // Simulate the current broken behavior - querying users.id (UUID) with Clerk ID
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: {
            message: 'invalid input syntax for type uuid: "user_34k7JqEd8il5046H7aeiCZ1qA9G"',
            code: '22P02',
          },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getDashboardSummary(mockSupabase, clerkUserId);

      // This test should FAIL with current implementation
      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      if (!result.ok) {
        expect(result.error.code).toBe(dashboardErrorCodes.databaseError);
        expect(result.error.message).toContain('invalid input syntax for type uuid');
      }
    });

    it('should successfully query user with Clerk ID', async () => {
      const mockUser = {
        id: internalUserId,
        clerk_user_id: clerkUserId,
        name: 'Test User',
        email: 'test@example.com',
        subscription_tier: 'free',
        free_analysis_count: 3,
        monthly_analysis_count: 0,
        subscriptions: null,
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: mockUser,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getDashboardSummary(mockSupabase, clerkUserId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.user.id).toBe(internalUserId);
        expect(mockSupabase.from).toHaveBeenCalledWith('users');
        expect(mockQuery.eq).toHaveBeenCalledWith('clerk_user_id', clerkUserId);
      }
    });
  });

  describe('getDashboardStats', () => {
    it('🔴 RED: should handle user not found when getting stats', async () => {
      // First query - lookup user by Clerk ID (not found)
      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockUserQuery);

      const result = await getDashboardStats(mockSupabase, clerkUserId);

      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      if (!result.ok) {
        expect(result.error.code).toBe(dashboardErrorCodes.userNotFound);
      }
    });

    it('should successfully get stats with Clerk ID', async () => {
      // Mock user lookup
      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: internalUserId },
          error: null,
        }),
      };

      // Mock count queries
      const createMockQuery = (count: number) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ count, error: null }),
      });

      const createMockQueryWithoutGte = (count: number) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count, error: null }),
      });

      mockSupabase.from
        .mockReturnValueOnce(mockUserQuery) // user lookup
        .mockReturnValueOnce(createMockQueryWithoutGte(42)) // total count
        .mockReturnValueOnce(createMockQuery(10)) // monthly count
        .mockReturnValueOnce(createMockQuery(3)); // weekly count

      const result = await getDashboardStats(mockSupabase, clerkUserId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.total_count).toBe(42);
        expect(result.data.monthly_count).toBe(10);
        expect(result.data.this_week_count).toBe(3);
      }
    });
  });

  describe('getAnalysesList', () => {
    it('🔴 RED: should handle user not found when getting analyses list', async () => {
      // User lookup fails
      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockUserQuery);

      const params = {
        period: 'all' as const,
        sort: 'latest' as const,
        page: 1,
        limit: 10,
      };

      const result = await getAnalysesList(mockSupabase, clerkUserId, params);

      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      if (!result.ok) {
        expect(result.error.code).toBe(dashboardErrorCodes.userNotFound);
      }
    });

    it('should successfully get analyses list with Clerk ID', async () => {
      const mockAnalyses = [
        {
          id: 'analysis-1',
          subject_name: '홍길동',
          birth_date: '1990-01-01',
          gender: 'male',
          ai_model: 'gemini-2.0-pro',
          status: 'completed',
          created_at: '2024-01-01T00:00:00Z',
          view_count: 5,
        },
      ];

      // Mock user lookup
      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: internalUserId },
          error: null,
        }),
      };

      const mockCountQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
      };

      const mockListQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockAnalyses, error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockUserQuery) // user lookup
        .mockReturnValueOnce(mockCountQuery) // count query
        .mockReturnValueOnce(mockListQuery); // list query

      const params = {
        period: 'all' as const,
        sort: 'latest' as const,
        page: 1,
        limit: 10,
      };

      const result = await getAnalysesList(mockSupabase, clerkUserId, params);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.analyses).toHaveLength(1);
        expect(result.data.pagination.total_count).toBe(1);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty Clerk ID', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getDashboardSummary(mockSupabase, '');

      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
    });

    it('should handle malformed Clerk ID', async () => {
      const malformedId = 'not-a-valid-clerk-id';

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getDashboardSummary(mockSupabase, malformedId);

      expect(result.ok).toBe(false);
    });

    it('should handle Clerk ID with special characters', async () => {
      const specialClerkId = 'user_34k7JqEd8il5046H7aeiCZ1qA9G!@#';

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getDashboardSummary(mockSupabase, specialClerkId);

      expect(result.ok).toBe(false);
    });
  });
});
