import type { SupabaseClient } from '@supabase/supabase-js';
import {
  success,
  failure,
  type HandlerResult,
} from '@/backend/http/response';
import { getGeminiClient, getGeminiProClient } from '@/lib/external/gemini-client';
import type {
  NewAnalysisRequest,
  NewAnalysisResponse,
  AnalysisCountResponse,
  AnalysisStatusResponse,
} from './schema';
import {
  newAnalysisErrorCodes,
  type NewAnalysisServiceError,
} from './error';

/**
 * 사용자 분석 횟수 조회
 */
export async function getUserAnalysisCount(
  client: SupabaseClient,
  userId: string,
): Promise<
  HandlerResult<AnalysisCountResponse, NewAnalysisServiceError, unknown>
> {
  const { data, error } = await client
    .from('users')
    .select('subscription_tier, free_analysis_count, monthly_analysis_count')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return failure(500, newAnalysisErrorCodes.databaseError, error.message);
  }

  if (!data) {
    return failure(
      404,
      newAnalysisErrorCodes.unauthorized,
      'User not found',
    );
  }

  const isFree = data.subscription_tier === 'free';
  const remainingCount = isFree
    ? data.free_analysis_count
    : data.monthly_analysis_count;
  const maxCount = isFree ? 3 : 10;

  return success({
    subscription_tier: data.subscription_tier as 'free' | 'pro',
    remaining_count: remainingCount,
    max_count: maxCount,
    is_insufficient: remainingCount === 0,
  });
}

/**
 * 진행 중인 분석 확인
 */
export async function checkDuplicateAnalysis(
  client: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await client
    .from('analyses')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'processing')
    .maybeSingle();

  return data?.id || null;
}

/**
 * 분석 레코드 생성
 */
async function createAnalysisRecord(
  client: SupabaseClient,
  userId: string,
  request: NewAnalysisRequest,
  aiModel: string,
): Promise<HandlerResult<string, NewAnalysisServiceError, unknown>> {
  const { data, error } = await client
    .from('analyses')
    .insert({
      user_id: userId,
      subject_name: request.subject_name,
      birth_date: request.birth_date,
      birth_time: request.birth_time || null,
      gender: request.gender,
      ai_model: aiModel,
      status: 'processing',
    })
    .select('id')
    .single();

  if (error) {
    return failure(500, newAnalysisErrorCodes.databaseError, error.message);
  }

  return success(data.id);
}

/**
 * Gemini API 호출 및 분석 수행
 */
async function requestGeminiAnalysis(
  client: SupabaseClient,
  analysisId: string,
  request: NewAnalysisRequest,
  aiModel: 'gemini-2.0-flash' | 'gemini-2.0-pro',
  apiKey: string,
): Promise<HandlerResult<any, NewAnalysisServiceError, unknown>> {
  try {
    const geminiClient =
      aiModel === 'gemini-2.0-pro'
        ? getGeminiProClient(apiKey)
        : getGeminiClient(apiKey);

    const result = await geminiClient.generateSajuAnalysis({
      subjectName: request.subject_name,
      birthDate: request.birth_date,
      birthTime: request.birth_time || undefined,
      gender: request.gender,
    });

    return success(result);
  } catch (error: any) {
    // 분석 실패 시 status 업데이트
    await client
      .from('analyses')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', analysisId);

    if (error.name === 'GeminiAPIError') {
      if (error.statusCode === 408) {
        return failure(
          408,
          newAnalysisErrorCodes.analysisTimeout,
          error.message || '분석 요청 시간이 초과되었습니다',
        );
      }
      return failure(
        500,
        newAnalysisErrorCodes.geminiApiError,
        error.message || 'AI 분석 중 오류가 발생했습니다',
      );
    }

    return failure(
      500,
      newAnalysisErrorCodes.geminiApiError,
      '분석 처리 중 오류가 발생했습니다',
    );
  }
}

/**
 * 분석 결과 저장
 */
async function updateAnalysisResult(
  client: SupabaseClient,
  analysisId: string,
  result: any,
): Promise<HandlerResult<void, NewAnalysisServiceError, unknown>> {
  const { error } = await client
    .from('analyses')
    .update({
      analysis_result: result,
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', analysisId);

  if (error) {
    return failure(500, newAnalysisErrorCodes.databaseError, error.message);
  }

  return success(undefined);
}

/**
 * 분석 횟수 차감
 */
async function decrementAnalysisCount(
  client: SupabaseClient,
  userId: string,
  subscriptionTier: 'free' | 'pro',
): Promise<HandlerResult<number, NewAnalysisServiceError, unknown>> {
  const column =
    subscriptionTier === 'free'
      ? 'free_analysis_count'
      : 'monthly_analysis_count';

  const { data, error } = await client
    .from('users')
    .select(column)
    .eq('id', userId)
    .single();

  if (error || !data) {
    return failure(500, newAnalysisErrorCodes.databaseError, error?.message || 'User not found');
  }

  const currentCount = data[column];
  const newCount = Math.max(0, currentCount - 1);

  const { error: updateError } = await client
    .from('users')
    .update({ [column]: newCount })
    .eq('id', userId);

  if (updateError) {
    return failure(
      500,
      newAnalysisErrorCodes.databaseError,
      updateError.message,
    );
  }

  return success(newCount);
}

/**
 * 분석 횟수 복구 (실패 시)
 */
export async function refundAnalysisCount(
  client: SupabaseClient,
  userId: string,
  subscriptionTier: 'free' | 'pro',
): Promise<void> {
  const column =
    subscriptionTier === 'free'
      ? 'free_analysis_count'
      : 'monthly_analysis_count';

  const { data } = await client
    .from('users')
    .select(column)
    .eq('id', userId)
    .single();

  if (data) {
    const currentCount = data[column];
    const maxCount = subscriptionTier === 'free' ? 3 : 10;
    const newCount = Math.min(currentCount + 1, maxCount);

    await client
      .from('users')
      .update({ [column]: newCount })
      .eq('id', userId);
  }
}

/**
 * 통합 함수: 새 분석 생성
 */
export async function createNewAnalysis(
  client: SupabaseClient,
  userId: string,
  subscriptionTier: 'free' | 'pro',
  request: NewAnalysisRequest,
  apiKey: string,
): Promise<
  HandlerResult<NewAnalysisResponse, NewAnalysisServiceError, unknown>
> {
  // 1. 횟수 확인
  const countResult = await getUserAnalysisCount(client, userId);
  if (!countResult.ok) return countResult;

  if (countResult.data.is_insufficient) {
    return failure(
      400,
      newAnalysisErrorCodes.insufficientAnalysisCount,
      '분석 가능 횟수가 부족합니다',
    );
  }

  // 2. 중복 분석 확인
  const duplicateId = await checkDuplicateAnalysis(client, userId);
  if (duplicateId) {
    return failure(
      409,
      newAnalysisErrorCodes.analysisInProgress,
      '이미 진행 중인 분석이 있습니다',
      { existing_analysis_id: duplicateId },
    );
  }

  // 3. AI 모델 선택
  const aiModel =
    subscriptionTier === 'free' ? 'gemini-2.0-flash' : 'gemini-2.0-pro';

  // 4. 분석 레코드 생성
  const recordResult = await createAnalysisRecord(
    client,
    userId,
    request,
    aiModel,
  );
  if (!recordResult.ok) return recordResult as any;

  const analysisId = recordResult.data;

  // 5. 횟수 차감 (먼저 차감)
  const decrementResult = await decrementAnalysisCount(
    client,
    userId,
    subscriptionTier,
  );
  if (!decrementResult.ok) {
    // 차감 실패 시 레코드 삭제
    await client.from('analyses').delete().eq('id', analysisId);
    return decrementResult as any;
  }

  // 6. Gemini API 호출
  const analysisResult = await requestGeminiAnalysis(
    client,
    analysisId,
    request,
    aiModel,
    apiKey,
  );

  if (!analysisResult.ok) {
    // 실패 시 횟수 복구
    await refundAnalysisCount(client, userId, subscriptionTier);
    return analysisResult as any;
  }

  // 7. 결과 저장
  const updateResult = await updateAnalysisResult(
    client,
    analysisId,
    analysisResult.data,
  );

  if (!updateResult.ok) {
    // 저장 실패 시 횟수 복구
    await refundAnalysisCount(client, userId, subscriptionTier);
    return updateResult as any;
  }

  return success({
    analysis_id: analysisId,
    status: 'completed',
    remaining_count: decrementResult.data,
  });
}

/**
 * 분석 상태 조회 (폴링용)
 */
export async function getAnalysisStatus(
  client: SupabaseClient,
  analysisId: string,
  userId: string,
): Promise<
  HandlerResult<AnalysisStatusResponse, NewAnalysisServiceError, unknown>
> {
  const { data, error } = await client
    .from('analyses')
    .select('id, status, analysis_result, created_at, updated_at')
    .eq('id', analysisId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    return failure(500, newAnalysisErrorCodes.databaseError, error.message);
  }

  if (!data) {
    return failure(
      404,
      newAnalysisErrorCodes.analysisNotFound,
      '분석을 찾을 수 없습니다',
    );
  }

  return success({
    id: data.id,
    status: data.status as 'processing' | 'completed' | 'failed',
    analysis_result: data.analysis_result,
    created_at: data.created_at,
    updated_at: data.updated_at,
  });
}
