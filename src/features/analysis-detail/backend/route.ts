import type { Hono } from 'hono';
import { respond, failure } from '@/backend/http/response';
import { getSupabase, getLogger, type AppEnv } from '@/backend/hono/context';
import { ReanalyzeRequestSchema } from './schema';
import { getAnalysisById, deleteAnalysis } from './service';
import { analysisDetailErrorCodes } from './error';
import { withClerkAuth, getUserId } from '@/backend/middleware/auth';

export const registerAnalysisDetailRoutes = (app: Hono<AppEnv>) => {
  // 인증 미들웨어 적용
  app.use('/analyses/*', withClerkAuth());

  // GET /api/analyses/:id - 분석 조회
  app.get('/analyses/:id', async (c) => {
    const analysisId = c.req.param('id');
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const userId = getUserId(c);
    if (!userId) {
      return respond(
        c,
        failure(
          401,
          analysisDetailErrorCodes.unauthorized,
          '인증이 필요합니다'
        )
      );
    }

    const result = await getAnalysisById(supabase, analysisId, userId);

    if (!result.ok) {
      logger.error('Failed to fetch analysis', JSON.stringify(result));
    }

    return respond(c, result);
  });

  // DELETE /api/analyses/:id - 분석 삭제
  app.delete('/analyses/:id', async (c) => {
    const analysisId = c.req.param('id');
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const userId = getUserId(c);
    if (!userId) {
      return respond(
        c,
        failure(
          401,
          analysisDetailErrorCodes.unauthorized,
          '인증이 필요합니다'
        )
      );
    }

    const result = await deleteAnalysis(supabase, analysisId, userId);

    if (!result.ok) {
      logger.error('Failed to delete analysis', JSON.stringify(result));
    }

    return respond(c, result);
  });

  // POST /api/analyses/reanalyze - 재분석 요청
  app.post('/analyses/reanalyze', async (c) => {
    const body = await c.req.json();
    const parsedBody = ReanalyzeRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return respond(
        c,
        failure(
          400,
          analysisDetailErrorCodes.validationError,
          '잘못된 요청 파라미터입니다',
          parsedBody.error.format()
        )
      );
    }

    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const userId = getUserId(c);
    if (!userId) {
      return respond(
        c,
        failure(
          401,
          analysisDetailErrorCodes.unauthorized,
          '인증이 필요합니다'
        )
      );
    }

    // 사용자 정보 조회하여 subscription_tier 확인
    const { data: user, error } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    if (error || !user) {
      logger.error('Failed to fetch user subscription tier', error);
      return respond(
        c,
        failure(
          500,
          analysisDetailErrorCodes.databaseError,
          '사용자 정보를 조회할 수 없습니다'
        )
      );
    }

    const subscriptionTier = user.subscription_tier || 'free';

    // Pro 회원 확인
    if (subscriptionTier !== 'pro') {
      return respond(
        c,
        failure(403, analysisDetailErrorCodes.reanalysisForbidden, 'Pro 구독이 필요합니다')
      );
    }

    // TODO: new-analysis 서비스의 createNewAnalysis 함수 호출
    // 현재는 구조만 작성
    logger.info('Reanalysis requested', { userId, originalId: parsedBody.data.original_analysis_id });

    return respond(
      c,
      failure(501, 'NOT_IMPLEMENTED', '재분석 기능은 아직 구현되지 않았습니다')
    );
  });
};
