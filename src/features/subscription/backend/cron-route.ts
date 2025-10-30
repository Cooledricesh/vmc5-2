/**
 * Cron Job 전용 라우트
 * UC-007: 정기결제 자동 처리
 *
 * Supabase Cron Job에서 호출되는 엔드포인트
 */

import type { Hono } from 'hono';
import { respond, success, failure } from '@/backend/http/response';
import { getSupabase, getLogger, getConfig, type AppEnv } from '@/backend/hono/context';
import { getTossPaymentsClient } from '@/lib/external/tosspayments-client';
import {
  getPaymentTargetsService,
  processRecurringPaymentService,
  handlePaymentSuccessService,
  handlePaymentFailureService,
  suspendSubscriptionService,
  type PaymentTarget,
} from './recurring-payment.service';
import { subscriptionErrorCodes } from './error';

/**
 * Cron Job 인증 미들웨어
 * Authorization 헤더의 Bearer 토큰을 검증
 */
function withCronAuth() {
  return async (c: any, next: any) => {
    const logger = getLogger(c);
    const config = getConfig(c);

    // CRON_SECRET_TOKEN 확인
    const cronSecret = config.CRON_SECRET_TOKEN;
    if (!cronSecret) {
      logger.error('CRON_SECRET_TOKEN is not configured');
      return respond(c, failure(500, 'CONFIGURATION_ERROR', 'Cron secret token is not configured'));
    }

    // Authorization 헤더 검증
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      logger.warn('Missing Authorization header for cron job');
      return respond(c, failure(401, 'UNAUTHORIZED', 'Authorization header is required'));
    }

    const token = authHeader.replace('Bearer ', '');
    if (token !== cronSecret) {
      logger.warn('Invalid cron secret token');
      return respond(c, failure(401, 'UNAUTHORIZED', 'Invalid authorization token'));
    }

    await next();
  };
}

/**
 * Cron Job 라우트 등록
 */
export function registerCronRoutes(app: Hono<AppEnv>) {
  // Cron Job 인증 미들웨어 적용
  app.use('/cron/*', withCronAuth());

  /**
   * POST /api/cron/process-payments
   * 정기결제 배치 처리 (Cron Job 전용)
   *
   * Request Body:
   * {
   *   "force": false,      // 재시도 카운트 무시하고 모든 active 구독 처리
   *   "user_ids": []       // 선택사항: 특정 사용자만 처리 (테스트용)
   * }
   *
   * Response:
   * {
   *   "success": true,
   *   "data": {
   *     "processed_count": 15,
   *     "success_count": 13,
   *     "failed_count": 2,
   *     "suspended_count": 0,
   *     "total_amount": 128700,
   *     "processing_time_ms": 45230,
   *     "details": [...]
   *   }
   * }
   */
  app.post('/cron/process-payments', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);
    const tossClient = getTossPaymentsClient();

    const startTime = Date.now();
    logger.info('Starting recurring payment batch process');

    // 1. Cron Job 로그 시작 기록
    const { data: logData, error: logError } = await supabase
      .from('cron_job_logs')
      .insert({
        job_name: 'process-recurring-payments',
        execution_time: new Date().toISOString(),
        status: 'started',
      })
      .select('id')
      .single();

    if (logError) {
      logger.error('Failed to create cron job log', { error: logError });
    }

    const cronLogId = logData?.id;

    try {
      // 2. 결제 대상 조회
      const targetsResult = await getPaymentTargetsService(supabase);

      if (!targetsResult.ok) {
        logger.error('Failed to fetch payment targets', { error: targetsResult });

        // 로그 업데이트
        if (cronLogId) {
          await supabase
            .from('cron_job_logs')
            .update({
              status: 'failed',
              error_message: 'Failed to fetch payment targets',
              processing_time_ms: Date.now() - startTime,
            })
            .eq('id', cronLogId);
        }

        return respond(c, targetsResult);
      }

      const targets = targetsResult.data;
      logger.info(`Found ${targets.length} payment targets`);

      // 결제 대상이 없으면 조기 종료
      if (targets.length === 0) {
        logger.info('No payment targets found');

        // 로그 업데이트
        if (cronLogId) {
          await supabase
            .from('cron_job_logs')
            .update({
              status: 'completed',
              processed_count: 0,
              success_count: 0,
              failed_count: 0,
              suspended_count: 0,
              total_amount: 0,
              processing_time_ms: Date.now() - startTime,
            })
            .eq('id', cronLogId);
        }

        return respond(
          c,
          success({
            processed_count: 0,
            success_count: 0,
            failed_count: 0,
            suspended_count: 0,
            total_amount: 0,
            processing_time_ms: Date.now() - startTime,
            details: [],
          }),
        );
      }

      // 3. 배치 처리 (각 구독자 순차 처리)
      const results: any[] = [];
      let successCount = 0;
      let failedCount = 0;
      let suspendedCount = 0;
      let totalAmount = 0;

      for (const target of targets) {
        logger.info(`Processing payment for user ${target.user_id}`);

        // 3초 대기 (Rate Limiting)
        if (results.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        // 자동 결제 처리
        const paymentResult = await processRecurringPaymentService(
          supabase,
          tossClient,
          {
            subscription_id: target.subscription_id,
            user_id: target.user_id,
            billing_key: target.billing_key,
            price: target.price,
            retry_count: target.retry_count,
          },
          {
            clerk_user_id: target.clerk_user_id,
            email: target.email,
            name: target.name,
          },
        );

        if (paymentResult.ok && paymentResult.data.status === 'success') {
          // 결제 성공 처리
          await handlePaymentSuccessService(supabase, {
            user_id: target.user_id,
            subscription_id: target.subscription_id,
            order_id: paymentResult.data.payment_key || 'unknown',
            payment_key: paymentResult.data.payment_key || '',
            amount: target.price,
            approved_at: new Date().toISOString(),
          });

          successCount++;
          totalAmount += target.price;

          results.push({
            user_id: target.user_id,
            subscription_id: target.subscription_id,
            status: 'success',
            payment_key: paymentResult.data.payment_key,
            amount: target.price,
          });

          logger.info(`Payment succeeded for user ${target.user_id}`);
        } else {
          // 결제 실패 처리
          const errorCode = !paymentResult.ok && 'errorCode' in paymentResult ? (paymentResult.errorCode as string) : 'UNKNOWN_ERROR';
          const errorMessage = !paymentResult.ok && 'message' in paymentResult ? (paymentResult.message as string) : 'Payment failed';

          const failureResult = await handlePaymentFailureService(supabase, {
            user_id: target.user_id,
            subscription_id: target.subscription_id,
            order_id: `SUBSCRIPTION_${new Date().toISOString().split('T')[0].replace(/-/g, '')}_${target.user_id}`,
            amount: target.price,
            error_code: errorCode,
            error_message: errorMessage,
            current_retry_count: target.retry_count,
          });

          failedCount++;

          results.push({
            user_id: target.user_id,
            subscription_id: target.subscription_id,
            status: 'failed',
            error_code: errorCode,
            retry_count: failureResult.ok ? failureResult.data.retry_count : target.retry_count + 1,
          });

          logger.warn(`Payment failed for user ${target.user_id}`, {
            error_code: errorCode,
            retry_count: target.retry_count,
          });

          // 3회 실패 시 구독 정지
          if (failureResult.ok && failureResult.data.should_suspend) {
            await suspendSubscriptionService(
              supabase,
              tossClient,
              target.subscription_id,
              target.user_id,
              target.billing_key,
            );

            suspendedCount++;
            logger.info(`Subscription suspended for user ${target.user_id} after 3 failed attempts`);
          }
        }
      }

      const processingTime = Date.now() - startTime;

      // 4. Cron Job 로그 완료 기록
      if (cronLogId) {
        await supabase
          .from('cron_job_logs')
          .update({
            status: 'completed',
            processed_count: targets.length,
            success_count: successCount,
            failed_count: failedCount,
            suspended_count: suspendedCount,
            total_amount: totalAmount,
            processing_time_ms: processingTime,
          })
          .eq('id', cronLogId);
      }

      logger.info('Recurring payment batch process completed', {
        processed: targets.length,
        success: successCount,
        failed: failedCount,
        suspended: suspendedCount,
        total_amount: totalAmount,
        processing_time_ms: processingTime,
      });

      // 5. 성공 응답
      return respond(
        c,
        success({
          processed_count: targets.length,
          success_count: successCount,
          failed_count: failedCount,
          suspended_count: suspendedCount,
          total_amount: totalAmount,
          processing_time_ms: processingTime,
          details: results,
        }),
      );
    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      logger.error('Recurring payment batch process failed', { error: error.message });

      // 로그 업데이트
      if (cronLogId) {
        await supabase
          .from('cron_job_logs')
          .update({
            status: 'failed',
            error_message: error.message || 'Unknown error',
            processing_time_ms: processingTime,
          })
          .eq('id', cronLogId);
      }

      return respond(c, failure(500, subscriptionErrorCodes.internalError, 'Batch process failed: ' + error.message));
    }
  });

  /**
   * GET /api/cron/payment-status
   * 오늘의 결제 대상 조회 (모니터링 용도)
   *
   * Query Parameters:
   * - date: 조회할 날짜 (YYYY-MM-DD, 기본값: 오늘)
   */
  app.get('/cron/payment-status', async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const targetsResult = await getPaymentTargetsService(supabase);

    if (!targetsResult.ok) {
      logger.error('Failed to fetch payment status', { error: targetsResult });
      return respond(c, targetsResult);
    }

    const targets = targetsResult.data;
    const today = new Date().toISOString().split('T')[0];

    return respond(
      c,
      success({
        target_date: today,
        total_count: targets.length,
        targets: targets.map((t) => ({
          user_id: t.user_id,
          subscription_id: t.subscription_id,
          user_name: t.name,
          user_email: t.email,
          amount: t.price,
          retry_count: t.retry_count,
          status: 'pending',
        })),
      }),
    );
  });
}
