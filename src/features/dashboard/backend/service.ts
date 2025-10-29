import type { SupabaseClient } from '@supabase/supabase-js';
import { success, failure, type HandlerResult } from '@/backend/http/response';
import type {
  DashboardSummaryResponse,
  DashboardStatsResponse,
  AnalysesListRequest,
  AnalysesListResponse,
} from './schema';
import { dashboardErrorCodes, type DashboardServiceError } from './error';

/**
 * Clerk User ID로 내부 UUID 조회 헬퍼
 * @param client - Supabase 클라이언트
 * @param clerkUserId - Clerk User ID
 * @returns 내부 UUID 또는 에러
 */
async function getUserIdByClerkId(
  client: SupabaseClient,
  clerkUserId: string,
): Promise<HandlerResult<string, DashboardServiceError, unknown>> {
  const { data, error } = await client
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (error) {
    return failure(500, dashboardErrorCodes.databaseError, error.message);
  }

  if (!data) {
    return failure(404, dashboardErrorCodes.userNotFound, '사용자를 찾을 수 없습니다');
  }

  return success(data.id);
}

/**
 * 사용자 정보 및 구독 상태 조회
 * @param userId - Clerk User ID (e.g., "user_34k7JqEd8il5046H7aeiCZ1qA9G")
 */
export async function getDashboardSummary(
  client: SupabaseClient,
  userId: string,
): Promise<HandlerResult<DashboardSummaryResponse, DashboardServiceError, unknown>> {
  const { data, error } = await client
    .from('users')
    .select(`
      id,
      clerk_user_id,
      name,
      email,
      subscription_tier,
      free_analysis_count,
      monthly_analysis_count,
      subscriptions (
        subscription_status,
        next_payment_date,
        card_last_4digits
      )
    `)
    .eq('clerk_user_id', userId)
    .maybeSingle();

  if (error) {
    return failure(500, dashboardErrorCodes.databaseError, error.message);
  }

  if (!data) {
    return failure(404, dashboardErrorCodes.userNotFound, '사용자를 찾을 수 없습니다');
  }

  const subscription = Array.isArray(data.subscriptions) ? data.subscriptions[0] : data.subscriptions;
  const isFree = data.subscription_tier === 'free';
  const remainingCount = isFree ? data.free_analysis_count : data.monthly_analysis_count;

  return success({
    user: {
      id: data.id,
      name: data.name,
      email: data.email,
      subscription_tier: data.subscription_tier,
    },
    subscription: {
      status: subscription?.subscription_status || null,
      next_payment_date: subscription?.next_payment_date || null,
      card_last_4digits: subscription?.card_last_4digits || null,
      remaining_count: remainingCount,
    },
  });
}

/**
 * 통계 정보 조회
 * @param clerkUserId - Clerk User ID (e.g., "user_34k7JqEd8il5046H7aeiCZ1qA9G")
 */
export async function getDashboardStats(
  client: SupabaseClient,
  clerkUserId: string,
): Promise<HandlerResult<DashboardStatsResponse, DashboardServiceError, unknown>> {
  // 1. Clerk ID로 내부 UUID 조회
  const userIdResult = await getUserIdByClerkId(client, clerkUserId);
  if (!userIdResult.ok) {
    return userIdResult as HandlerResult<DashboardStatsResponse, DashboardServiceError, unknown>;
  }
  const internalUserId = userIdResult.data;

  // 총 분석 횟수
  const { count: totalCount, error: totalError } = await client
    .from('analyses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', internalUserId);

  if (totalError) {
    return failure(500, dashboardErrorCodes.databaseError, totalError.message);
  }

  // 이번 달 분석 횟수
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const { count: monthlyCount, error: monthlyError } = await client
    .from('analyses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', internalUserId)
    .gte('created_at', startOfMonth.toISOString());

  if (monthlyError) {
    return failure(500, dashboardErrorCodes.databaseError, monthlyError.message);
  }

  // 이번 주 분석 횟수
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const { count: weeklyCount, error: weeklyError } = await client
    .from('analyses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', internalUserId)
    .gte('created_at', startOfWeek.toISOString());

  if (weeklyError) {
    return failure(500, dashboardErrorCodes.databaseError, weeklyError.message);
  }

  return success({
    total_count: totalCount || 0,
    monthly_count: monthlyCount || 0,
    this_week_count: weeklyCount || 0,
  });
}

/**
 * 분석 목록 조회
 * @param clerkUserId - Clerk User ID (e.g., "user_34k7JqEd8il5046H7aeiCZ1qA9G")
 */
export async function getAnalysesList(
  client: SupabaseClient,
  clerkUserId: string,
  params: AnalysesListRequest,
): Promise<HandlerResult<AnalysesListResponse, DashboardServiceError, unknown>> {
  // 1. Clerk ID로 내부 UUID 조회
  const userIdResult = await getUserIdByClerkId(client, clerkUserId);
  if (!userIdResult.ok) {
    return userIdResult as HandlerResult<AnalysesListResponse, DashboardServiceError, unknown>;
  }
  const internalUserId = userIdResult.data;
  const { period, sort, page, limit } = params;

  // 기간 필터 계산
  let createdAtFilter: Date | null = null;
  if (period === '7days') {
    createdAtFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === '30days') {
    createdAtFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  } else if (period === '90days') {
    createdAtFilter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  }

  // 전체 개수 조회
  let countQuery = client
    .from('analyses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', internalUserId);

  if (createdAtFilter) {
    countQuery = countQuery.gte('created_at', createdAtFilter.toISOString());
  }

  const { count: totalCount, error: countError } = await countQuery;

  if (countError) {
    return failure(500, dashboardErrorCodes.databaseError, countError.message);
  }

  // 목록 조회
  let listQuery = client
    .from('analyses')
    .select('id, subject_name, birth_date, gender, ai_model, status, created_at, view_count')
    .eq('user_id', internalUserId);

  if (createdAtFilter) {
    listQuery = listQuery.gte('created_at', createdAtFilter.toISOString());
  }

  listQuery = listQuery.order('created_at', { ascending: sort === 'oldest' });
  listQuery = listQuery.range((page - 1) * limit, page * limit - 1);

  const { data, error } = await listQuery;

  if (error) {
    return failure(500, dashboardErrorCodes.databaseError, error.message);
  }

  const totalPages = Math.ceil((totalCount || 0) / limit);

  return success({
    analyses: data || [],
    pagination: {
      current_page: page,
      total_pages: totalPages,
      total_count: totalCount || 0,
      per_page: limit,
    },
  });
}
