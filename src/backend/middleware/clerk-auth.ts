import { auth, currentUser } from '@clerk/nextjs/server';
import type { Context, Next } from 'hono';
import { failure } from '@/backend/http/response';
import type { AppEnv } from '@/backend/hono/context';
import { UserSyncService } from '@/features/auth/backend/user-sync.service';

/**
 * ✅ Clerk v6: auth()는 비동기 함수이므로 반드시 await 사용
 *
 * 이 미들웨어는:
 * 1. Clerk JWT 토큰을 검증
 * 2. userId 추출 후 Context에 저장
 * 3. Supabase DB에서 사용자 확인 (없으면 자동 생성)
 * 4. 인증 실패 시 401 에러 반환
 */
export async function clerkAuthMiddleware(c: Context<AppEnv>, next: Next) {
  try {
    // ✅ v6부터 auth()는 Promise를 반환하므로 await 필수
    const { userId } = await auth();

    if (!userId) {
      return c.json(
        failure(401, 'UNAUTHORIZED', '인증이 필요합니다').error,
        401
      );
    }

    // Context에 userId 저장
    c.set('userId', userId);

    // Supabase에서 사용자 확인 및 자동 생성
    const supabase = c.get('supabase');
    if (supabase) {
      const syncService = new UserSyncService(supabase);
      const result = await syncService.getUserByClerkId(userId);

      // 사용자가 없으면 Clerk에서 정보를 가져와 생성
      if (result.success && !result.data) {
        try {
          const clerkUser = await currentUser();
          if (clerkUser) {
            const userData = {
              clerkUserId: userId,
              email: clerkUser.emailAddresses?.[0]?.emailAddress || null,
              name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
                    clerkUser.username || null,
              profileImage: clerkUser.imageUrl || null,
            };

            const result = await syncService.upsertUser(userData);
            if (!result.success) {
              console.error('사용자 자동 생성 실패:', result.error);
            } else {
              console.log('사용자 자동 생성 성공:', userId);
            }
          }
        } catch (error) {
          console.error('Clerk 사용자 정보 조회 실패:', error);
        }
      }
    }

    await next();
  } catch (error) {
    console.error('Clerk auth middleware error:', error);
    return c.json(
      failure(401, 'UNAUTHORIZED', '인증 처리 중 오류가 발생했습니다').error,
      401
    );
  }
}

/**
 * 선택적 인증 미들웨어 (로그인하지 않아도 접근 가능)
 * userId가 있으면 Context에 저장, 없으면 그냥 통과
 */
export async function optionalClerkAuth(c: Context<AppEnv>, next: Next) {
  try {
    const { userId } = await auth();
    if (userId) {
      c.set('userId', userId);
    }
    await next();
  } catch (error) {
    console.error('Optional clerk auth error:', error);
    await next();
  }
}
