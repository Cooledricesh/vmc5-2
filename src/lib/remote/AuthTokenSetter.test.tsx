import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useAuth } from '@clerk/nextjs';
import { AuthTokenSetter } from './AuthTokenSetter';
import { setAuthTokenGetter, clearAuthTokenGetter } from './api-client';

// Clerk의 useAuth 훅을 모킹
vi.mock('@clerk/nextjs', () => ({
  useAuth: vi.fn(),
}));

// api-client의 setAuthTokenGetter를 스파이
vi.mock('./api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api-client')>();
  return {
    ...actual,
    setAuthTokenGetter: vi.fn(actual.setAuthTokenGetter),
    clearAuthTokenGetter: vi.fn(actual.clearAuthTokenGetter),
  };
});

describe('AuthTokenSetter', () => {
  const mockGetToken = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // useAuth가 getToken 함수를 반환하도록 설정
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      getToken: mockGetToken,
    });
  });

  afterEach(() => {
    clearAuthTokenGetter();
  });

  describe('🔴 RED Phase: 잘못된 함수 전달 방식 감지', () => {
    it('setAuthTokenGetter에 올바른 형태의 함수를 전달해야 한다', async () => {
      // Arrange
      const mockToken = 'test-token-123';
      mockGetToken.mockResolvedValue(mockToken);

      // Act
      render(<AuthTokenSetter />);

      // Assert: setAuthTokenGetter가 호출되었는지 확인
      await waitFor(() => {
        expect(setAuthTokenGetter).toHaveBeenCalled();
      });

      // 전달된 함수의 타입을 확인
      const calledWith = (setAuthTokenGetter as ReturnType<typeof vi.fn>).mock.calls[0][0];

      // 🔴 이 테스트는 현재 실패할 것입니다
      // 왜냐하면 AuthTokenSetter가 () => getToken()을 전달하고 있기 때문입니다
      // 올바른 형태는 getToken 함수 자체를 전달하는 것입니다
      expect(typeof calledWith).toBe('function');

      // 전달된 함수를 호출했을 때 토큰을 반환해야 함
      const result = await calledWith();
      expect(result).toBe(mockToken);

      // mockGetToken이 직접 호출되어야 함
      expect(mockGetToken).toHaveBeenCalled();
    });

    it('등록된 토큰 getter가 Clerk의 getToken을 올바르게 호출해야 한다', async () => {
      // Arrange
      const mockToken = 'clerk-token-456';
      mockGetToken.mockResolvedValue(mockToken);

      // Act
      render(<AuthTokenSetter />);

      // 토큰 getter가 등록될 때까지 대기
      await waitFor(() => {
        expect(setAuthTokenGetter).toHaveBeenCalled();
      });

      // 등록된 함수 가져오기
      const registeredGetter = (setAuthTokenGetter as ReturnType<typeof vi.fn>).mock.calls[0][0];

      // 등록된 getter를 호출
      const token = await registeredGetter();

      // Assert
      expect(token).toBe(mockToken);
      expect(mockGetToken).toHaveBeenCalledTimes(1);
    });

    it('컴포넌트 언마운트 시 clearAuthTokenGetter를 호출해야 한다', async () => {
      // Arrange & Act
      const { unmount } = render(<AuthTokenSetter />);

      // 마운트 확인
      await waitFor(() => {
        expect(setAuthTokenGetter).toHaveBeenCalled();
      });

      // Unmount
      unmount();

      // Assert
      await waitFor(() => {
        expect(clearAuthTokenGetter).toHaveBeenCalled();
      });
    });

    it('getToken이 null을 반환하면 등록된 getter도 null을 반환해야 한다', async () => {
      // Arrange
      mockGetToken.mockResolvedValue(null);

      // Act
      render(<AuthTokenSetter />);

      // 토큰 getter가 등록될 때까지 대기
      await waitFor(() => {
        expect(setAuthTokenGetter).toHaveBeenCalled();
      });

      // 등록된 함수 가져오기
      const registeredGetter = (setAuthTokenGetter as ReturnType<typeof vi.fn>).mock.calls[0][0];

      // 등록된 getter를 호출
      const token = await registeredGetter();

      // Assert
      expect(token).toBeNull();
      expect(mockGetToken).toHaveBeenCalledTimes(1);
    });

    it('getToken이 에러를 던지면 등록된 getter도 에러를 던져야 한다', async () => {
      // Arrange
      const mockError = new Error('Token fetch failed');
      mockGetToken.mockRejectedValue(mockError);

      // Act
      render(<AuthTokenSetter />);

      // 토큰 getter가 등록될 때까지 대기
      await waitFor(() => {
        expect(setAuthTokenGetter).toHaveBeenCalled();
      });

      // 등록된 함수 가져오기
      const registeredGetter = (setAuthTokenGetter as ReturnType<typeof vi.fn>).mock.calls[0][0];

      // Assert
      await expect(registeredGetter()).rejects.toThrow('Token fetch failed');
      expect(mockGetToken).toHaveBeenCalledTimes(1);
    });
  });
});
