import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useAuth } from '@clerk/nextjs';
import { AuthTokenSetter } from './AuthTokenSetter';
import { apiClient, clearAuthTokenGetter } from './api-client';
import MockAdapter from 'axios-mock-adapter';

// Clerk의 useAuth 훅을 모킹
vi.mock('@clerk/nextjs', () => ({
  useAuth: vi.fn(),
}));

describe('🔴 RED Phase: AuthTokenSetter + apiClient 통합 테스트', () => {
  let mockAxios: MockAdapter;
  const mockGetToken = vi.fn();

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
    vi.clearAllMocks();
    clearAuthTokenGetter();

    // useAuth가 getToken 함수를 반환하도록 설정
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      getToken: mockGetToken,
    });
  });

  afterEach(() => {
    mockAxios.restore();
    clearAuthTokenGetter();
  });

  describe('실제 런타임 시나리오: AuthTokenSetter 마운트 → API 요청', () => {
    it('AuthTokenSetter가 마운트되고, API 요청 시 Authorization 헤더가 추가되어야 한다', async () => {
      // Arrange
      const mockToken = 'clerk-token-from-browser';
      mockGetToken.mockResolvedValue(mockToken);

      let capturedAuthHeader: string | undefined;

      // API 모킹: 헤더를 캡처
      mockAxios.onGet('/api/dashboard/summary').reply((config) => {
        capturedAuthHeader = config.headers?.Authorization as string;
        return [200, { success: true, data: {} }];
      });

      // Act 1: AuthTokenSetter 컴포넌트 렌더링
      render(<AuthTokenSetter />);

      // 토큰 getter가 등록될 때까지 대기
      await waitFor(() => {
        expect(mockGetToken).not.toHaveBeenCalled(); // 아직 호출되지 않아야 함
      });

      // Act 2: API 요청 실행 (실제 대시보드에서 발생하는 상황 시뮬레이션)
      const response = await apiClient.get('/api/dashboard/summary');

      // Assert
      expect(response.status).toBe(200);
      expect(mockGetToken).toHaveBeenCalled();
      expect(capturedAuthHeader).toBe(`Bearer ${mockToken}`);
    });

    it('Clerk 초기화 전에 API 요청이 발생하면 토큰 없이 요청되어야 한다', async () => {
      // Arrange: getToken이 아직 초기화되지 않아 null 반환
      mockGetToken.mockResolvedValue(null);

      let capturedAuthHeader: string | undefined;

      mockAxios.onGet('/api/analyses').reply((config) => {
        capturedAuthHeader = config.headers?.Authorization as string;
        return [401, { error: { message: 'Unauthorized' } }];
      });

      // Act
      render(<AuthTokenSetter />);

      try {
        await apiClient.get('/api/analyses');
      } catch (error) {
        // 401 에러가 예상됨
      }

      // Assert
      await waitFor(() => {
        expect(mockGetToken).toHaveBeenCalled();
      });
      expect(capturedAuthHeader).toBeUndefined();
    });

    it('getToken이 실패하면 Authorization 헤더 없이 요청이 진행되어야 한다', async () => {
      // Arrange
      mockGetToken.mockRejectedValue(new Error('Clerk not initialized'));

      let capturedAuthHeader: string | undefined;

      mockAxios.onGet('/api/test').reply((config) => {
        capturedAuthHeader = config.headers?.Authorization as string;
        return [401, { error: { message: 'Unauthorized' } }];
      });

      // Act
      render(<AuthTokenSetter />);

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      try {
        await apiClient.get('/api/test');
      } catch (error) {
        // 401 에러 예상
      }

      // Assert
      await waitFor(() => {
        expect(mockGetToken).toHaveBeenCalled();
      });
      expect(capturedAuthHeader).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[apiClient] Failed to get auth token:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('여러 API 요청이 동시에 발생해도 각 요청마다 토큰을 가져와야 한다', async () => {
      // Arrange
      const mockToken = 'concurrent-token';
      mockGetToken.mockResolvedValue(mockToken);

      mockAxios.onGet('/api/dashboard/summary').reply(200, { data: 'summary' });
      mockAxios.onGet('/api/dashboard/stats').reply(200, { data: 'stats' });
      mockAxios.onGet('/api/analyses').reply(200, { data: 'analyses' });

      // Act
      render(<AuthTokenSetter />);

      await waitFor(() => {
        // 토큰 getter가 등록될 시간 확보
      });

      // 동시에 여러 요청 실행
      const [res1, res2, res3] = await Promise.all([
        apiClient.get('/api/dashboard/summary'),
        apiClient.get('/api/dashboard/stats'),
        apiClient.get('/api/analyses'),
      ]);

      // Assert
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res3.status).toBe(200);

      // getToken이 각 요청마다 호출되어야 함
      expect(mockGetToken).toHaveBeenCalledTimes(3);
    });

    it('🔴 실패 케이스: AuthTokenSetter가 렌더링되지 않으면 토큰이 추가되지 않는다', async () => {
      // Arrange
      const mockToken = 'should-not-be-used';
      mockGetToken.mockResolvedValue(mockToken);

      let capturedAuthHeader: string | undefined;

      mockAxios.onGet('/api/test').reply((config) => {
        capturedAuthHeader = config.headers?.Authorization as string;
        return [401, { error: { message: 'Unauthorized' } }];
      });

      // Act: AuthTokenSetter를 렌더링하지 않음
      // render(<AuthTokenSetter />); // ← 이 줄을 실행하지 않음

      try {
        await apiClient.get('/api/test');
      } catch (error) {
        // 401 에러 예상
      }

      // Assert
      expect(mockGetToken).not.toHaveBeenCalled();
      expect(capturedAuthHeader).toBeUndefined();

      // 이 테스트는 AuthTokenSetter가 제대로 렌더링되지 않으면
      // 인증 토큰이 추가되지 않는다는 것을 증명합니다
    });
  });

  describe('실제 브라우저 환경 시뮬레이션', () => {
    it('페이지 로드 → Clerk 초기화 → API 요청 시퀀스', async () => {
      // Arrange: 초기에는 토큰이 없음
      mockGetToken.mockResolvedValue(null);

      mockAxios.onGet('/api/test').reply((config) => {
        const hasAuth = !!config.headers?.Authorization;
        if (!hasAuth) {
          return [401, { error: { message: 'Unauthorized' } }];
        }
        return [200, { success: true }];
      });

      // Act 1: 컴포넌트 렌더링 (페이지 로드 시뮬레이션)
      const { rerender } = render(<AuthTokenSetter />);

      // Act 2: Clerk가 아직 초기화 안 됨 → API 요청 실패
      try {
        await apiClient.get('/api/test');
      } catch (error) {
        // 401 예상
      }

      expect(mockGetToken).toHaveBeenCalled();
      mockGetToken.mockClear();

      // Act 3: Clerk가 초기화됨 (토큰 사용 가능)
      const mockToken = 'clerk-token-ready';
      mockGetToken.mockResolvedValue(mockToken);

      // 컴포넌트 재렌더링 (useAuth가 업데이트된 상태)
      (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
        getToken: mockGetToken,
      });
      rerender(<AuthTokenSetter />);

      // Act 4: 이제 API 요청 성공
      const response = await apiClient.get('/api/test');

      // Assert
      expect(response.status).toBe(200);
      expect(mockGetToken).toHaveBeenCalled();
    });
  });
});
