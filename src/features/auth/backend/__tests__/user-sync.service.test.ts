import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserSyncService } from '../user-sync.service';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('UserSyncService', () => {
  let mockSupabase: any;
  let service: UserSyncService;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      upsert: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new UserSyncService(mockSupabase as unknown as SupabaseClient);
  });

  describe('getUserByClerkId', () => {
    it('should return user when found', async () => {
      const mockUser = {
        id: 'test-uuid',
        clerk_user_id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockSupabase.single.mockResolvedValue({
        data: mockUser,
        error: null,
      });

      const result = await service.getUserByClerkId('user_123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.eq).toHaveBeenCalledWith('clerk_user_id', 'user_123');
    });

    it('should return success with null data when user not found (PGRST116)', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST116',
          message: 'Row not found',
        },
      });

      const result = await service.getUserByClerkId('user_not_found');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should return error for database errors', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: {
          code: 'PGRST301',
          message: 'Database connection failed',
        },
      });

      const result = await service.getUserByClerkId('user_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database connection failed');
    });
  });

  describe('upsertUser', () => {
    it('=4 RED: should create new user with correct data structure', async () => {
      const userData = {
        clerkUserId: 'user_new_123',
        email: 'newuser@example.com',
        name: 'New User',
        profileImage: 'https://example.com/avatar.jpg',
      };

      mockSupabase.upsert.mockResolvedValue({
        data: { id: 'new-uuid' },
        error: null,
      });

      const result = await service.upsertUser(userData);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          clerk_user_id: 'user_new_123',
          email: 'newuser@example.com',
          name: 'New User',
          profile_image: 'https://example.com/avatar.jpg',
          subscription_tier: 'free',
          free_analysis_count: 3,
          monthly_analysis_count: 0,
        }),
        { onConflict: 'clerk_user_id' }
      );
    });

    it('should update existing user on conflict', async () => {
      const userData = {
        clerkUserId: 'user_existing_123',
        email: 'updated@example.com',
        name: 'Updated User',
        profileImage: null,
      };

      mockSupabase.upsert.mockResolvedValue({
        data: { id: 'existing-uuid' },
        error: null,
      });

      const result = await service.upsertUser(userData);

      expect(result.success).toBe(true);
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          clerk_user_id: 'user_existing_123',
          email: 'updated@example.com',
          name: 'Updated User',
        }),
        { onConflict: 'clerk_user_id' }
      );
    });

    it('should handle database errors during upsert', async () => {
      const userData = {
        clerkUserId: 'user_fail_123',
        email: 'fail@example.com',
        name: 'Fail User',
        profileImage: null,
      };

      mockSupabase.upsert.mockResolvedValue({
        data: null,
        error: {
          message: 'Unique constraint violation',
          code: '23505',
        },
      });

      const result = await service.upsertUser(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unique constraint violation');
    });

    it('should handle unexpected errors during upsert', async () => {
      const userData = {
        clerkUserId: 'user_error_123',
        email: 'error@example.com',
        name: 'Error User',
        profileImage: null,
      };

      mockSupabase.upsert.mockRejectedValue(new Error('Network timeout'));

      const result = await service.upsertUser(userData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });
  });

  describe('createOrUpdateUser', () => {
    it('should create new user when not exists', async () => {
      const userData = {
        clerkUserId: 'user_new_456',
        email: 'new@example.com',
        name: 'Brand New User',
        profileImage: null,
      };

      // Mock select (user not found)
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Mock insert
      mockSupabase.insert.mockResolvedValue({
        data: { id: 'new-uuid' },
        error: null,
      });

      const result = await service.createOrUpdateUser(userData);

      expect(result.success).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          clerk_user_id: 'user_new_456',
          email: 'new@example.com',
          subscription_tier: 'free',
          free_analysis_count: 3,
        })
      );
    });

    it('should update existing user', async () => {
      const userData = {
        clerkUserId: 'user_existing_456',
        email: 'existing@example.com',
        name: 'Existing User',
        profileImage: 'https://example.com/new-avatar.jpg',
      };

      // Reset mockSupabase for this test
      const localMockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'existing-uuid',
            clerk_user_id: 'user_existing_456',
          },
          error: null,
        }),
        update: vi.fn().mockReturnThis(),
      };

      // Mock update chain
      localMockSupabase.eq = vi.fn().mockResolvedValue({
        data: { id: 'existing-uuid' },
        error: null,
      });

      const localService = new UserSyncService(localMockSupabase as unknown as SupabaseClient);
      const result = await localService.createOrUpdateUser(userData);

      expect(result.success).toBe(true);
      expect(localMockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'existing@example.com',
          name: 'Existing User',
          profile_image: 'https://example.com/new-avatar.jpg',
        })
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user by Clerk ID', async () => {
      mockSupabase.delete.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.deleteUser('user_delete_123');

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.eq).toHaveBeenCalledWith('clerk_user_id', 'user_delete_123');
    });
  });

  describe('softDeleteUser', () => {
    it('should soft delete user by setting deleted_at', async () => {
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await service.softDeleteUser('user_soft_delete_123');

      expect(result.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_at: expect.any(String),
        })
      );
    });
  });
});
