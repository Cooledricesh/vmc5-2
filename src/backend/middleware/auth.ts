import type { Context, Next } from 'hono';
import type { AppEnv } from '@/backend/hono/context';
import { failure } from '@/backend/http/response';
import { clerkClient } from '@clerk/nextjs/server';

/**
 * Clerk 인증 미들웨어
 * Authorization 헤더에서 Clerk JWT 토큰을 추출하고 검증
 */
export function withClerkAuth() {
  return async (c: Context<AppEnv>, next: Next) => {
    try {
      // Authorization 헤더에서 토큰 추출
      const authHeader = c.req.header('authorization');

      if (!authHeader) {
        const errorResponse = failure(401, 'UNAUTHORIZED', 'Authorization header is missing');
        return c.json(errorResponse, 401);
      }

      // Bearer 토큰 추출
      const token = authHeader.replace('Bearer ', '');
      if (!token) {
        const errorResponse = failure(401, 'UNAUTHORIZED', 'Invalid authorization header');
        return c.json(errorResponse, 401);
      }

      // Clerk 토큰 검증 및 사용자 정보 추출
      try {
        // Clerk의 세션 검증 (실제 구현시 clerk의 verifyToken 사용)
        // TODO: Clerk SDK에서 직접 토큰 검증하는 방법 사용
        const userId = extractUserIdFromToken(token);

        if (!userId) {
          const errorResponse = failure(401, 'UNAUTHORIZED', 'Invalid token');
          return c.json(errorResponse, 401);
        }

        // Context에 userId 설정
        c.set('userId' as never, userId as never);

        // 추가 사용자 정보가 필요한 경우
        // const user = await clerkClient.users.getUser(userId);
        // c.set('userEmail' as never, user.emailAddresses[0]?.emailAddress as never);

      } catch (error) {
        console.error('Token verification failed:', error);
        const errorResponse = failure(401, 'UNAUTHORIZED', 'Token verification failed');
        return c.json(errorResponse, 401);
      }

      return next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      const errorResponse = failure(500, 'AUTH_ERROR', 'Authentication error');
      return c.json(errorResponse, 500);
    }
  };
}

/**
 * JWT 토큰에서 userId 추출 (임시 구현)
 * 실제로는 Clerk SDK의 verifyToken을 사용해야 함
 */
function extractUserIdFromToken(token: string): string | null {
  try {
    // JWT의 payload 부분 디코드 (실제 검증 없이)
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString()
    );

    return payload.sub || payload.userId || null;
  } catch {
    return null;
  }
}

/**
 * 선택적 인증 미들웨어
 * 로그인하지 않아도 접근 가능하지만, 로그인 상태면 userId를 설정
 */
export function withOptionalAuth() {
  return async (c: Context<AppEnv>, next: Next) => {
    try {
      const authHeader = c.req.header('authorization');

      if (!authHeader) {
        // 인증 없이 진행
        c.set('userId' as never, null as never);
        return next();
      }

      const token = authHeader.replace('Bearer ', '');
      if (token) {
        const userId = extractUserIdFromToken(token);
        c.set('userId' as never, userId as never);
      } else {
        c.set('userId' as never, null as never);
      }

      return next();
    } catch (error) {
      // 오류 발생시에도 계속 진행 (선택적 인증)
      c.set('userId' as never, null as never);
      return next();
    }
  };
}

/**
 * Context에서 userId 가져오기
 */
export function getUserId(c: Context<AppEnv>): string | null {
  return c.get('userId' as never) || null;
}

/**
 * Context에서 userEmail 가져오기
 */
export function getUserEmail(c: Context<AppEnv>): string | null {
  return c.get('userEmail' as never) || null;
}

/**
 * 인증 필수 확인
 */
export function requireAuth(c: Context<AppEnv>): string {
  const userId = getUserId(c);
  if (!userId) {
    throw new Error('User not authenticated');
  }
  return userId;
}