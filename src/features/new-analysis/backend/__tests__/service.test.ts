import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserAnalysisCount, createNewAnalysis, getAnalysisStatus } from '../service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NewAnalysisRequest } from '../schema';

describe('New Analysis Service', () => {
  let mockSupabase: any;

  beforeEach(() => {
    const createMockChain = () => ({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      single: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    });

    mockSupabase = createMockChain();

    // eq가 호출될 때마다 새로운 체인을 반환하도록 설정
    mockSupabase.eq = vi.fn().mockReturnValue({
      ...createMockChain(),
      maybeSingle: mockSupabase.maybeSingle,
      single: mockSupabase.single,
    });
  });

  describe('getUserAnalysisCount', () => {
    it('🔴 RED: should query users by clerk_user_id, not by id', async () => {
      const clerkUserId = 'user_34k7JqEd8il5046H7aeiCZ1qA9G';
      const mockUserData = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        clerk_user_id: clerkUserId,
        subscription_tier: 'free',
        free_analysis_count: 3,
        monthly_analysis_count: 0,
      };

      mockSupabase.maybeSingle.mockResolvedValue({
        data: mockUserData,
        error: null,
      });

      const result = await getUserAnalysisCount(mockSupabase as unknown as SupabaseClient, clerkUserId);

      expect(result.ok).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.select).toHaveBeenCalledWith('subscription_tier, free_analysis_count, monthly_analysis_count');

      // 🔴 이 테스트는 실패해야 합니다 - 현재 코드는 eq('id', userId)를 사용하고 있음
      expect(mockSupabase.eq).toHaveBeenCalledWith('clerk_user_id', clerkUserId);
    });

    it('should return error when user not found', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getUserAnalysisCount(mockSupabase as unknown as SupabaseClient, 'user_nonexistent');

      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
    });

    it('should handle database errors', async () => {
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await getUserAnalysisCount(mockSupabase as unknown as SupabaseClient, 'user_123');

      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
    });
  });

  describe('createNewAnalysis - integration behavior', () => {
    it('should fail when user not found', async () => {
      const clerkUserId = 'user_nonexistent';
      const request: NewAnalysisRequest = {
        subject_name: '홍길동',
        birth_date: '1990-01-01',
        birth_time: '12:00',
        gender: 'male',
      };

      // Mock: getUserIdByClerkId - user not found
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await createNewAnalysis(
        mockSupabase as unknown as SupabaseClient,
        clerkUserId,
        'free',
        request,
        'test-api-key'
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
    });
  });

  describe('getAnalysisStatus', () => {
    it('🔴 RED: should verify user ownership using internal UUID, not Clerk ID', async () => {
      const analysisId = 'analysis-123';
      const clerkUserId = 'user_34k7JqEd8il5046H7aeiCZ1qA9G';
      const internalUuid = '550e8400-e29b-41d4-a716-446655440000';

      // Step 1: getUserIdByClerkId should be called first (not implemented yet)
      // Step 2: Then query analyses with internal UUID

      mockSupabase.maybeSingle.mockResolvedValue({
        data: {
          id: analysisId,
          user_id: internalUuid, // 이것은 UUID여야 함
          status: 'completed',
          analysis_result: {},
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
        error: null,
      });

      const result = await getAnalysisStatus(
        mockSupabase as unknown as SupabaseClient,
        analysisId,
        clerkUserId // 현재는 Clerk ID를 직접 전달하지만, 내부적으로 UUID로 변환해야 함
      );

      // 🔴 현재는 성공하지만, 실제 DB에서는 user_id가 UUID이므로
      // clerkUserId와 비교하면 실패함
      expect(result.ok).toBe(true);
    });
  });
});
