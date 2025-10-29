import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../../../backend/hono/context';
import { getSupabase, getUserId as getContextUserId } from '../../../backend/hono/context';
import { getUserId as getAuthUserId } from '../../../backend/middleware/auth';
import { registerNewAnalysisRoutes } from './route';
import * as service from './service';
import { newAnalysisErrorCodes } from './error';

// Mock the auth middleware
vi.mock('../../../backend/middleware/auth', () => ({
  withClerkAuth: vi.fn(() => async (c: any, next: any) => {
    await next();
  }),
  getUserId: vi.fn(),
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

// Mock the config
vi.mock('../../../backend/config/env', () => ({
  getServerEnv: vi.fn(() => ({
    GEMINI_API_KEY: 'test_gemini_key',
  })),
}));

// Mock the Gemini client
vi.mock('../../../lib/external/gemini-client', () => ({
  getGeminiClient: vi.fn(() => ({})),
  getGeminiProClient: vi.fn(() => ({})),
}));

describe('New Analysis Routes', () => {
  let app: Hono<AppEnv>;
  let mockSupabase: any;
  const mockUserId = 'test-user-id';
  const mockAnalysisId = 'analysis-id-123';
  const mockedGetSupabase = vi.mocked(getSupabase);
  const mockedGetContextUserId = vi.mocked(getContextUserId);
  const mockedGetAuthUserId = vi.mocked(getAuthUserId);

  beforeEach(() => {
    app = new Hono<AppEnv>();
    registerNewAnalysisRoutes(app);

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
                id: mockUserId,
                subscription_tier: 'pro',
                free_analysis_count: 3,
                monthly_analysis_count: 10,
              },
              error: null,
            })),
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

  describe('GET /api/analyses/count', () => {
    it('should return analysis count for authenticated user', async () => {
      const mockCountResponse = {
        subscription_tier: 'pro',
        remaining_count: 8,
        max_count: 10,
        is_insufficient: false,
      };

      vi.spyOn(service, 'getUserAnalysisCount').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockCountResponse,
      });

      const res = await app.request('/analyses/count', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data).toEqual(mockCountResponse);
      expect(service.getUserAnalysisCount).toHaveBeenCalledWith(mockSupabase, mockUserId);
    });

    it('should return insufficient count for free user with no remaining analyses', async () => {
      const mockCountResponse = {
        subscription_tier: 'free',
        remaining_count: 0,
        max_count: 3,
        is_insufficient: true,
      };

      vi.spyOn(service, 'getUserAnalysisCount').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockCountResponse,
      });

      const res = await app.request('/analyses/count', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.is_insufficient).toBe(true);
      expect(body.data.remaining_count).toBe(0);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockedGetAuthUserId.mockReturnValue(null);

      const res = await app.request('/analyses/count', {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(newAnalysisErrorCodes.unauthorized);
    });

    it('should handle database error correctly', async () => {
      vi.spyOn(service, 'getUserAnalysisCount').mockResolvedValue({
        ok: false,
        status: 500,
        error: {
          code: newAnalysisErrorCodes.databaseError,
          message: 'Database connection failed',
        },
      });

      const res = await app.request('/analyses/count', {
        method: 'GET',
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(newAnalysisErrorCodes.databaseError);
    });
  });

  describe('POST /api/analyses/new', () => {
    const validRequest = {
      subject_name: '홍길동',
      birth_date: '1990-01-01',
      birth_time: '14:30',
      gender: 'male',
    };

    it('should create new analysis successfully for pro user', async () => {
      const mockResponse = {
        analysis_id: mockAnalysisId,
        status: 'completed',
        remaining_count: 9,
      };

      vi.spyOn(service, 'createNewAnalysis').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockResponse,
      });

      const res = await app.request('/analyses/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data).toEqual(mockResponse);
      expect(service.createNewAnalysis).toHaveBeenCalledWith(
        mockSupabase,
        mockUserId,
        'pro',
        validRequest,
        'test_gemini_key'
      );
    });

    it('should create analysis for free user', async () => {
      // Mock free user
      mockSupabase.from.mockReturnValue({
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
      });

      const mockResponse = {
        analysis_id: mockAnalysisId,
        status: 'completed',
        remaining_count: 2,
      };

      vi.spyOn(service, 'createNewAnalysis').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockResponse,
      });

      const res = await app.request('/analyses/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(service.createNewAnalysis).toHaveBeenCalledWith(
        mockSupabase,
        mockUserId,
        'free',
        validRequest,
        'test_gemini_key'
      );
    });

    it('should handle insufficient analysis count error', async () => {
      vi.spyOn(service, 'createNewAnalysis').mockResolvedValue({
        ok: false,
        status: 400,
        error: {
          code: newAnalysisErrorCodes.insufficientAnalysisCount,
          message: '분석 가능 횟수가 부족합니다',
        },
      });

      const res = await app.request('/analyses/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(newAnalysisErrorCodes.insufficientAnalysisCount);
    });

    it('should handle analysis already in progress error', async () => {
      vi.spyOn(service, 'createNewAnalysis').mockResolvedValue({
        ok: false,
        status: 409,
        error: {
          code: newAnalysisErrorCodes.analysisInProgress,
          message: '이미 진행 중인 분석이 있습니다',
          details: { existing_analysis_id: 'existing-123' },
        },
      });

      const res = await app.request('/analyses/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(newAnalysisErrorCodes.analysisInProgress);
    });

    it('should return validation error for invalid birth date format', async () => {
      const invalidRequest = {
        ...validRequest,
        birth_date: '01-01-1990', // Wrong format
      };

      const res = await app.request('/analyses/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidRequest),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(newAnalysisErrorCodes.validationError);
    });

    it('should return validation error for invalid gender', async () => {
      const invalidRequest = {
        ...validRequest,
        gender: 'other', // Not 'male' or 'female'
      };

      const res = await app.request('/analyses/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidRequest),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(newAnalysisErrorCodes.validationError);
    });

    it('should handle missing subject name', async () => {
      const invalidRequest = {
        birth_date: '1990-01-01',
        gender: 'male',
      };

      const res = await app.request('/analyses/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidRequest),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(newAnalysisErrorCodes.validationError);
    });

    it('should work without birth time', async () => {
      const requestWithoutTime = {
        subject_name: '홍길동',
        birth_date: '1990-01-01',
        gender: 'male',
        // birth_time is omitted
      };

      const mockResponse = {
        analysis_id: mockAnalysisId,
        status: 'completed',
        remaining_count: 9,
      };

      vi.spyOn(service, 'createNewAnalysis').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockResponse,
      });

      const res = await app.request('/analyses/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestWithoutTime),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      // When birth_time is omitted, zod schema with .optional() will not include it in the parsed data
      expect(service.createNewAnalysis).toHaveBeenCalledWith(
        mockSupabase,
        mockUserId,
        'pro',
        expect.objectContaining({
          subject_name: '홍길동',
          birth_date: '1990-01-01',
          gender: 'male',
          // birth_time will be undefined (not included in object)
        }),
        'test_gemini_key'
      );
    });

    it('should handle Gemini API error', async () => {
      vi.spyOn(service, 'createNewAnalysis').mockResolvedValue({
        ok: false,
        status: 500,
        error: {
          code: newAnalysisErrorCodes.geminiApiError,
          message: 'AI 분석 중 오류가 발생했습니다',
        },
      });

      const res = await app.request('/analyses/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(newAnalysisErrorCodes.geminiApiError);
    });

    it('should handle timeout error', async () => {
      vi.spyOn(service, 'createNewAnalysis').mockResolvedValue({
        ok: false,
        status: 408,
        error: {
          code: newAnalysisErrorCodes.analysisTimeout,
          message: '분석 요청 시간이 초과되었습니다',
        },
      });

      const res = await app.request('/analyses/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(408);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(newAnalysisErrorCodes.analysisTimeout);
    });

    it('should return 401 when not authenticated', async () => {
      mockedGetAuthUserId.mockReturnValue(null);

      const res = await app.request('/analyses/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(newAnalysisErrorCodes.unauthorized);
    });

    it('should handle user fetch error', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: null,
              error: new Error('User not found'),
            })),
          })),
        })),
      });

      const res = await app.request('/analyses/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validRequest),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(newAnalysisErrorCodes.databaseError);
    });

    it('should handle JSON parse error', async () => {
      const res = await app.request('/analyses/new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(newAnalysisErrorCodes.databaseError);
    });
  });

  describe('GET /api/analyses/:id/status', () => {
    it('should return analysis status for valid analysis', async () => {
      const mockStatusResponse = {
        id: mockAnalysisId,
        status: 'completed',
        analysis_result: { /* analysis data */ },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:05:00Z',
      };

      vi.spyOn(service, 'getAnalysisStatus').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockStatusResponse,
      });

      const res = await app.request(`/analyses/${mockAnalysisId}/status`, {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data).toEqual(mockStatusResponse);
      expect(service.getAnalysisStatus).toHaveBeenCalledWith(
        mockSupabase,
        mockAnalysisId,
        mockUserId
      );
    });

    it('should return processing status for ongoing analysis', async () => {
      const mockStatusResponse = {
        id: mockAnalysisId,
        status: 'processing',
        analysis_result: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      vi.spyOn(service, 'getAnalysisStatus').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockStatusResponse,
      });

      const res = await app.request(`/analyses/${mockAnalysisId}/status`, {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.status).toBe('processing');
      expect(body.data.analysis_result).toBeNull();
    });

    it('should return failed status for failed analysis', async () => {
      const mockStatusResponse = {
        id: mockAnalysisId,
        status: 'failed',
        analysis_result: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:01:00Z',
      };

      vi.spyOn(service, 'getAnalysisStatus').mockResolvedValue({
        ok: true,
        status: 200,
        data: mockStatusResponse,
      });

      const res = await app.request(`/analyses/${mockAnalysisId}/status`, {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(true);
      expect(body.data.status).toBe('failed');
    });

    it('should return 404 when analysis not found', async () => {
      vi.spyOn(service, 'getAnalysisStatus').mockResolvedValue({
        ok: false,
        status: 404,
        error: {
          code: newAnalysisErrorCodes.analysisNotFound,
          message: '분석을 찾을 수 없습니다',
        },
      });

      const res = await app.request(`/analyses/non-existent-id/status`, {
        method: 'GET',
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(newAnalysisErrorCodes.analysisNotFound);
    });

    it('should return 401 when not authenticated', async () => {
      mockedGetAuthUserId.mockReturnValue(null);

      const res = await app.request(`/analyses/${mockAnalysisId}/status`, {
        method: 'GET',
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(newAnalysisErrorCodes.unauthorized);
    });

    it('should handle database error', async () => {
      vi.spyOn(service, 'getAnalysisStatus').mockResolvedValue({
        ok: false,
        status: 500,
        error: {
          code: newAnalysisErrorCodes.databaseError,
          message: 'Database connection failed',
        },
      });

      const res = await app.request(`/analyses/${mockAnalysisId}/status`, {
        method: 'GET',
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe(newAnalysisErrorCodes.databaseError);
    });
  });
});