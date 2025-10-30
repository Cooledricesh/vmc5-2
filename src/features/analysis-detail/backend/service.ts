import type { SupabaseClient } from '@supabase/supabase-js';
import { success, failure, type HandlerResult } from '@/backend/http/response';
import { getUserIdByClerkId } from '@/backend/utils/user-helper';
import type { AnalysisDetailResponse } from './schema';
import { analysisDetailErrorCodes, type AnalysisDetailServiceError } from './error';

/**
 * 분석 조회 및 조회수 증가
 * @param userId - Clerk User ID (e.g., "user_34k7JqEd8il5046H7aeiCZ1qA9G")
 */
export async function getAnalysisById(
  client: SupabaseClient,
  analysisId: string,
  userId: string
): Promise<HandlerResult<AnalysisDetailResponse, AnalysisDetailServiceError, unknown>> {
  // Clerk ID로 내부 UUID 조회
  const userIdResult = await getUserIdByClerkId(client, userId, analysisDetailErrorCodes.analysisNotFound);
  if (!userIdResult.ok) return userIdResult as any;
  const internalUserId = userIdResult.data;

  // 권한 확인 및 조회
  const { data, error } = await client
    .from('analyses')
    .select('*')
    .eq('id', analysisId)
    .maybeSingle();

  if (error) {
    return failure(500, analysisDetailErrorCodes.databaseError, error.message);
  }

  if (!data) {
    return failure(404, analysisDetailErrorCodes.analysisNotFound, '분석 결과를 찾을 수 없습니다');
  }

  // 내부 UUID로 권한 확인
  if (data.user_id !== internalUserId) {
    return failure(403, analysisDetailErrorCodes.forbidden, '이 분석 결과에 접근할 권한이 없습니다');
  }

  // 조회수 증가
  const newViewCount = data.view_count + 1;
  const { error: updateError } = await client
    .from('analyses')
    .update({
      view_count: newViewCount,
      last_viewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', analysisId);

  if (updateError) {
    console.error('Failed to increment view count:', updateError);
    // 조회수 업데이트 실패는 에러로 처리하지 않음
  }

  return success({
    id: data.id,
    subject_name: data.subject_name,
    birth_date: data.birth_date,
    birth_time: data.birth_time,
    gender: data.gender,
    ai_model: data.ai_model,
    analysis_result: data.analysis_result,
    status: data.status,
    view_count: newViewCount,
    created_at: data.created_at,
    last_viewed_at: data.last_viewed_at || new Date().toISOString(),
  });
}

/**
 * 분석 삭제
 * @param userId - Clerk User ID (e.g., "user_34k7JqEd8il5046H7aeiCZ1qA9G")
 */
export async function deleteAnalysis(
  client: SupabaseClient,
  analysisId: string,
  userId: string
): Promise<HandlerResult<void, AnalysisDetailServiceError, unknown>> {
  // Clerk ID로 내부 UUID 조회
  const userIdResult = await getUserIdByClerkId(client, userId, analysisDetailErrorCodes.analysisNotFound);
  if (!userIdResult.ok) return userIdResult as any;
  const internalUserId = userIdResult.data;

  // 권한 확인
  const { data } = await client
    .from('analyses')
    .select('user_id')
    .eq('id', analysisId)
    .maybeSingle();

  if (!data) {
    return failure(404, analysisDetailErrorCodes.analysisNotFound, '분석 결과를 찾을 수 없습니다');
  }

  // 내부 UUID로 권한 확인
  if (data.user_id !== internalUserId) {
    return failure(403, analysisDetailErrorCodes.forbidden, '이 분석을 삭제할 권한이 없습니다');
  }

  // 삭제
  const { error } = await client.from('analyses').delete().eq('id', analysisId);

  if (error) {
    return failure(500, analysisDetailErrorCodes.databaseError, error.message);
  }

  return success(undefined);
}
