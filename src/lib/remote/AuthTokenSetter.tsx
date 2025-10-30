'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { setAuthTokenGetter, clearAuthTokenGetter } from './api-client';

/**
 * Clerk의 getToken을 api-client에 자동으로 등록하는 컴포넌트
 *
 * 이 컴포넌트는 Clerk의 useAuth 훅에서 가져온 getToken 함수를
 * api-client의 request interceptor에 등록하여, 모든 API 요청에
 * 자동으로 Authorization 헤더를 추가합니다.
 *
 * @remarks
 * - ClerkProvider 내부에서 사용해야 합니다.
 * - UI를 렌더링하지 않습니다 (side-effect만 처리).
 * - 컴포넌트가 언마운트되면 토큰 getter를 자동으로 제거합니다.
 *
 * @example
 * ```tsx
 * // app/providers.tsx
 * <ClerkProvider>
 *   <AuthTokenSetter />
 *   <ThemeProvider>
 *     {children}
 *   </ThemeProvider>
 * </ClerkProvider>
 * ```
 */
export function AuthTokenSetter(): null {
  const { getToken } = useAuth();

  useEffect(() => {
    console.log('[AuthTokenSetter] Mounting...');
    console.log('[AuthTokenSetter] getToken type:', typeof getToken);
    console.log('[AuthTokenSetter] getToken:', getToken);

    // getToken 함수를 api-client에 등록
    // 모든 API 요청 시 자동으로 Clerk 토큰을 헤더에 추가
    setAuthTokenGetter(getToken);

    console.log('[AuthTokenSetter] Token getter registered successfully');

    // Cleanup: 컴포넌트 언마운트 시 토큰 getter 제거
    return () => {
      console.log('[AuthTokenSetter] Unmounting and clearing token getter...');
      clearAuthTokenGetter();
    };
  }, [getToken]);

  // UI를 렌더링하지 않음 (side-effect만 처리)
  return null;
}
