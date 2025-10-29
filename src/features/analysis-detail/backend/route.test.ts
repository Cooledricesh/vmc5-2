import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../../../backend/hono/context';
import { getSupabase, getUserId as getContextUserId } from '../../../backend/hono/context';
import { getUserId as getAuthUserId } from '../../../backend/middleware/auth';
import { registerAnalysisDetailRoutes } from './route';
import * as service from './service';
import { analysisDetailErrorCodes } from './error';

// Mock the auth middleware
vi.mock('../../../backend/middleware/auth', () => ({
  withClerkAuth: vi.fn(() => async (c: any, next: any) => {
    // Set userId in context like the real middleware does
    const mockUserId = c.get('mockUserId');
    if (mockUserId !== undefined) {
      c.set('userId', mockUserId);
    }
    await next();
  }),
  getUserId: vi.fn((c: any) => {
    // Return the userId from context
    return c.get('userId') || null;
  }),
}));

// Mock the context helpers
vi.mock('../../../backend/hono/context', () => ({
  getSupabase: vi.fn(),
  getUserId: vi.fn(),
  getLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  })),
}));

describe('Analysis Detail Routes', () => {
  let app: Hono<AppEnv>;
  let mockSupabase: any;
  const mockUserId = 'test-user-id';
  const mockAnalysisId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID
  const mockedGetSupabase = vi.mocked(getSupabase);
  const mockedGetContextUserId = vi.mocked(getContextUserId);
  const mockedGetAuthUserId = vi.mocked(getAuthUserId);

  beforeEach(() => {
    app = new Hono<AppEnv>();

    // Set default mockUserId in app context before registering routes
    app.use('*', async (c, next) => {
      c.set('mockUserId' as never, mockUserId as never);
      await next();
    });

    registerAnalysisDetailRoutes(app);

    // Setup mock Supabase client
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: {
                id: mockUserId,
                subscription_tier: 'pro',
              },
              error: null,
            })),
            maybeSingle: vi.fn(() => Promise.resolve({
              data: {
                id: mockAnalysisId,
                user_id: mockUserId,
              },
              error: null,
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            error: null,
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            error: null,
          })),
        })),
      })),
    };

    // Setup context mocks
    mockedGetSupabase.mockReturnValue(mockSupabase);
    mockedGetContextUserId.mockReturnValue(mockUserId);
    mockedGetAuthUserId.mockReturnValue(mockUserId);

    // Clear all service mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/analyses/:id', () => {
    const mockAnalysisDetail = {
      id: mockAnalysisId,
      subject_name: '홍길동',
      birth_date: '1990-01-01',
      birth_time: '14:30',
      gender: 'male' as const,
      ai_model: 'gemini-2.0-pro',
      analysis_result: {
        heavenly_stems: {
          year: '경오',
          month: '무자',
          day: '갑진',
          hour: '신미',
        },
        five_elements: {
          wood: 2,
          fire: 3,
          earth: 1,
          metal: 2,
          water: 2,
        },
        fortune_flow: {
          major_fortune: '대운 분석 내용',
          yearly_fortune: '연운 분석 내용',
        },
        interpretation: {
          personality: '성격 분석 내용',
          wealth: '재물운 분석 내용',
          health: '건강운 분석 내용',
          love: '애정운 분석 내용',
        },
      },
      status: 'completed' as const,
      view_count: 5,
      created_at: '2024-01-01T00:00:00Z',
      last_viewed_at: '2024-01-02T00:00:00Z',
    };

    it('should return analysis detail for authorized user', async () => {
      vi.spyOn(service, 'getAnalysisById').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockAnalysisDetail,
      });

      const res = await app.request(`/analyses/${mockAnalysisId}`, {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data).toEqual(mockAnalysisDetail);
      expect(service.getAnalysisById).toHaveBeenCalledWith(
        mockSupabase,
        mockAnalysisId,
        mockUserId
      );
    });

    it('should increment view count when fetching analysis', async () => {
      const updatedAnalysis = {
        ...mockAnalysisDetail,
        view_count: 6, // Incremented from 5
      };

      vi.spyOn(service, 'getAnalysisById').mockResolvedValue({
        ok: true,
        status: 200,
        data: updatedAnalysis,
      });

      const res = await app.request(`/analyses/${mockAnalysisId}`, {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.view_count).toBe(6);
    });

    it('should handle analysis with processing status', async () => {
      const processingAnalysis = {
        ...mockAnalysisDetail,
        status: 'processing' as const,
        analysis_result: null,
      };

      vi.spyOn(service, 'getAnalysisById').mockResolvedValue({
        ok: true,
        status: 200,
        data: processingAnalysis,
      });

      const res = await app.request(`/analyses/${mockAnalysisId}`, {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.status).toBe('processing');
      expect(body.data.analysis_result).toBeNull();
    });

    it('should handle analysis with failed status', async () => {
      const failedAnalysis = {
        ...mockAnalysisDetail,
        status: 'failed' as const,
        analysis_result: null,
      };

      vi.spyOn(service, 'getAnalysisById').mockResolvedValue({
        ok: true,
        status: 200,
        data: failedAnalysis,
      });

      const res = await app.request(`/analyses/${mockAnalysisId}`, {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.status).toBe('failed');
      expect(body.data.analysis_result).toBeNull();
    });

    it('should handle analysis without birth time', async () => {
      const analysisWithoutTime = {
        ...mockAnalysisDetail,
        birth_time: null,
        analysis_result: {
          ...mockAnalysisDetail.analysis_result,
          heavenly_stems: {
            year: '경오',
            month: '무자',
            day: '갑진',
          },
        },
      };

      vi.spyOn(service, 'getAnalysisById').mockResolvedValue({
        ok: true,
        status: 200,
        data: analysisWithoutTime,
      });

      const res = await app.request(`/analyses/${mockAnalysisId}`, {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.birth_time).toBeNull();
    });

    it('should return 404 when analysis not found', async () => {
      vi.spyOn(service, 'getAnalysisById').mockResolvedValue({
        ok: false,
        status: 404,
        error: {
          code: analysisDetailErrorCodes.analysisNotFound,
          message: '분석 결과를 찾을 수 없습니다',
        },
      });

      const res = await app.request(`/analyses/non-existent-id`, {
        method: 'GET',
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(analysisDetailErrorCodes.analysisNotFound);
    });

    it('should return 403 when user does not own the analysis', async () => {
      vi.spyOn(service, 'getAnalysisById').mockResolvedValue({
        ok: false,
        status: 403,
        error: {
          code: analysisDetailErrorCodes.forbidden,
          message: '이 분석 결과에 접근할 권한이 없습니다',
        },
      });

      const res = await app.request(`/analyses/${mockAnalysisId}`, {
        method: 'GET',
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(analysisDetailErrorCodes.forbidden);
    });

    it('should return 401 when user is not authenticated', async () => {
      // Create a new app instance without userId in context
      const unauthApp = new Hono<AppEnv>();

      // Set mockUserId to null for this specific test
      unauthApp.use('*', async (c, next) => {
        c.set('mockUserId' as never, null as never);
        await next();
      });

      registerAnalysisDetailRoutes(unauthApp);
      mockedGetSupabase.mockReturnValue(mockSupabase);
      // Mock getUserId to return null for unauthenticated user
      mockedGetAuthUserId.mockReturnValue(null);

      const res = await unauthApp.request(`/analyses/${mockAnalysisId}`, {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(analysisDetailErrorCodes.unauthorized);

      // Restore mock
      mockedGetAuthUserId.mockReturnValue(mockUserId);
    });

    it('should handle database error', async () => {
      vi.spyOn(service, 'getAnalysisById').mockResolvedValue({
        ok: false,
        status: 500,
        error: {
          code: analysisDetailErrorCodes.databaseError,
          message: 'Database connection failed',
        },
      });

      const res = await app.request(`/analyses/${mockAnalysisId}`, {
        method: 'GET',
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(analysisDetailErrorCodes.databaseError);
    });
  });

  describe('DELETE /api/analyses/:id', () => {
    it('should delete analysis for authorized user', async () => {
      vi.spyOn(service, 'deleteAnalysis').mockResolvedValue({
        ok: true,
        status: 200,
        data: undefined,
      });

      const res = await app.request(`/analyses/${mockAnalysisId}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(service.deleteAnalysis).toHaveBeenCalledWith(
        mockSupabase,
        mockAnalysisId,
        mockUserId
      );
    });

    it('should return 404 when analysis not found', async () => {
      vi.spyOn(service, 'deleteAnalysis').mockResolvedValue({
        ok: false,
        status: 404,
        error: {
          code: analysisDetailErrorCodes.analysisNotFound,
          message: '분석 결과를 찾을 수 없습니다',
        },
      });

      const res = await app.request(`/analyses/non-existent-id`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(analysisDetailErrorCodes.analysisNotFound);
    });

    it('should return 403 when user does not own the analysis', async () => {
      vi.spyOn(service, 'deleteAnalysis').mockResolvedValue({
        ok: false,
        status: 403,
        error: {
          code: analysisDetailErrorCodes.forbidden,
          message: '이 분석을 삭제할 권한이 없습니다',
        },
      });

      const res = await app.request(`/analyses/${mockAnalysisId}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(analysisDetailErrorCodes.forbidden);
    });

    it('should return 401 when user is not authenticated', async () => {
      // Create a new app instance without userId in context
      const unauthApp = new Hono<AppEnv>();

      // Set mockUserId to null for this specific test
      unauthApp.use('*', async (c, next) => {
        c.set('mockUserId' as never, null as never);
        await next();
      });

      registerAnalysisDetailRoutes(unauthApp);
      mockedGetSupabase.mockReturnValue(mockSupabase);
      // Mock getUserId to return null for unauthenticated user
      mockedGetAuthUserId.mockReturnValue(null);

      const res = await unauthApp.request(`/analyses/${mockAnalysisId}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(analysisDetailErrorCodes.unauthorized);

      // Restore mock
      mockedGetAuthUserId.mockReturnValue(mockUserId);
    });

    it('should handle database error during deletion', async () => {
      vi.spyOn(service, 'deleteAnalysis').mockResolvedValue({
        ok: false,
        status: 500,
        error: {
          code: analysisDetailErrorCodes.databaseError,
          message: 'Database error occurred',
        },
      });

      const res = await app.request(`/analyses/${mockAnalysisId}`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(analysisDetailErrorCodes.databaseError);
    });
  });

  describe('POST /api/analyses/reanalyze', () => {
    const validReanalyzeRequest = {
      original_analysis_id: mockAnalysisId,
      subject_name: '홍길동',
      birth_date: '1990-01-01',
      birth_time: '14:30',
      gender: 'male',
    };

    it('should allow reanalysis for pro user', async () => {
      // Currently returns NOT_IMPLEMENTED, but we test the auth flow
      const res = await app.request('/analyses/reanalyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validReanalyzeRequest),
      });

      expect(res.status).toBe(501);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('NOT_IMPLEMENTED');
    });

    it('should reject reanalysis for free user', async () => {
      // Mock free user
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: {
                    id: mockUserId,
                    subscription_tier: 'free',
                  },
                  error: null,
                })),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(),
              maybeSingle: vi.fn(),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        };
      });

      const res = await app.request('/analyses/reanalyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validReanalyzeRequest),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(analysisDetailErrorCodes.reanalysisForbidden);
    });

    it('should return validation error for invalid request body', async () => {
      const invalidRequest = {
        // Missing required fields
        original_analysis_id: mockAnalysisId,
      };

      const res = await app.request('/analyses/reanalyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidRequest),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(analysisDetailErrorCodes.validationError);
    });

    it('should validate UUID format for original_analysis_id', async () => {
      const invalidRequest = {
        ...validReanalyzeRequest,
        original_analysis_id: 'invalid-uuid',
      };

      const res = await app.request('/analyses/reanalyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidRequest),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(analysisDetailErrorCodes.validationError);
    });

    it('should validate gender field', async () => {
      const invalidRequest = {
        ...validReanalyzeRequest,
        gender: 'other', // Invalid gender value
      };

      const res = await app.request('/analyses/reanalyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidRequest),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(analysisDetailErrorCodes.validationError);
    });

    it('should handle reanalysis without birth time', async () => {
      const requestWithoutTime = {
        ...validReanalyzeRequest,
        birth_time: null,
      };

      const res = await app.request('/analyses/reanalyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestWithoutTime),
      });

      // Still returns NOT_IMPLEMENTED but validates the request
      expect(res.status).toBe(501);
      const body = await res.json();
      expect(body.ok).toBe(false);
    });

    it('should return 401 when user is not authenticated', async () => {
      // Create a new app instance without userId in context
      const unauthApp = new Hono<AppEnv>();

      // Set mockUserId to null for this specific test
      unauthApp.use('*', async (c, next) => {
        c.set('mockUserId' as never, null as never);
        await next();
      });

      registerAnalysisDetailRoutes(unauthApp);
      mockedGetSupabase.mockReturnValue(mockSupabase);
      // Mock getUserId to return null for unauthenticated user
      mockedGetAuthUserId.mockReturnValue(null);

      const res = await unauthApp.request('/analyses/reanalyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validReanalyzeRequest),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(analysisDetailErrorCodes.unauthorized);

      // Restore mock
      mockedGetAuthUserId.mockReturnValue(mockUserId);
    });

    it('should handle user fetch error', async () => {
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: null,
                  error: new Error('User not found'),
                })),
              })),
            })),
          };
        }
        return mockSupabase.from(table);
      });

      const res = await app.request('/analyses/reanalyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validReanalyzeRequest),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(analysisDetailErrorCodes.databaseError);
    });

    it('should handle user with null subscription tier', async () => {
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: {
                    id: mockUserId,
                    subscription_tier: null,
                  },
                  error: null,
                })),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(),
              maybeSingle: vi.fn(),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        };
      });

      const res = await app.request('/analyses/reanalyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validReanalyzeRequest),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(analysisDetailErrorCodes.reanalysisForbidden);
    });
  });
});