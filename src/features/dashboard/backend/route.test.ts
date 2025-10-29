import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../../../backend/hono/context';
import { registerDashboardRoutes } from './route';
import * as service from './service';
import { dashboardErrorCodes } from './error';
import { getSupabase, getLogger } from '../../../backend/hono/context';

// Mock the context helpers
vi.mock('../../../backend/hono/context', () => ({
  getSupabase: vi.fn(),
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

describe('Dashboard Routes', () => {
  let app: Hono<AppEnv>;
  let mockSupabase: any;
  const mockUserId = 'test-user-id';
  const mockedGetSupabase = vi.mocked(getSupabase);

  beforeEach(() => {
    app = new Hono<AppEnv>();

    // Mock the userId in context
    app.use('*', async (c, next) => {
      c.set('userId', mockUserId);
      await next();
    });

    registerDashboardRoutes(app);

    // Setup mock Supabase client
    mockSupabase = {};

    // Setup context mocks
    mockedGetSupabase.mockReturnValue(mockSupabase);

    // Clear all service mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/dashboard/summary', () => {
    it('should return dashboard summary for authenticated user', async () => {
      const mockSummary = {
        user: {
          id: mockUserId,
          name: 'Test User',
          email: 'test@example.com',
          subscription_tier: 'pro' as const,
        },
        subscription: {
          status: 'active' as const,
          next_payment_date: '2024-02-01',
          card_last_4digits: '4242',
          remaining_count: 8,
        },
      };

      vi.spyOn(service, 'getDashboardSummary').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockSummary,
      });

      const res = await app.request('/dashboard/summary', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data).toEqual(mockSummary);
      expect(service.getDashboardSummary).toHaveBeenCalledWith(mockSupabase, mockUserId);
    });

    it('should return free tier summary for free user', async () => {
      const mockSummary = {
        user: {
          id: mockUserId,
          name: 'Free User',
          email: 'free@example.com',
          subscription_tier: 'free' as const,
        },
        subscription: {
          status: null,
          next_payment_date: null,
          card_last_4digits: null,
          remaining_count: 2,
        },
      };

      vi.spyOn(service, 'getDashboardSummary').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockSummary,
      });

      const res = await app.request('/dashboard/summary', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.user.subscription_tier).toBe('free');
      expect(body.data.subscription.status).toBeNull();
    });

    it('should return 401 when user is not authenticated', async () => {
      // Create new app without userId in context
      const unauthApp = new Hono<AppEnv>();
      registerDashboardRoutes(unauthApp);

      const res = await unauthApp.request('/dashboard/summary', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(dashboardErrorCodes.unauthorized);
    });

    it('should return 404 when user not found', async () => {
      vi.spyOn(service, 'getDashboardSummary').mockResolvedValue({
        ok: false,
        status: 404,
        error: {
          code: dashboardErrorCodes.userNotFound,
          message: '사용자를 찾을 수 없습니다',
        },
      });

      const res = await app.request('/dashboard/summary', {
        method: 'GET',
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(dashboardErrorCodes.userNotFound);
    });

    it('should handle database error correctly', async () => {
      vi.spyOn(service, 'getDashboardSummary').mockResolvedValue({
        ok: false,
        status: 500,
        error: {
          code: dashboardErrorCodes.databaseError,
          message: 'Database connection failed',
        },
      });

      const res = await app.request('/dashboard/summary', {
        method: 'GET',
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(dashboardErrorCodes.databaseError);
    });

    it('should handle pending_cancellation subscription status', async () => {
      const mockSummary = {
        user: {
          id: mockUserId,
          name: 'Test User',
          email: 'test@example.com',
          subscription_tier: 'pro' as const,
        },
        subscription: {
          status: 'pending_cancellation' as const,
          next_payment_date: '2024-02-01',
          card_last_4digits: '4242',
          remaining_count: 8,
        },
      };

      vi.spyOn(service, 'getDashboardSummary').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockSummary,
      });

      const res = await app.request('/dashboard/summary', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.subscription.status).toBe('pending_cancellation');
    });
  });

  describe('GET /api/dashboard/stats', () => {
    it('should return dashboard stats for authenticated user', async () => {
      const mockStats = {
        total_count: 42,
        monthly_count: 10,
        this_week_count: 3,
      };

      vi.spyOn(service, 'getDashboardStats').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockStats,
      });

      const res = await app.request('/dashboard/stats', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data).toEqual(mockStats);
      expect(service.getDashboardStats).toHaveBeenCalledWith(mockSupabase, mockUserId);
    });

    it('should return zero stats for new user', async () => {
      const mockStats = {
        total_count: 0,
        monthly_count: 0,
        this_week_count: 0,
      };

      vi.spyOn(service, 'getDashboardStats').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockStats,
      });

      const res = await app.request('/dashboard/stats', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.total_count).toBe(0);
      expect(body.data.monthly_count).toBe(0);
      expect(body.data.this_week_count).toBe(0);
    });

    it('should return 401 when user is not authenticated', async () => {
      const unauthApp = new Hono<AppEnv>();
      registerDashboardRoutes(unauthApp);

      const res = await unauthApp.request('/dashboard/stats', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(dashboardErrorCodes.unauthorized);
    });

    it('should handle database error correctly', async () => {
      vi.spyOn(service, 'getDashboardStats').mockResolvedValue({
        ok: false,
        status: 500,
        error: {
          code: dashboardErrorCodes.databaseError,
          message: 'Database connection failed',
        },
      });

      const res = await app.request('/dashboard/stats', {
        method: 'GET',
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(dashboardErrorCodes.databaseError);
    });
  });

  describe('GET /api/analyses', () => {
    const mockAnalyses = [
      {
        id: 'analysis-1',
        subject_name: '홍길동',
        birth_date: '1990-01-01',
        gender: 'male' as const,
        ai_model: 'gemini-2.0-pro',
        status: 'completed' as const,
        created_at: '2024-01-01T00:00:00Z',
        view_count: 5,
      },
      {
        id: 'analysis-2',
        subject_name: '김영희',
        birth_date: '1985-05-05',
        gender: 'female' as const,
        ai_model: 'gemini-2.0-flash',
        status: 'completed' as const,
        created_at: '2024-01-02T00:00:00Z',
        view_count: 2,
      },
    ];

    it('should return analyses list with default parameters', async () => {
      const mockResponse = {
        analyses: mockAnalyses,
        pagination: {
          current_page: 1,
          total_pages: 1,
          total_count: 2,
          per_page: 10,
        },
      };

      vi.spyOn(service, 'getAnalysesList').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockResponse,
      });

      const res = await app.request('/analyses', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.analyses).toHaveLength(2);
      expect(body.data.pagination.current_page).toBe(1);
      expect(service.getAnalysesList).toHaveBeenCalledWith(
        mockSupabase,
        mockUserId,
        {
          period: 'all',
          sort: 'latest',
          page: 1,
          limit: 10,
        }
      );
    });

    it('should handle period filter correctly', async () => {
      const mockResponse = {
        analyses: [mockAnalyses[0]],
        pagination: {
          current_page: 1,
          total_pages: 1,
          total_count: 1,
          per_page: 10,
        },
      };

      vi.spyOn(service, 'getAnalysesList').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockResponse,
      });

      const res = await app.request('/analyses?period=7days', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(service.getAnalysesList).toHaveBeenCalledWith(
        mockSupabase,
        mockUserId,
        expect.objectContaining({
          period: '7days',
        })
      );
    });

    it('should handle sort parameter correctly', async () => {
      const mockResponse = {
        analyses: mockAnalyses.reverse(),
        pagination: {
          current_page: 1,
          total_pages: 1,
          total_count: 2,
          per_page: 10,
        },
      };

      vi.spyOn(service, 'getAnalysesList').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockResponse,
      });

      const res = await app.request('/analyses?sort=oldest', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(service.getAnalysesList).toHaveBeenCalledWith(
        mockSupabase,
        mockUserId,
        expect.objectContaining({
          sort: 'oldest',
        })
      );
    });

    it('should handle pagination parameters correctly', async () => {
      const mockResponse = {
        analyses: [],
        pagination: {
          current_page: 2,
          total_pages: 5,
          total_count: 25,
          per_page: 5,
        },
      };

      vi.spyOn(service, 'getAnalysesList').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockResponse,
      });

      const res = await app.request('/analyses?page=2&limit=5', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.pagination.current_page).toBe(2);
      expect(body.data.pagination.per_page).toBe(5);
      expect(service.getAnalysesList).toHaveBeenCalledWith(
        mockSupabase,
        mockUserId,
        expect.objectContaining({
          page: 2,
          limit: 5,
        })
      );
    });

    it('should handle all filters combined', async () => {
      const mockResponse = {
        analyses: mockAnalyses,
        pagination: {
          current_page: 1,
          total_pages: 1,
          total_count: 2,
          per_page: 20,
        },
      };

      vi.spyOn(service, 'getAnalysesList').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockResponse,
      });

      const res = await app.request('/analyses?period=30days&sort=oldest&page=1&limit=20', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(service.getAnalysesList).toHaveBeenCalledWith(
        mockSupabase,
        mockUserId,
        {
          period: '30days',
          sort: 'oldest',
          page: 1,
          limit: 20,
        }
      );
    });

    it('should return empty list when no analyses exist', async () => {
      const mockResponse = {
        analyses: [],
        pagination: {
          current_page: 1,
          total_pages: 0,
          total_count: 0,
          per_page: 10,
        },
      };

      vi.spyOn(service, 'getAnalysesList').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockResponse,
      });

      const res = await app.request('/analyses', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.analyses).toEqual([]);
      expect(body.data.pagination.total_count).toBe(0);
    });

    it('should return 400 for invalid period parameter', async () => {
      const res = await app.request('/analyses?period=invalid', {
        method: 'GET',
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(dashboardErrorCodes.validationError);
    });

    it('should return 400 for invalid sort parameter', async () => {
      const res = await app.request('/analyses?sort=random', {
        method: 'GET',
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(dashboardErrorCodes.validationError);
    });

    it('should return 400 for invalid page number', async () => {
      const res = await app.request('/analyses?page=0', {
        method: 'GET',
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(dashboardErrorCodes.validationError);
    });

    it('should return 400 for negative page number', async () => {
      const res = await app.request('/analyses?page=-1', {
        method: 'GET',
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(dashboardErrorCodes.validationError);
    });

    it('should return 400 for limit exceeding maximum', async () => {
      const res = await app.request('/analyses?limit=100', {
        method: 'GET',
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(dashboardErrorCodes.validationError);
    });

    it('should return 401 when user is not authenticated', async () => {
      const unauthApp = new Hono<AppEnv>();
      registerDashboardRoutes(unauthApp);

      const res = await unauthApp.request('/analyses', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(dashboardErrorCodes.unauthorized);
    });

    it('should handle database error correctly', async () => {
      vi.spyOn(service, 'getAnalysesList').mockResolvedValue({
        ok: false,
        status: 500,
        error: {
          code: dashboardErrorCodes.databaseError,
          message: 'Database connection failed',
        },
      });

      const res = await app.request('/analyses', {
        method: 'GET',
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(dashboardErrorCodes.databaseError);
    });

    it('should handle processing status analyses', async () => {
      const processingAnalyses = [
        {
          ...mockAnalyses[0],
          status: 'processing' as const,
        },
      ];

      const mockResponse = {
        analyses: processingAnalyses,
        pagination: {
          current_page: 1,
          total_pages: 1,
          total_count: 1,
          per_page: 10,
        },
      };

      vi.spyOn(service, 'getAnalysesList').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockResponse,
      });

      const res = await app.request('/analyses', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.analyses[0].status).toBe('processing');
    });

    it('should handle failed status analyses', async () => {
      const failedAnalyses = [
        {
          ...mockAnalyses[0],
          status: 'failed' as const,
        },
      ];

      const mockResponse = {
        analyses: failedAnalyses,
        pagination: {
          current_page: 1,
          total_pages: 1,
          total_count: 1,
          per_page: 10,
        },
      };

      vi.spyOn(service, 'getAnalysesList').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockResponse,
      });

      const res = await app.request('/analyses', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.analyses[0].status).toBe('failed');
    });
  });
});