import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@/lib/remote/api-client';
import { createAnalysis } from './api';
import type { NewAnalysisRequest } from './dto';

// Mock apiClient
vi.mock('@/lib/remote/api-client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
  extractApiErrorMessage: vi.fn((error) => error.message || 'Unknown error'),
}));

describe('New Analysis API Client', () => {
  const mockRequest: NewAnalysisRequest = {
    subject_name: '홍길동',
    birth_date: '1990-01-01',
    birth_time: '14:30',
    gender: 'male',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAnalysis', () => {
    it('should call apiClient.post with correct endpoint and data', async () => {
      const mockResponse = {
        data: {
          ok: true,
          data: {
            analysis_id: 'test-id-123',
            status: 'completed',
            remaining_count: 9,
          },
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await createAnalysis(mockRequest);

      expect(apiClient.post).toHaveBeenCalledWith('/api/analyses/new', mockRequest);
      expect(result).toEqual({
        analysis_id: 'test-id-123',
        status: 'completed',
        remaining_count: 9,
      });
    });

    it('should use apiClient which includes Authorization header via interceptor', async () => {
      const mockResponse = {
        data: {
          ok: true,
          data: {
            analysis_id: 'test-id-456',
            status: 'processing',
            remaining_count: 8,
          },
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      await createAnalysis(mockRequest);

      // apiClient가 호출되었는지 확인 (interceptor가 자동으로 Authorization 헤더 추가)
      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.post).toHaveBeenCalledWith('/api/analyses/new', mockRequest);
    });

    it('should handle insufficient analysis count error', async () => {
      const mockError = {
        response: {
          data: {
            ok: false,
            error: {
              code: 'INSUFFICIENT_ANALYSIS_COUNT',
              message: '분석 가능 횟수가 부족합니다',
            },
          },
        },
      };

      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      await expect(createAnalysis(mockRequest)).rejects.toThrow();
    });

    it('should handle unauthorized error (401)', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            ok: false,
            error: {
              code: 'UNAUTHORIZED',
              message: '인증이 필요합니다',
            },
          },
        },
      };

      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      await expect(createAnalysis(mockRequest)).rejects.toThrow();
    });

    it('should handle network error', async () => {
      const mockError = new Error('Network Error');
      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      await expect(createAnalysis(mockRequest)).rejects.toThrow('Network Error');
    });

    it('should work without birth_time', async () => {
      const requestWithoutTime: NewAnalysisRequest = {
        subject_name: '홍길동',
        birth_date: '1990-01-01',
        gender: 'female',
      };

      const mockResponse = {
        data: {
          ok: true,
          data: {
            analysis_id: 'test-id-789',
            status: 'completed',
            remaining_count: 7,
          },
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await createAnalysis(requestWithoutTime);

      expect(apiClient.post).toHaveBeenCalledWith('/api/analyses/new', requestWithoutTime);
      expect(result.analysis_id).toBe('test-id-789');
    });
  });
});
