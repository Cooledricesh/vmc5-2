import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/webhooks/clerk/route';

// Supabase 모킹
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: {}, error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: {}, error: null }))
      })),
      upsert: vi.fn(() => Promise.resolve({ data: {}, error: null }))
    }))
  }))
}));

// next/headers 모킹
const mockHeaders = vi.fn();
vi.mock('next/headers', () => ({
  headers: () => mockHeaders()
}));

// Svix 모킹
const mockVerify = vi.fn();
vi.mock('svix', () => ({
  Webhook: vi.fn().mockImplementation(function() {
    return {
      verify: mockVerify
    };
  })
}));

// 재시도 헬퍼 모킹 - 단순히 함수를 즉시 실행
vi.mock('@/features/auth/backend/retry-helper', () => ({
  retryWithBackoff: vi.fn(async (fn) => fn())
}));

// UserSyncService 모킹
vi.mock('@/features/auth/backend/user-sync.service', () => ({
  UserSyncService: vi.fn().mockImplementation(() => ({
    upsertUser: vi.fn(() => Promise.resolve({ success: true })),
    createOrUpdateUser: vi.fn(() => Promise.resolve({ success: true })),
    deleteUser: vi.fn(() => Promise.resolve({ success: true }))
  }))
}));

describe('Clerk Webhook Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLERK_WEBHOOK_SIGNING_SECRET = 'whsec_test_secret';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_key';

    // 기본 헤더 모킹
    mockHeaders.mockResolvedValue({
      get: vi.fn((key: string) => {
        const headers: Record<string, string> = {
          'svix-id': 'test_id',
          'svix-timestamp': String(Date.now()),
          'svix-signature': 'test_signature'
        };
        return headers[key];
      })
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/webhooks/clerk', () => {
    it('환경 변수가 없으면 에러를 반환해야 함', async () => {
      delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test_id',
          'svix-timestamp': String(Date.now()),
          'svix-signature': 'test_signature'
        },
        body: JSON.stringify({})
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });

    it('Svix 헤더가 없으면 400 에러를 반환해야 함', async () => {
      // 헤더 없는 상황 모킹
      mockHeaders.mockResolvedValue({
        get: vi.fn(() => null)
      });

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      expect(await response.text()).toContain('no svix headers');
    });

    it('유효하지 않은 서명이면 400 에러를 반환해야 함', async () => {
      mockVerify.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test_id',
          'svix-timestamp': String(Date.now()),
          'svix-signature': 'invalid_signature'
        },
        body: JSON.stringify({ type: 'user.created' })
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it('user.created 이벤트를 처리해야 함', async () => {
      const mockEvent = {
        type: 'user.created',
        data: {
          id: 'user_123',
          email_addresses: [
            { email_address: 'test@example.com' }
          ],
          first_name: 'Test',
          last_name: 'User',
          image_url: 'https://example.com/avatar.jpg'
        }
      };

      mockVerify.mockReturnValue(mockEvent);

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test_id',
          'svix-timestamp': String(Date.now()),
          'svix-signature': 'valid_signature'
        },
        body: JSON.stringify(mockEvent)
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('OK');
    });

    it('user.updated 이벤트를 처리해야 함', async () => {
      const mockEvent = {
        type: 'user.updated',
        data: {
          id: 'user_123',
          email_addresses: [
            { email_address: 'updated@example.com' }
          ],
          first_name: 'Updated',
          last_name: 'User'
        }
      };

      mockVerify.mockReturnValue(mockEvent);

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test_id',
          'svix-timestamp': String(Date.now()),
          'svix-signature': 'valid_signature'
        },
        body: JSON.stringify(mockEvent)
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('user.deleted 이벤트를 처리해야 함', async () => {
      const mockEvent = {
        type: 'user.deleted',
        data: {
          id: 'user_123'
        }
      };

      mockVerify.mockReturnValue(mockEvent);

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test_id',
          'svix-timestamp': String(Date.now()),
          'svix-signature': 'valid_signature'
        },
        body: JSON.stringify(mockEvent)
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('알 수 없는 이벤트 타입도 200을 반환해야 함', async () => {
      const mockEvent = {
        type: 'unknown.event',
        data: {}
      };

      mockVerify.mockReturnValue(mockEvent);

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test_id',
          'svix-timestamp': String(Date.now()),
          'svix-signature': 'valid_signature'
        },
        body: JSON.stringify(mockEvent)
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('이메일이 없는 사용자도 처리해야 함', async () => {
      const mockEvent = {
        type: 'user.created',
        data: {
          id: 'user_oauth_123',
          email_addresses: [],
          username: 'oauthuser',
          first_name: 'OAuth',
          last_name: 'User'
        }
      };

      mockVerify.mockReturnValue(mockEvent);

      const request = new Request('http://localhost:3000/api/webhooks/clerk', {
        method: 'POST',
        headers: {
          'svix-id': 'test_id',
          'svix-timestamp': String(Date.now()),
          'svix-signature': 'valid_signature'
        },
        body: JSON.stringify(mockEvent)
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });
});