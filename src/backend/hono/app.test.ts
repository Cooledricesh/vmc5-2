import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHonoApp } from './app';
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
    // Mock authenticated user
    c.set('userId', 'test-user-id');
    await next();
  },
}));

// Mock feature route registrations
vi.mock('@/features/example/backend/route', () => ({
  registerExampleRoutes: vi.fn(),
}));

vi.mock('@/features/new-analysis/backend/route', () => ({
  registerNewAnalysisRoutes: vi.fn(),
}));

vi.mock('@/features/analysis-detail/backend/route', () => ({
  registerAnalysisDetailRoutes: vi.fn(),
}));

vi.mock('@/features/subscription/backend/route', () => ({
  registerSubscriptionRoutes: vi.fn(),
}));

vi.mock('@/features/dashboard/backend/route', () => ({
  registerDashboardRoutes: (app: any) => {
    app.get('/dashboard/summary', async (c: Context) => {
      const userId = c.get('userId');
      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }
      return c.json({ ok: true, data: { userId } });
    });

    app.get('/dashboard/stats', async (c: Context) => {
      const userId = c.get('userId');
      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }
      return c.json({ ok: true, data: { stats: [] } });
    });

    app.get('/analyses', async (c: Context) => {
      const userId = c.get('userId');
      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }
      return c.json({ ok: true, data: { analyses: [] } });
    });
  },
}));

describe('Hono App Routing', () => {
  beforeEach(() => {
    // Reset singleton
    vi.clearAllMocks();
  });

  describe('Dashboard routes', () => {
    it('should route /dashboard/summary correctly', async () => {
      const app = createHonoApp();
      const req = new Request('http://localhost/dashboard/summary', {
        method: 'GET',
      });

      const res = await app.fetch(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({
        ok: true,
        data: { userId: 'test-user-id' },
      });
    });

    it('should route /dashboard/stats correctly', async () => {
      const app = createHonoApp();
      const req = new Request('http://localhost/dashboard/stats', {
        method: 'GET',
      });

      const res = await app.fetch(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({
        ok: true,
        data: { stats: [] },
      });
    });

    it('should route /analyses correctly', async () => {
      const app = createHonoApp();
      const req = new Request('http://localhost/analyses', {
        method: 'GET',
      });

      const res = await app.fetch(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({
        ok: true,
        data: { analyses: [] },
      });
    });

    it('should return 404 for non-existent routes', async () => {
      const app = createHonoApp();
      const req = new Request('http://localhost/non-existent', {
        method: 'GET',
      });

      const res = await app.fetch(req);

      expect(res.status).toBe(404);
    });
  });

  describe('Path handling', () => {
    it('should handle paths without /api prefix in core app', async () => {
      const app = createHonoApp();
      const req = new Request('http://localhost/dashboard/summary', {
        method: 'GET',
      });

      const res = await app.fetch(req);

      expect(res.status).not.toBe(404);
    });
  });

  describe('Authentication', () => {
    it('should have userId set by clerkAuthMiddleware', async () => {
      const app = createHonoApp();
      const req = new Request('http://localhost/dashboard/summary', {
        method: 'GET',
      });

      const res = await app.fetch(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.userId).toBe('test-user-id');
    });
  });
});
