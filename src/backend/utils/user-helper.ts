import type { SupabaseClient } from '@supabase/supabase-js';
import { success, failure, type HandlerResult } from '@/backend/http/response';

/**
 * Clerk User ID로 내부 UUID 조회 헬퍼
 * @param client - Supabase 클라이언트
 * @param clerkUserId - Clerk User ID
 * @param errorCode - 에러 코드 (feature별로 다름)
 * @returns 내부 UUID 또는 에러
 */
export async function getUserIdByClerkId<TError extends string>(
  client: SupabaseClient,
  clerkUserId: string,
  errorCode: TError,
): Promise<HandlerResult<string, TError, unknown>> {
  const { data, error } = await client
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (error) {
    return failure(500, errorCode, error.message);
  }

  if (!data) {
    return failure(404, errorCode, 'User not found');
  }

  return success(data.id);
}
