import type { Hono } from 'hono';
import { respond, failure } from '@/backend/http/response';
import { getSupabase, getLogger, type AppEnv } from '@/backend/hono/context';
import { getServerEnv } from '@/backend/config/env';
import { getTossPaymentsClient } from '@/lib/external/tosspayments-client';
import {
  BillingKeyRequestSchema,
  CancellationRequestSchema,
  ReactivationRequestSchema,
  ChangeCardRequestSchema,
} from './schema';
import {
  getSubscriptionByUserId,
  createSubscriptionWithPayment,
  cancelSubscriptionService,
  reactivateSubscriptionService,
  changePaymentCardService,
  getPaymentHistoryService,
} from './service';
import { subscriptionErrorCodes } from './error';
import { withClerkAuth, getUserId, getUserEmail } from '@/backend/middleware/auth';

/**
 * 구독 관련 라우트 등록
 */
export function registerSubscriptionRoutes(app: Hono<AppEnv>) {
  // 인증 미들웨어 적용
  app.use('/subscription/*', withClerkAuth());

  /**
   * GET /api/subscription
   * 현재 사용자의 구독 정보 조회
   */
  app.get('/subscription', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const userId = getUserId(c);
    if (!userId) {
      return respond(c, failure(401, subscriptionErrorCodes.unauthorized, '인증이 필요합니다'));
    }

    const result = await getSubscriptionByUserId(supabase, userId);

    if (!result.ok) {
      logger.error('Failed to fetch subscription', { error: JSON.stringify(result) });
    }

    return respond(c, result);
  });

  /**
   * POST /api/subscription/billing-key
   * 빌링키 발급 및 초회 결제
   */
  app.post('/subscription/billing-key', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const userId = getUserId(c);
    if (!userId) {
      return respond(c, failure(401, subscriptionErrorCodes.unauthorized, '인증이 필요합니다'));
    }

    // 사용자 정보 조회
    const { data: user, error } = await supabase
      .from('users')
      .select('clerk_user_id, email, name')
      .eq('id', userId)
      .single();

    if (error || !user) {
      logger.error('Failed to fetch user info', error);
      return respond(
        c,
        failure(
          500,
          subscriptionErrorCodes.databaseError,
          '사용자 정보를 조회할 수 없습니다'
        )
      );
    }

    const clerkUserId = user.clerk_user_id;
    const userEmail = user.email;
    const userName = user.name || 'User';

    // 요청 바디 검증
    let body;
    try {
      body = await c.req.json();
    } catch {
      return respond(c, failure(400, subscriptionErrorCodes.validationError, '요청 형식이 올바르지 않습니다'));
    }

    const parsedBody = BillingKeyRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      logger.warn('Invalid request body', { errors: parsedBody.error.format() });
      return respond(
        c,
        failure(400, subscriptionErrorCodes.validationError, '요청 데이터가 올바르지 않습니다', parsedBody.error.format()),
      );
    }

    const env = getServerEnv();
    const tossClient = getTossPaymentsClient(env.TOSS_SECRET_KEY);

    const result = await createSubscriptionWithPayment(
      supabase,
      tossClient,
      userId,
      clerkUserId,
      parsedBody.data.authKey,
      userEmail,
      userName,
    );

    if (!result.ok) {
      logger.error('Failed to create subscription', { error: JSON.stringify(result) });
    } else {
      logger.info('Subscription created successfully', { subscriptionId: result.data.subscription_id });
    }

    return respond(c, result);
  });

  /**
   * DELETE /api/subscription/cancel
   * 구독 해지
   */
  app.delete('/subscription/cancel', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const userId = getUserId(c);
    if (!userId) {
      return respond(c, failure(401, subscriptionErrorCodes.unauthorized, '인증이 필요합니다'));
    }

    // 요청 바디 검증
    let body;
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }

    const parsedBody = CancellationRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      logger.warn('Invalid request body', { errors: parsedBody.error.format() });
      return respond(c, failure(400, subscriptionErrorCodes.validationError, '요청 데이터가 올바르지 않습니다'));
    }

    const env = getServerEnv();
    const tossClient = getTossPaymentsClient(env.TOSS_SECRET_KEY);

    const result = await cancelSubscriptionService(
      supabase,
      tossClient,
      userId,
      parsedBody.data.cancellation_reason,
      parsedBody.data.feedback,
    );

    if (!result.ok) {
      logger.error('Failed to cancel subscription', { error: JSON.stringify(result) });
    } else {
      logger.info('Subscription cancelled successfully', { userId });
    }

    return respond(c, result);
  });

  /**
   * POST /api/subscription/reactivate
   * 구독 재활성화
   */
  app.post('/subscription/reactivate', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const userId = getUserId(c);
    if (!userId) {
      return respond(c, failure(401, subscriptionErrorCodes.unauthorized, '인증이 필요합니다'));
    }

    // 사용자 정보 조회
    const { data: user, error } = await supabase
      .from('users')
      .select('clerk_user_id, email, name')
      .eq('id', userId)
      .single();

    if (error || !user) {
      logger.error('Failed to fetch user info', error);
      return respond(
        c,
        failure(
          500,
          subscriptionErrorCodes.databaseError,
          '사용자 정보를 조회할 수 없습니다'
        )
      );
    }

    const clerkUserId = user.clerk_user_id;
    const userEmail = user.email;
    const userName = user.name || 'User';

    // 요청 바디 검증
    let body;
    try {
      body = await c.req.json();
    } catch {
      return respond(c, failure(400, subscriptionErrorCodes.validationError, '요청 형식이 올바르지 않습니다'));
    }

    const parsedBody = ReactivationRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      logger.warn('Invalid request body', { errors: parsedBody.error.format() });
      return respond(c, failure(400, subscriptionErrorCodes.validationError, '요청 데이터가 올바르지 않습니다'));
    }

    const env = getServerEnv();
    const tossClient = getTossPaymentsClient(env.TOSS_SECRET_KEY);

    const result = await reactivateSubscriptionService(
      supabase,
      tossClient,
      userId,
      clerkUserId,
      parsedBody.data.option,
      parsedBody.data.authKey,
      userEmail,
      userName,
    );

    if (!result.ok) {
      logger.error('Failed to reactivate subscription', { error: JSON.stringify(result) });
    } else {
      logger.info('Subscription reactivated successfully', { userId });
    }

    return respond(c, result);
  });

  /**
   * POST /api/subscription/change-card
   * 결제 카드 변경
   */
  app.post('/subscription/change-card', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const userId = getUserId(c);
    if (!userId) {
      return respond(c, failure(401, subscriptionErrorCodes.unauthorized, '인증이 필요합니다'));
    }

    // 사용자 정보 조회
    const { data: user, error } = await supabase
      .from('users')
      .select('clerk_user_id, email, name')
      .eq('id', userId)
      .single();

    if (error || !user) {
      logger.error('Failed to fetch user info', error);
      return respond(
        c,
        failure(
          500,
          subscriptionErrorCodes.databaseError,
          '사용자 정보를 조회할 수 없습니다'
        )
      );
    }

    const clerkUserId = user.clerk_user_id;
    const userEmail = user.email;
    const userName = user.name || 'User';

    // 요청 바디 검증
    let body;
    try {
      body = await c.req.json();
    } catch {
      return respond(c, failure(400, subscriptionErrorCodes.validationError, '요청 형식이 올바르지 않습니다'));
    }

    const parsedBody = ChangeCardRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      logger.warn('Invalid request body', { errors: parsedBody.error.format() });
      return respond(c, failure(400, subscriptionErrorCodes.validationError, '요청 데이터가 올바르지 않습니다'));
    }

    const env = getServerEnv();
    const tossClient = getTossPaymentsClient(env.TOSS_SECRET_KEY);

    const result = await changePaymentCardService(
      supabase,
      tossClient,
      userId,
      clerkUserId,
      parsedBody.data.authKey,
      userEmail,
      userName,
    );

    if (!result.ok) {
      logger.error('Failed to change payment card', { error: JSON.stringify(result) });
    } else {
      logger.info('Payment card changed successfully', { userId });
    }

    return respond(c, result);
  });

  /**
   * GET /api/subscription/payments
   * 결제 내역 조회
   */
  app.get('/subscription/payments', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const userId = getUserId(c);
    if (!userId) {
      return respond(c, failure(401, subscriptionErrorCodes.unauthorized, '인증이 필요합니다'));
    }

    // 쿼리 파라미터
    const limit = parseInt(c.req.query('limit') || '20', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    const result = await getPaymentHistoryService(supabase, userId, limit, offset);

    if (!result.ok) {
      logger.error('Failed to fetch payment history', { error: JSON.stringify(result) });
    }

    return respond(c, result);
  });
}
