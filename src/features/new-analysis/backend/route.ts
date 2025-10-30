import type { Hono } from 'hono';
import { respond, failure } from '@/backend/http/response';
import {
  getSupabase,
  getLogger,
  type AppEnv,
} from '@/backend/hono/context';
import { getServerEnv } from '@/backend/config/env';
import { NewAnalysisRequestSchema } from './schema';
import {
  getUserAnalysisCount,
  createNewAnalysis,
  getAnalysisStatus,
} from './service';
import { newAnalysisErrorCodes } from './error';
import { withClerkAuth, getUserId } from '@/backend/middleware/auth';

export const registerNewAnalysisRoutes = (app: Hono<AppEnv>) => {
  // 인증 미들웨어 적용
  app.use('/analyses/*', withClerkAuth());

  // GET /api/analyses/count - 분석 횟수 조회
  app.get('/analyses/count', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const userId = getUserId(c);
    if (!userId) {
      return respond(
        c,
        failure(
          401,
          newAnalysisErrorCodes.unauthorized,
          '인증이 필요합니다',
        ),
      );
    }

    const result = await getUserAnalysisCount(supabase, userId);

    if (!result.ok) {
      logger.error('Failed to fetch analysis count', JSON.stringify(result));
    }

    return respond(c, result);
  });

  // POST /api/analyses/new - 새 분석 생성
  app.post('/analyses/new', async (c) => {
    try {
      const body = await c.req.json();
      const parsedBody = NewAnalysisRequestSchema.safeParse(body);

      if (!parsedBody.success) {
        return respond(
          c,
          failure(
            400,
            newAnalysisErrorCodes.validationError,
            '입력값이 올바르지 않습니다',
            parsedBody.error.format(),
          ),
        );
      }

      const supabase = getSupabase(c);
      const logger = getLogger(c);
      const env = getServerEnv();

      const userId = getUserId(c);
      if (!userId) {
        return respond(
          c,
          failure(
            401,
            newAnalysisErrorCodes.unauthorized,
            '인증이 필요합니다',
          ),
        );
      }

      // 사용자 정보 조회하여 subscription_tier 확인
      const { data: user, error } = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('clerk_user_id', userId)
        .single();

      if (error || !user) {
        logger.error('Failed to fetch user subscription tier', error);
        return respond(
          c,
          failure(
            500,
            newAnalysisErrorCodes.databaseError,
            '사용자 정보를 조회할 수 없습니다',
          ),
        );
      }

      const subscriptionTier = user.subscription_tier || 'free';

      const result = await createNewAnalysis(
        supabase,
        userId,
        subscriptionTier,
        parsedBody.data,
        env.GEMINI_API_KEY,
      );

      if (!result.ok) {
        logger.error('Failed to create analysis', JSON.stringify(result));
      }

      return respond(c, result);
    } catch (error: any) {
      const logger = getLogger(c);
      logger.error('Failed to process new analysis request', error);

      return respond(
        c,
        failure(
          500,
          newAnalysisErrorCodes.databaseError,
          '분석 생성 중 오류가 발생했습니다',
        ),
      );
    }
  });

  // GET /api/analyses/:id/status - 분석 상태 조회 (폴링용)
  app.get('/analyses/:id/status', async (c) => {
    const analysisId = c.req.param('id');
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const userId = getUserId(c);
    if (!userId) {
      return respond(
        c,
        failure(
          401,
          newAnalysisErrorCodes.unauthorized,
          '인증이 필요합니다',
        ),
      );
    }

    const result = await getAnalysisStatus(supabase, analysisId, userId);

    if (!result.ok) {
      logger.error('Failed to fetch analysis status', JSON.stringify(result));
    }

    return respond(c, result);
  });
};