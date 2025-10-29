import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clerkAuthMiddleware } from '@/backend/middleware/clerk-auth';
import { auth, currentUser } from '@clerk/nextjs/server';
import type { Context } from 'hono';

// Clerk auth 모킹
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn()
}));

// UserSyncService 모킹
vi.mock('@/features/auth/backend/user-sync.service', () => ({
  UserSyncService: vi.fn().mockImplementation(function() {
    return {
      getUserByClerkId: vi.fn(() => Promise.resolve({ success: true, data: null })),
      upsertUser: vi.fn(() => Promise.resolve({ success: true }))
    };
  })
}));

describe('Auth Middleware Integration', () => {
  let mockContext: Partial<Context>;
  let mockNext: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockContext = {
      set: vi.fn(),
      get: vi.fn(),
      json: vi.fn((data, status) => ({
        status,
        data
      }))
    };

    mockNext = vi.fn();
  });

  describe('clerkAuthMiddleware', () => {
    it('인증된 사용자의 경우 userId를 context에 설정해야 함', async () => {
      (auth as any).mockResolvedValue({
        userId: 'user_123'
      });

      await clerkAuthMiddleware(mockContext as Context, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith('userId', 'user_123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('인증되지 않은 사용자의 경우 401 에러를 반환해야 함', async () => {
      (auth as any).mockResolvedValue({
        userId: null
      });

      const result = await clerkAuthMiddleware(mockContext as Context, mockNext);

      expect(mockContext.set).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'UNAUTHORIZED'
        }),
        401
      );
    });

    it('Clerk auth 오류 시 401 에러를 반환해야 함', async () => {
      (auth as any).mockRejectedValue(new Error('Auth failed'));

      const result = await clerkAuthMiddleware(mockContext as Context, mockNext);

      expect(mockContext.set).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'UNAUTHORIZED'
        }),
        401
      );
    });
  });

  describe('Supabase 사용자 확인 통합', () => {
    it('Clerk 인증 후 Supabase DB에서 사용자를 확인해야 함', async () => {
      const clerkUserId = 'user_123';

      (auth as any).mockResolvedValue({
        userId: clerkUserId
      });

      // UserSyncService 모킹
      const mockGetUserByClerkId = vi.fn(() =>
        Promise.resolve({
          success: true,
          data: {
            id: 'uuid_123',
            clerk_user_id: clerkUserId,
            email: 'test@example.com'
          }
        })
      );

      // UserSyncService 생성자 모킹
      const UserSyncService = await import('@/features/auth/backend/user-sync.service');
      (UserSyncService.UserSyncService as any).mockImplementation(function() {
        return {
          getUserByClerkId: mockGetUserByClerkId,
          upsertUser: vi.fn(() => Promise.resolve({ success: true }))
        };
      });

      // Supabase 모킹
      const mockSupabase = {};
      mockContext.get = vi.fn((key) => {
        if (key === 'supabase') return mockSupabase;
        return undefined;
      });

      await clerkAuthMiddleware(mockContext as Context, mockNext);

      // userId가 설정되어야 함
      expect(mockContext.set).toHaveBeenCalledWith('userId', clerkUserId);
      expect(mockGetUserByClerkId).toHaveBeenCalledWith(clerkUserId);
      expect(mockNext).toHaveBeenCalled();
    });

    it('Clerk는 인증되었지만 Supabase에 사용자가 없으면 자동 생성을 시도해야 함', async () => {
      const clerkUserId = 'user_new_123';

      (auth as any).mockResolvedValue({
        userId: clerkUserId
      });

      // Clerk currentUser 모킹
      (currentUser as any).mockResolvedValue({
        id: clerkUserId,
        emailAddresses: [{ emailAddress: 'new@example.com' }],
        firstName: 'New',
        lastName: 'User',
        username: null,
        imageUrl: null
      });

      // UserSyncService 모킹 - 사용자 없음
      const mockGetUserByClerkId = vi.fn(() =>
        Promise.resolve({
          success: true,
          data: null  // 사용자가 없음
        })
      );

      const mockUpsertUser = vi.fn(() =>
        Promise.resolve({
          success: true,
          data: {
            id: 'uuid_new',
            clerk_user_id: clerkUserId
          }
        })
      );

      // UserSyncService 생성자 모킹
      const UserSyncService = await import('@/features/auth/backend/user-sync.service');
      (UserSyncService.UserSyncService as any).mockImplementation(function() {
        return {
          getUserByClerkId: mockGetUserByClerkId,
          upsertUser: mockUpsertUser
        };
      });

      // Supabase 모킹
      const mockSupabase = {};
      mockContext.get = vi.fn((key) => {
        if (key === 'supabase') return mockSupabase;
        return undefined;
      });

      // 미들웨어 실행
      await clerkAuthMiddleware(mockContext as Context, mockNext);

      // 사용자가 생성되고 계속 진행되어야 함
      expect(mockContext.set).toHaveBeenCalledWith('userId', clerkUserId);
      expect(mockGetUserByClerkId).toHaveBeenCalledWith(clerkUserId);
      expect(mockUpsertUser).toHaveBeenCalledWith({
        clerkUserId: clerkUserId,
        email: 'new@example.com',
        name: 'New User',
        profileImage: null
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });
});