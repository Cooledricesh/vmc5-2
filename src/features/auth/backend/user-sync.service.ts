import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserSyncData {
  clerkUserId: string;
  email: string | null;
  name: string | null;
  profileImage: string | null;
}

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Clerk와 Supabase 사용자 데이터를 동기화하는 서비스
 */
export class UserSyncService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * 사용자를 생성하거나 업데이트 (upsert)
   */
  async upsertUser(userData: UserSyncData): Promise<ServiceResult> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .upsert(
          {
            clerk_user_id: userData.clerkUserId,
            email: userData.email,
            name: userData.name,
            profile_image: userData.profileImage,
            subscription_tier: 'free',
            free_analysis_count: 3,
            monthly_analysis_count: 0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'clerk_user_id' }
        );

      if (error) {
        console.error('Upsert user error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Unexpected upsert error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 사용자를 생성하거나 업데이트 (조회 후 처리)
   */
  async createOrUpdateUser(userData: UserSyncData): Promise<ServiceResult> {
    try {
      // 먼저 사용자 존재 여부 확인
      const { data: existingUser, error: selectError } = await this.supabase
        .from('users')
        .select('*')
        .eq('clerk_user_id', userData.clerkUserId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        // PGRST116: 사용자를 찾을 수 없음 (정상)
        console.error('Select user error:', selectError);
        return { success: false, error: selectError.message };
      }

      if (existingUser) {
        // 사용자가 존재하면 업데이트
        const { data, error } = await this.supabase
          .from('users')
          .update({
            email: userData.email,
            name: userData.name,
            profile_image: userData.profileImage,
            updated_at: new Date().toISOString(),
          })
          .eq('clerk_user_id', userData.clerkUserId);

        if (error) {
          console.error('Update user error:', error);
          return { success: false, error: error.message };
        }

        return { success: true, data };
      } else {
        // 사용자가 없으면 생성
        const { data, error } = await this.supabase
          .from('users')
          .insert({
            clerk_user_id: userData.clerkUserId,
            email: userData.email,
            name: userData.name,
            profile_image: userData.profileImage,
            subscription_tier: 'free',
            free_analysis_count: 3,
            monthly_analysis_count: 0,
          });

        if (error) {
          console.error('Insert user error:', error);
          return { success: false, error: error.message };
        }

        return { success: true, data };
      }
    } catch (error) {
      console.error('Unexpected createOrUpdate error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clerk ID로 사용자 조회
   */
  async getUserByClerkId(clerkUserId: string): Promise<ServiceResult> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Get user error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Unexpected get user error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 사용자 삭제
   */
  async deleteUser(clerkUserId: string): Promise<ServiceResult> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .delete()
        .eq('clerk_user_id', clerkUserId);

      if (error) {
        console.error('Delete user error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Unexpected delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 사용자 소프트 삭제
   */
  async softDeleteUser(clerkUserId: string): Promise<ServiceResult> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('clerk_user_id', clerkUserId);

      if (error) {
        console.error('Soft delete user error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Unexpected soft delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}