import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import type { Context } from 'hono';

// Mock all middleware
vi.mock('@/backend/middleware/error', () => ({
  errorBoundary: () => async (c: Context, next: () => Promise<void>) => {
    await next();
  },
}));

vi.mock('@/backend/middleware/context', () => ({
  withAppContext: () => async (c: Context, next: () => Promise<void>) => {
    c.set('logger', {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    });
    c.set('config', {});
    await next();
  },
}));

vi.mock('@/backend/middleware/supabase', () => ({
  withSupabase: () => async (c: Context, next: () => Promise<void>) => {
    c.set('supabase', {} as any);
    await next();
  },
}));

vi.mock('@/backend/middleware/clerk-auth', () => ({
  clerkAuthMiddleware: async (c: Context, next: () => Promise<void>) => {
    c.set('userId', 'test-user-id');
    await next();
  },
}));

// Mock dashboard service
vi.mock('@/features/dashboard/backend/service', () => ({
  getDashboardSummary: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      user: { id: 'test-user-id', name: 'Test User' },
      subscription: { tier: 'free' },
    },
  }),
  getDashboardStats: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      totalAnalyses: 0,
      avgAccuracy: 0,
      recentActivity: [],
    },
  }),
  getAnalysesList: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      analyses: [],
      total: 0,
    },
  }),
}));

describe('Next.js API Route Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dashboard routes via Next.js', () => {
    it('should handle /api/dashboard/summary through Next.js catch-all route', async () => {
      // Next.js strips /api prefix and passes params
      const request = new Request('http://localhost:3000/api/dashboard/summary', {
        method: 'GET',
      });

      const response = await GET(request, {
        params: Promise.resolve({ hono: ['dashboard', 'summary'] }),
      });

      const text = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', text);

      expect(response.status).toBe(200);

      const body = JSON.parse(text);
      expect(body).toHaveProperty('ok', true);
    });

    it('should handle /api/dashboard/stats through Next.js catch-all route', async () => {
      const request = new Request('http://localhost:3000/api/dashboard/stats', {
        method: 'GET',
      });

      const response = await GET(request, {
        params: Promise.resolve({ hono: ['dashboard', 'stats'] }),
      });

      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty('ok', true);
    });

    it('should handle /api/analyses through Next.js catch-all route', async () => {
      // Add query parameters that the schema expects
      const request = new Request('http://localhost:3000/api/analyses?page=1&limit=10', {
        method: 'GET',
      });

      const response = await GET(request, {
        params: Promise.resolve({ hono: ['analyses'] }),
      });

      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty('ok', true);
    });

    it('should return 404 for non-existent routes', async () => {
      const request = new Request('http://localhost:3000/api/non-existent', {
        method: 'GET',
      });

      const response = await GET(request, {
        params: Promise.resolve({ hono: ['non-existent'] }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('Path reconstruction', () => {
    it('should correctly reconstruct path from catch-all params', async () => {
      // When Next.js receives /api/dashboard/summary
      // It should pass ['dashboard', 'summary'] as params
      const request = new Request('http://localhost:3000/api/dashboard/summary', {
        method: 'GET',
      });

      const response = await GET(request, {
        params: Promise.resolve({ hono: ['dashboard', 'summary'] }),
      });

      // If routing works, we should NOT get 404
      expect(response.status).not.toBe(404);
    });
  });
});
