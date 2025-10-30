import { Hono } from 'hono';
import { errorBoundary } from '@/backend/middleware/error';
import { withAppContext } from '@/backend/middleware/context';
import { withSupabase } from '@/backend/middleware/supabase';
import { clerkAuthMiddleware } from '@/backend/middleware/clerk-auth';
import { registerExampleRoutes } from '@/features/example/backend/route';
import { registerNewAnalysisRoutes } from '@/features/new-analysis/backend/route';
import { registerAnalysisDetailRoutes } from '@/features/analysis-detail/backend/route';
import { registerSubscriptionRoutes } from '@/features/subscription/backend/route';
import { registerCronRoutes } from '@/features/subscription/backend/cron-route';
import { registerDashboardRoutes } from '@/features/dashboard/backend/route';
import type { AppEnv } from '@/backend/hono/context';

let singletonApp: Hono<AppEnv> | null = null;

export const createHonoApp = () => {
  if (singletonApp) {
    return singletonApp;
  }

  const app = new Hono<AppEnv>();

  app.use('*', errorBoundary());
  app.use('*', withAppContext());
  app.use('*', withSupabase());

  // Cron Job 라우트 등록 (Clerk 인증 제외)
  registerCronRoutes(app);

  // ✅ Clerk 인증 미들웨어 등록
  // 모든 API 경로에 대해 인증 필수 (Cron Job 제외)
  app.use('*', clerkAuthMiddleware);

  registerExampleRoutes(app);
  registerNewAnalysisRoutes(app);
  registerAnalysisDetailRoutes(app);
  registerSubscriptionRoutes(app);
  registerDashboardRoutes(app);

  singletonApp = app;

  return app;
};
