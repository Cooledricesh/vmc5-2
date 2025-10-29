import { createClerkClient, verifyToken } from '@clerk/backend';
import type { Context, Next } from 'hono';
import { failure } from '@/backend/http/response';
import type { AppEnv } from '@/backend/hono/context';
import { UserSyncService } from '@/features/auth/backend/user-sync.service';

/**
 * Clerk 클라이언트 생성 (환경 변수 검증 포함)
 */
function getClerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY 환경 변수가 설정되지 않았습니다');
  }

  return createClerkClient({ secretKey });
}

/**
 * Clerk 토큰 검증 (환경 변수 검증 포함)
 */
async function verifyClerkToken(token: string) {
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY 환경 변수가 설정되지 않았습니다');
  }

  return verifyToken(token, { secretKey });
}

/**
 * Authorization 헤더에서 Bearer 토큰 추출
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Clerk Bearer Token 인증 미들웨어
 *
 * 이 미들웨어는:
 * 1. Authorization 헤더에서 Bearer 토큰 추출
 * 2. Clerk SDK로 JWT 토큰 검증
 * 3. userId 추출 후 Context에 저장
 * 4. Supabase DB에서 사용자 확인 (없으면 자동 생성)
 * 5. 인증 실패 시 401 에러 반환
 */
export async function clerkAuthMiddleware(c: Context<AppEnv>, next: Next) {
  const logger = c.get('logger') || console;

  try {
    // 1. Authorization 헤더에서 Bearer 토큰 추출
    const authHeader = c.req.header('Authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      logger.warn('인증 실패: Authorization 헤더가 없거나 Bearer 형식이 아닙니다');
      return c.json(
        failure(401, 'UNAUTHORIZED', '인증이 필요합니다').error,
        401
      );
    }

    // 2. Clerk SDK로 토큰 검증
    const verifiedToken = await verifyClerkToken(token);
    const userId = verifiedToken.sub;

    if (!userId) {
      logger.warn('인증 실패: 토큰에 userId(sub)가 없습니다');
      return c.json(
        failure(401, 'UNAUTHORIZED', '유효하지 않은 토큰입니다').error,
        401
      );
    }

    logger.info(`사용자 인증 성공: ${userId}`);

    // 3. Context에 userId 저장
    c.set('userId', userId);

    // 4. Supabase에서 사용자 확인 및 자동 생성
    const supabase = c.get('supabase');
    if (supabase) {
      const syncService = new UserSyncService(supabase);
      const result = await syncService.getUserByClerkId(userId);

      // 사용자가 없으면 Clerk에서 정보를 가져와 생성
      if (result.success && !result.data) {
        try {
          logger.info(`Supabase에 사용자 없음. 자동 생성 시도: ${userId}`);
          const clerk = getClerkClient();
          const clerkUser = await clerk.users.getUser(userId);

          if (clerkUser) {
            const userData = {
              clerkUserId: userId,
              email: clerkUser.emailAddresses?.[0]?.emailAddress || null,
              name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
                    clerkUser.username || null,
              profileImage: clerkUser.imageUrl || null,
            };

            const upsertResult = await syncService.upsertUser(userData);
            if (!upsertResult.success) {
              logger.error(`사용자 자동 생성 실패: ${userId}`, upsertResult.error);
            } else {
              logger.info(`사용자 자동 생성 성공: ${userId}`);
            }
          }
        } catch (error) {
          logger.error(`Clerk 사용자 정보 조회 실패: ${userId}`, error);
        }
      }
    }

    await next();
  } catch (error) {
    logger.error('Clerk auth middleware error:', error);
    return c.json(
      failure(401, 'UNAUTHORIZED', '토큰 검증 실패').error,
      401
    );
  }
}

/**
 * 선택적 인증 미들웨어 (로그인하지 않아도 접근 가능)
 * userId가 있으면 Context에 저장, 없으면 그냥 통과
 */
export async function optionalClerkAuth(c: Context<AppEnv>, next: Next) {
  const logger = c.get('logger') || console;

  try {
    const authHeader = c.req.header('Authorization');
    const token = extractBearerToken(authHeader);

    if (token) {
      const verifiedToken = await verifyClerkToken(token);
      const userId = verifiedToken.sub;

      if (userId) {
        c.set('userId', userId);
        logger.info(`선택적 인증 성공: ${userId}`);
      }
    }

    await next();
  } catch (error) {
    logger.error('Optional clerk auth error:', error);
    // 선택적 인증이므로 에러가 발생해도 계속 진행
    await next();
  }
}
