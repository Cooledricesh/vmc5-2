import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, setAuthTokenGetter, clearAuthTokenGetter } from './api-client';
import MockAdapter from 'axios-mock-adapter';

describe('api-client 인증 토큰 주입', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    // axios-mock-adapter를 사용하여 HTTP 요청을 모킹
    mockAxios = new MockAdapter(apiClient);
    clearAuthTokenGetter();
  });

  afterEach(() => {
    mockAxios.restore();
    clearAuthTokenGetter();
  });

  describe('GREEN Phase: Authorization 헤더 자동 추가', () => {
    it('토큰 getter가 등록되고 토큰이 있을 때 Authorization 헤더에 Bearer 토큰을 추가해야 한다', async () => {
      // Arrange
      const mockToken = 'mock-clerk-token-12345';
      const mockGetToken = vi.fn().mockResolvedValue(mockToken);
      setAuthTokenGetter(mockGetToken);

      // Mock API 응답
      mockAxios.onGet('/api/test').reply((config) => {
        // Request config의 헤더를 검증
        expect(config.headers?.Authorization).toBe(`Bearer ${mockToken}`);
        return [200, { success: true }];
      });

      // Act
      const response = await apiClient.get('/api/test');

      // Assert
      expect(mockGetToken).toHaveBeenCalled();
      expect(response.data).toEqual({ success: true });
    });

    it('토큰 getter가 등록되지 않았을 때 Authorization 헤더를 추가하지 않아야 한다', async () => {
      // Arrange
      // setAuthTokenGetter를 호출하지 않음 (getter 없음)

      // Mock API 응답
      mockAxios.onGet('/api/test').reply((config) => {
        // Request config의 헤더 확인
        expect(config.headers?.Authorization).toBeUndefined();
        return [200, { success: true }];
      });

      // Act
      const response = await apiClient.get('/api/test');

      // Assert
      expect(response.data).toEqual({ success: true });
    });

    it('토큰 getter가 null을 반환할 때 Authorization 헤더를 추가하지 않아야 한다', async () => {
      // Arrange
      const mockGetToken = vi.fn().mockResolvedValue(null);
      setAuthTokenGetter(mockGetToken);

      // Mock API 응답
      mockAxios.onGet('/api/test').reply((config) => {
        expect(config.headers?.Authorization).toBeUndefined();
        return [200, { success: true }];
      });

      // Act
      const response = await apiClient.get('/api/test');

      // Assert
      expect(mockGetToken).toHaveBeenCalled();
      expect(response.data).toEqual({ success: true });
    });

    it('getToken 호출 실패 시 Authorization 헤더 없이 요청을 진행해야 한다', async () => {
      // Arrange
      const mockGetToken = vi.fn().mockRejectedValue(new Error('Token fetch failed'));
      setAuthTokenGetter(mockGetToken);

      // Mock API 응답
      mockAxios.onGet('/api/test').reply((config) => {
        expect(config.headers?.Authorization).toBeUndefined();
        return [200, { success: true }];
      });

      // Act
      const response = await apiClient.get('/api/test');

      // Assert
      expect(mockGetToken).toHaveBeenCalled();
      expect(response.data).toEqual({ success: true });
    });
  });
});
