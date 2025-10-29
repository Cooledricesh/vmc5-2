import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserSyncService } from '../backend/user-sync.service';

describe('UserSyncService', () => {
  let service: UserSyncService;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Supabase 모킹 - 각 메서드 체이닝을 개별적으로 모킹
    mockSupabase = {
      from: vi.fn()
    };

    service = new UserSyncService(mockSupabase);
  });

  describe('upsertUser', () => {
    it('사용자를 upsert해야 함', async () => {
      const userData = {
        clerkUserId: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        profileImage: 'https://example.com/avatar.jpg'
      };

      const mockUpsert = vi.fn().mockResolvedValue({
        data: { id: 'uuid_123', ...userData },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert
      });

      const result = await service.upsertUser(userData);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          clerk_user_id: userData.clerkUserId,
          email: userData.email,
          name: userData.name,
          profile_image: userData.profileImage
        }),
        { onConflict: 'clerk_user_id' }
      );
    });

    it('에러 발생 시 실패를 반환해야 함', async () => {
      const userData = {
        clerkUserId: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        profileImage: null
      };

      const mockUpsert = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      mockSupabase.from.mockReturnValue({
        upsert: mockUpsert
      });

      const result = await service.upsertUser(userData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('createOrUpdateUser', () => {
    it('새 사용자를 생성해야 함', async () => {
      const userData = {
        clerkUserId: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        profileImage: 'https://example.com/avatar.jpg'
      };

      // select 체이닝 모킹
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      // insert 모킹
      const mockInsert = vi.fn().mockResolvedValue({
        data: { id: 'uuid_123', ...userData },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        insert: mockInsert
      });

      const result = await service.createOrUpdateUser(userData);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('clerk_user_id', userData.clerkUserId);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          clerk_user_id: userData.clerkUserId,
          email: userData.email,
          name: userData.name
        })
      );
    });

    it('기존 사용자를 업데이트해야 함', async () => {
      const userData = {
        clerkUserId: 'user_123',
        email: 'updated@example.com',
        name: 'Updated User',
        profileImage: 'https://example.com/new-avatar.jpg'
      };

      // select 체이닝 모킹 - 기존 사용자 존재
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'uuid_123',
          clerk_user_id: userData.clerkUserId,
          email: 'old@example.com'
        },
        error: null
      });
      const mockEqSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqSelect });

      // update 체이닝 모킹
      const mockEqUpdate = vi.fn().mockResolvedValue({
        data: { id: 'uuid_123', ...userData },
        error: null
      });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqUpdate });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        update: mockUpdate
      });

      const result = await service.createOrUpdateUser(userData);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userData.email,
          name: userData.name,
          profile_image: userData.profileImage
        })
      );
      expect(mockEqUpdate).toHaveBeenCalledWith('clerk_user_id', userData.clerkUserId);
    });

    it('이메일이 없는 사용자도 처리해야 함', async () => {
      const userData = {
        clerkUserId: 'user_oauth_123',
        email: null,
        name: 'OAuth User',
        profileImage: null
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      const mockInsert = vi.fn().mockResolvedValue({
        data: { id: 'uuid_oauth', ...userData },
        error: null
      });

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
        insert: mockInsert
      });

      const result = await service.createOrUpdateUser(userData);

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          clerk_user_id: userData.clerkUserId,
          email: null,
          name: userData.name
        })
      );
    });

    it('DB 오류 시 에러를 반환해야 함', async () => {
      const userData = {
        clerkUserId: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        profileImage: null
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockSupabase.from.mockReturnValue({
        select: mockSelect
      });

      const result = await service.createOrUpdateUser(userData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });
  });

  describe('deleteUser', () => {
    it('사용자를 삭제해야 함', async () => {
      const clerkUserId = 'user_123';

      const mockEq = vi.fn().mockResolvedValue({
        data: {},
        error: null
      });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

      mockSupabase.from.mockReturnValue({
        delete: mockDelete
      });

      const result = await service.deleteUser(clerkUserId);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('clerk_user_id', clerkUserId);
    });

    it('삭제 실패 시 에러를 반환해야 함', async () => {
      const clerkUserId = 'user_123';

      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Delete failed' }
      });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

      mockSupabase.from.mockReturnValue({
        delete: mockDelete
      });

      const result = await service.deleteUser(clerkUserId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Delete failed');
    });
  });

  describe('getUserByClerkId', () => {
    it('Clerk ID로 사용자를 조회해야 함', async () => {
      const clerkUserId = 'user_123';
      const userData = {
        id: 'uuid_123',
        clerk_user_id: clerkUserId,
        email: 'test@example.com'
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: userData,
        error: null
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockSupabase.from.mockReturnValue({
        select: mockSelect
      });

      const result = await service.getUserByClerkId(clerkUserId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(userData);
      expect(mockEq).toHaveBeenCalledWith('clerk_user_id', clerkUserId);
    });

    it('사용자가 없으면 null을 반환해야 함', async () => {
      const clerkUserId = 'user_nonexistent';

      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: null
      });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockSupabase.from.mockReturnValue({
        select: mockSelect
      });

      const result = await service.getUserByClerkId(clerkUserId);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });
});