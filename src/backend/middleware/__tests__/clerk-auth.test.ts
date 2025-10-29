import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clerkAuthMiddleware, optionalClerkAuth } from '@/backend/middleware/clerk-auth';
import type { Context, Next } from 'hono';
import type { AppEnv } from '@/backend/hono/context';

// Clerk Backend SDK 모킹
vi.mock('@clerk/backend', () => ({
  createClerkClient: vi.fn(() => ({
    users: {
      getUser: vi.fn(),
    },
  })),
  verifyToken: vi.fn(),
}));

// UserSyncService 모킹
vi.mock('@/features/auth/backend/user-sync.service', () => ({
  UserSyncService: vi.fn().mockImplementation(function () {
    return {
      getUserByClerkId: vi.fn(() => Promise.resolve({ success: true, data: null })),
      upsertUser: vi.fn(() => Promise.resolve({ success: true })),
    };
  }),
}));

describe('Clerk Auth Middleware - Bearer Token', () => {
  let mockContext: Partial<Context<AppEnv>>;
  let mockNext: Next;
  let mockVerifyToken: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // 환경 변수 모킹
    process.env.CLERK_SECRET_KEY = 'test_secret_key';

    // verifyToken mock 가져오기
    const { verifyToken } = await import('@clerk/backend');
    mockVerifyToken = verifyToken as any;

    mockContext = {
      req: {
        header: vi.fn(),
      } as any,
      set: vi.fn(),
      get: vi.fn((key: string) => {
        if (key === 'supabase') return {};
        return undefined;
      }),
      json: vi.fn((data, status) => ({
        status,
        data,
      })) as any,
    };

    mockNext = vi.fn();
  });

  describe('clerkAuthMiddleware - Bearer Token Extraction', () => {
    it('Authorization 헤더가 없으면 401 에러를 반환해야 함', async () => {
      (mockContext.req!.header as any).mockReturnValue(undefined);

      await clerkAuthMiddleware(mockContext as Context<AppEnv>, mockNext);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: '인증이 필요합니다',
        }),
        401
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('Bearer가 없는 Authorization 헤더는 401 에러를 반환해야 함', async () => {
      (mockContext.req!.header as any).mockReturnValue('InvalidToken');

      await clerkAuthMiddleware(mockContext as Context<AppEnv>, mockNext);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: '인증이 필요합니다',
        }),
        401
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('유효한 Bearer 토큰이면 토큰을 검증해야 함', async () => {
      const token = 'valid_jwt_token';
      (mockContext.req!.header as any).mockReturnValue(`Bearer ${token}`);

      mockVerifyToken.mockResolvedValue({
        sub: 'user_123',
      });

      await clerkAuthMiddleware(mockContext as Context<AppEnv>, mockNext);

      expect(mockVerifyToken).toHaveBeenCalledWith(token, { secretKey: 'test_secret_key' });
      expect(mockContext.set).toHaveBeenCalledWith('userId', 'user_123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('토큰 검증 실패 시 401 에러를 반환해야 함', async () => {
      (mockContext.req!.header as any).mockReturnValue('Bearer invalid_token');

      mockVerifyToken.mockRejectedValue(new Error('Invalid token'));

      await clerkAuthMiddleware(mockContext as Context<AppEnv>, mockNext);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: expect.stringContaining('토큰 검증 실패'),
        }),
        401
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('토큰에 userId(sub)가 없으면 401 에러를 반환해야 함', async () => {
      (mockContext.req!.header as any).mockReturnValue('Bearer valid_token');

      mockVerifyToken.mockResolvedValue({
        sub: null,
      });

      await clerkAuthMiddleware(mockContext as Context<AppEnv>, mockNext);

      expect(mockContext.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'UNAUTHORIZED',
          message: '유효하지 않은 토큰입니다',
        }),
        401
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('clerkAuthMiddleware - Supabase User Sync', () => {
    it('인증 후 Supabase에서 사용자를 확인해야 함', async () => {
      (mockContext.req!.header as any).mockReturnValue('Bearer valid_token');

      mockVerifyToken.mockResolvedValue({
        sub: 'user_123',
      });

      const mockGetUserByClerkId = vi.fn(() =>
        Promise.resolve({
          success: true,
          data: {
            id: 'uuid_123',
            clerk_user_id: 'user_123',
            email: 'test@example.com',
          },
        })
      );

      const UserSyncService = await import('@/features/auth/backend/user-sync.service');
      (UserSyncService.UserSyncService as any).mockImplementation(function () {
        return {
          getUserByClerkId: mockGetUserByClerkId,
          upsertUser: vi.fn(() => Promise.resolve({ success: true })),
        };
      });

      await clerkAuthMiddleware(mockContext as Context<AppEnv>, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith('userId', 'user_123');
      expect(mockGetUserByClerkId).toHaveBeenCalledWith('user_123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('🔴 RED: 사용자가 Supabase에 없으면 자동으로 생성해야 함', async () => {
      (mockContext.req!.header as any).mockReturnValue('Bearer valid_token');

      mockVerifyToken.mockResolvedValue({
        sub: 'user_new_123',
      });

      const mockGetUserByClerkId = vi.fn(() =>
        Promise.resolve({
          success: true,
          data: null, // 사용자가 없음
        })
      );

      const mockUpsertUser = vi.fn(() =>
        Promise.resolve({
          success: true,
        })
      );

      // Clerk client mock
      const { createClerkClient } = await import('@clerk/backend');
      (createClerkClient as any).mockReturnValue({
        users: {
          getUser: vi.fn(() =>
            Promise.resolve({
              id: 'user_new_123',
              emailAddresses: [{ emailAddress: 'newuser@example.com' }],
              firstName: 'New',
              lastName: 'User',
              imageUrl: 'https://example.com/avatar.jpg',
            })
          ),
        },
      });

      const UserSyncService = await import('@/features/auth/backend/user-sync.service');
      (UserSyncService.UserSyncService as any).mockImplementation(function () {
        return {
          getUserByClerkId: mockGetUserByClerkId,
          upsertUser: mockUpsertUser,
        };
      });

      await clerkAuthMiddleware(mockContext as Context<AppEnv>, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith('userId', 'user_new_123');
      expect(mockGetUserByClerkId).toHaveBeenCalledWith('user_new_123');
      expect(mockUpsertUser).toHaveBeenCalledWith({
        clerkUserId: 'user_new_123',
        email: 'newuser@example.com',
        name: 'New User',
        profileImage: 'https://example.com/avatar.jpg',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('사용자 자동 생성 실패 시에도 인증은 계속 진행되어야 함', async () => {
      (mockContext.req!.header as any).mockReturnValue('Bearer valid_token');

      mockVerifyToken.mockResolvedValue({
        sub: 'user_fail_123',
      });

      const mockGetUserByClerkId = vi.fn(() =>
        Promise.resolve({
          success: true,
          data: null, // 사용자가 없음
        })
      );

      const mockUpsertUser = vi.fn(() =>
        Promise.resolve({
          success: false,
          error: 'Database error',
        })
      );

      // Clerk client mock
      const { createClerkClient } = await import('@clerk/backend');
      (createClerkClient as any).mockReturnValue({
        users: {
          getUser: vi.fn(() =>
            Promise.resolve({
              id: 'user_fail_123',
              emailAddresses: [{ emailAddress: 'fail@example.com' }],
              firstName: 'Fail',
              lastName: 'User',
            })
          ),
        },
      });

      const UserSyncService = await import('@/features/auth/backend/user-sync.service');
      (UserSyncService.UserSyncService as any).mockImplementation(function () {
        return {
          getUserByClerkId: mockGetUserByClerkId,
          upsertUser: mockUpsertUser,
        };
      });

      await clerkAuthMiddleware(mockContext as Context<AppEnv>, mockNext);

      // 사용자 생성 실패해도 인증은 성공해야 함
      expect(mockContext.set).toHaveBeenCalledWith('userId', 'user_fail_123');
      expect(mockNext).toHaveBeenCalled();
    });

    it('Clerk API 호출 실패 시에도 인증은 계속 진행되어야 함', async () => {
      (mockContext.req!.header as any).mockReturnValue('Bearer valid_token');

      mockVerifyToken.mockResolvedValue({
        sub: 'user_clerk_fail_123',
      });

      const mockGetUserByClerkId = vi.fn(() =>
        Promise.resolve({
          success: true,
          data: null, // 사용자가 없음
        })
      );

      // Clerk client mock - API 실패
      const { createClerkClient } = await import('@clerk/backend');
      (createClerkClient as any).mockReturnValue({
        users: {
          getUser: vi.fn(() => Promise.reject(new Error('Clerk API error'))),
        },
      });

      const UserSyncService = await import('@/features/auth/backend/user-sync.service');
      (UserSyncService.UserSyncService as any).mockImplementation(function () {
        return {
          getUserByClerkId: mockGetUserByClerkId,
          upsertUser: vi.fn(() => Promise.resolve({ success: true })),
        };
      });

      await clerkAuthMiddleware(mockContext as Context<AppEnv>, mockNext);

      // Clerk API 실패해도 인증은 성공해야 함
      expect(mockContext.set).toHaveBeenCalledWith('userId', 'user_clerk_fail_123');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('optionalClerkAuth - Bearer Token', () => {
    it('토큰이 없어도 next()를 호출해야 함', async () => {
      (mockContext.req!.header as any).mockReturnValue(undefined);

      await optionalClerkAuth(mockContext as Context<AppEnv>, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockContext.set).not.toHaveBeenCalledWith('userId', expect.anything());
    });

    it('유효한 토큰이 있으면 userId를 설정하고 next()를 호출해야 함', async () => {
      (mockContext.req!.header as any).mockReturnValue('Bearer valid_token');

      mockVerifyToken.mockResolvedValue({
        sub: 'user_optional',
      });

      await optionalClerkAuth(mockContext as Context<AppEnv>, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith('userId', 'user_optional');
      expect(mockNext).toHaveBeenCalled();
    });

    it('토큰 검증 실패 시에도 next()를 호출해야 함', async () => {
      (mockContext.req!.header as any).mockReturnValue('Bearer invalid_token');

      mockVerifyToken.mockRejectedValue(new Error('Invalid token'));

      await optionalClerkAuth(mockContext as Context<AppEnv>, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockContext.set).not.toHaveBeenCalledWith('userId', expect.anything());
    });
  });
});
