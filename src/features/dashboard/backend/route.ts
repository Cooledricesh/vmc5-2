import type { Hono } from 'hono';
import { respond, failure } from '@/backend/http/response';
import { getSupabase, getLogger, type AppEnv } from '@/backend/hono/context';
import { AnalysesListRequestSchema } from './schema';
import {
  getDashboardSummary,
  getDashboardStats,
  getAnalysesList,
} from './service';
import { dashboardErrorCodes } from './error';
import { withClerkAuth, getUserId } from '@/backend/middleware/auth';

export const registerDashboardRoutes = (app: Hono<AppEnv>) => {
  // 인증 미들웨어 적용
  app.use('/dashboard/*', withClerkAuth());
  app.use('/analyses', withClerkAuth());

  // GET /api/dashboard/summary - 사용자 정보 및 구독 상태
  app.get('/dashboard/summary', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const userId = getUserId(c);
    if (!userId) {
      return respond(c, failure(401, dashboardErrorCodes.unauthorized, '인증이 필요합니다'));
    }

    logger.info('Fetching dashboard summary', { userId });

    const result = await getDashboardSummary(supabase, userId);

    if (!result.ok) {
      logger.error('Failed to fetch dashboard summary', JSON.stringify(result));
    }

    return respond(c, result);
  });

  // GET /api/dashboard/stats - 통계 정보
  app.get('/dashboard/stats', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const userId = getUserId(c);
    if (!userId) {
      return respond(c, failure(401, dashboardErrorCodes.unauthorized, '인증이 필요합니다'));
    }

    logger.info('Fetching dashboard stats', { userId });

    const result = await getDashboardStats(supabase, userId);

    if (!result.ok) {
      logger.error('Failed to fetch dashboard stats', JSON.stringify(result));
    }

    return respond(c, result);
  });

  // GET /api/analyses - 분석 목록
  app.get('/analyses', async (c) => {
    const queryParams = c.req.query();
    const parsedParams = AnalysesListRequestSchema.safeParse(queryParams);

    if (!parsedParams.success) {
      return respond(
        c,
        failure(
          400,
          dashboardErrorCodes.validationError,
          '잘못된 요청 파라미터입니다',
          parsedParams.error.format(),
        ),
      );
    }

    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const userId = getUserId(c);
    if (!userId) {
      return respond(c, failure(401, dashboardErrorCodes.unauthorized, '인증이 필요합니다'));
    }

    logger.info('Fetching analyses list', { userId, params: parsedParams.data });

    const result = await getAnalysesList(supabase, userId, parsedParams.data);

    if (!result.ok) {
      logger.error('Failed to fetch analyses list', JSON.stringify(result));
    }

    return respond(c, result);
  });
};