import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSummary, fetchStats, fetchAnalyses } from './dashboardActions';
import { apiClient, setAuthTokenGetter } from '@/lib/remote/api-client';
import MockAdapter from 'axios-mock-adapter';

describe('dashboardActions 통합 테스트', () => {
  let mockAxios: MockAdapter;
  let mockDispatch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
    mockDispatch = vi.fn();

    // Mock token getter 설정
    const mockToken = 'test-clerk-token';
    setAuthTokenGetter(async () => mockToken);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('fetchSummary', () => {
    it('인증 토큰과 함께 대시보드 요약 정보를 요청해야 한다', async () => {
      // Arrange
      const mockSummaryData = {
        user: {
          id: 'user-1',
          name: '테스트 사용자',
          email: 'test@example.com',
          subscription_tier: 'pro',
        },
        subscription: {
          status: 'active',
          next_payment_date: null,
          card_last_4digits: null,
          remaining_count: 10,
        },
      };

      mockAxios.onGet('/api/dashboard/summary').reply((config) => {
        // Authorization 헤더가 포함되어 있는지 확인
        expect(config.headers?.Authorization).toBe('Bearer test-clerk-token');
        return [200, mockSummaryData];
      });

      // Act
      await fetchSummary(mockDispatch);

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'FETCH_SUMMARY_START' });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'FETCH_SUMMARY_SUCCESS',
        payload: mockSummaryData,
      });
    });

    it('401 에러 시 적절한 에러 메시지와 함께 실패 액션을 dispatch해야 한다', async () => {
      // Arrange
      mockAxios.onGet('/api/dashboard/summary').reply(401, {
        error: { message: '인증이 필요합니다' },
      });

      // Act
      await fetchSummary(mockDispatch);

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'FETCH_SUMMARY_START' });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'FETCH_SUMMARY_ERROR',
        payload: { error: '인증이 필요합니다' },
      });
    });
  });

  describe('fetchStats', () => {
    it('인증 토큰과 함께 대시보드 통계를 요청해야 한다', async () => {
      // Arrange
      const mockStatsData = {
        total_count: 10,
        monthly_count: 8,
        this_week_count: 2,
      };

      mockAxios.onGet('/api/dashboard/stats').reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer test-clerk-token');
        return [200, mockStatsData];
      });

      // Act
      await fetchStats(mockDispatch);

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'FETCH_STATS_START' });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'FETCH_STATS_SUCCESS',
        payload: mockStatsData,
      });
    });

    it('401 에러 시 적절한 에러 메시지와 함께 실패 액션을 dispatch해야 한다', async () => {
      // Arrange
      mockAxios.onGet('/api/dashboard/stats').reply(401, {
        error: { message: '인증이 필요합니다' },
      });

      // Act
      await fetchStats(mockDispatch);

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'FETCH_STATS_START' });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'FETCH_STATS_ERROR',
        payload: { error: '인증이 필요합니다' },
      });
    });
  });

  describe('fetchAnalyses', () => {
    it('인증 토큰과 함께 분석 목록을 요청해야 한다', async () => {
      // Arrange
      const params = { period: 'all', sort: 'latest', page: 1, limit: 10 };
      const mockAnalysesData = {
        analyses: [
          {
            id: '1',
            subject_name: '분석 1',
            birth_date: '2020-01-01',
            gender: 'male' as const,
            ai_model: 'gpt-4',
            status: 'completed' as const,
            created_at: '2024-01-01T00:00:00Z',
            view_count: 5,
          },
          {
            id: '2',
            subject_name: '분석 2',
            birth_date: '2020-01-01',
            gender: 'female' as const,
            ai_model: 'gpt-4',
            status: 'processing' as const,
            created_at: '2024-01-01T00:00:00Z',
            view_count: 0,
          },
        ],
        pagination: { current_page: 1, per_page: 10, total_count: 2, total_pages: 1 },
      };

      mockAxios.onGet('/api/analyses').reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer test-clerk-token');
        expect(config.params).toEqual(params);
        return [200, mockAnalysesData];
      });

      // Act
      await fetchAnalyses(mockDispatch, params);

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'FETCH_ANALYSES_START' });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'FETCH_ANALYSES_SUCCESS',
        payload: mockAnalysesData,
      });
    });

    it('처리 중인 분석이 있으면 폴링을 시작해야 한다', async () => {
      // Arrange
      const params = { period: 'all', sort: 'latest', page: 1, limit: 10 };
      const mockAnalysesData = {
        analyses: [
          {
            id: '1',
            subject_name: '분석 1',
            birth_date: '2020-01-01',
            gender: 'male' as const,
            ai_model: 'gpt-4',
            status: 'processing' as const,
            created_at: '2024-01-01T00:00:00Z',
            view_count: 0,
          },
        ],
        pagination: { current_page: 1, per_page: 10, total_count: 1, total_pages: 1 },
      };

      mockAxios.onGet('/api/analyses').reply(200, mockAnalysesData);

      // Act
      await fetchAnalyses(mockDispatch, params);

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'START_POLLING' });
    });

    it('처리 중인 분석이 없으면 폴링을 중지해야 한다', async () => {
      // Arrange
      const params = { period: 'all', sort: 'latest', page: 1, limit: 10 };
      const mockAnalysesData = {
        analyses: [
          {
            id: '1',
            subject_name: '분석 1',
            birth_date: '2020-01-01',
            gender: 'male' as const,
            ai_model: 'gpt-4',
            status: 'completed' as const,
            created_at: '2024-01-01T00:00:00Z',
            view_count: 5,
          },
        ],
        pagination: { current_page: 1, per_page: 10, total_count: 1, total_pages: 1 },
      };

      mockAxios.onGet('/api/analyses').reply(200, mockAnalysesData);

      // Act
      await fetchAnalyses(mockDispatch, params);

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'STOP_POLLING' });
    });

    it('401 에러 시 적절한 에러 메시지와 함께 실패 액션을 dispatch해야 한다', async () => {
      // Arrange
      const params = { period: 'all', sort: 'latest', page: 1, limit: 10 };
      mockAxios.onGet('/api/analyses').reply(401, {
        error: { message: '인증이 필요합니다' },
      });

      // Act
      await fetchAnalyses(mockDispatch, params);

      // Assert
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'FETCH_ANALYSES_START' });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'FETCH_ANALYSES_ERROR',
        payload: { error: '인증이 필요합니다' },
      });
    });
  });
});
