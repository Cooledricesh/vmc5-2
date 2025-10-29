import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthConfig, getSupabaseUrl } from '@/features/auth/backend/config';
import { UserSyncService } from '@/features/auth/backend/user-sync.service';
import { retryWithBackoff } from '@/features/auth/backend/retry-helper';

// Supabase 서버 클라이언트 생성 (Service Role 키 사용)
const getSupabaseClient = () => {
  const config = getAuthConfig();
  const supabaseUrl = getSupabaseUrl();

  return createClient(supabaseUrl, config.SUPABASE_SERVICE_ROLE_KEY);
};

export async function POST(req: Request) {
  // 환경 변수 검증
  let config;
  try {
    config = getAuthConfig();
  } catch (error) {
    console.error('환경 변수 설정 오류:', error);
    return new Response('Internal Server Error', { status: 500 });
  }

  // 헤더 가져오기
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    });
  }

  // 요청 본문 가져오기
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Svix Webhook 인스턴스 생성
  const wh = new Webhook(config.CLERK_WEBHOOK_SIGNING_SECRET);

  let evt: WebhookEvent;

  try {
    // 서명 검증
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Webhook 검증 실패:', err);
    return new Response('Error occured', {
      status: 400,
    });
  }

  // 이벤트 타입 확인
  const eventType = evt.type;
  console.log(`Clerk 웹훅 이벤트 수신: ${eventType}`);

  try {
    const supabase = getSupabaseClient();
    const syncService = new UserSyncService(supabase);

    switch (eventType) {
      case 'user.created': {
        // 새 사용자 생성 처리
        const { id, email_addresses, first_name, last_name, image_url, username } = evt.data;

        const userData = {
          clerkUserId: id,
          email: email_addresses?.[0]?.email_address || null,
          name: [first_name, last_name].filter(Boolean).join(' ') || username || null,
          profileImage: image_url || null,
        };

        console.log('새 사용자 생성 중:', { clerk_user_id: id });

        // 재시도 로직과 함께 사용자 생성
        try {
          const result = await retryWithBackoff(
            () => syncService.upsertUser(userData),
            { maxAttempts: 3, delay: 1000, backoffMultiplier: 2 }
          );

          if (result.success) {
            console.log('Supabase 사용자 생성 성공:', id);
          } else {
            console.error('Supabase 사용자 생성 실패:', result.error);
          }
        } catch (retryError) {
          console.error('재시도 후에도 실패:', retryError);
          // 하지만 Clerk에는 성공 응답 반환 (재시도 방지)
        }
        break;
      }

      case 'user.updated': {
        // 사용자 정보 업데이트 처리
        const { id, email_addresses, first_name, last_name, image_url, username } = evt.data;

        const userData = {
          clerkUserId: id,
          email: email_addresses?.[0]?.email_address || null,
          name: [first_name, last_name].filter(Boolean).join(' ') || username || null,
          profileImage: image_url || null,
        };

        console.log('사용자 정보 업데이트 중:', { clerk_user_id: id });

        try {
          const result = await retryWithBackoff(
            () => syncService.createOrUpdateUser(userData),
            { maxAttempts: 3, delay: 1000, backoffMultiplier: 2 }
          );

          if (result.success) {
            console.log('Supabase 사용자 업데이트 성공:', id);
          } else {
            console.error('Supabase 사용자 업데이트 실패:', result.error);
          }
        } catch (retryError) {
          console.error('업데이트 재시도 실패:', retryError);
        }
        break;
      }

      case 'user.deleted': {
        // 사용자 삭제 처리
        const { id } = evt.data;

        console.log('사용자 삭제 중:', id);

        try {
          // 하드 삭제 사용
          const result = await retryWithBackoff(
            () => syncService.deleteUser(id),
            { maxAttempts: 2, delay: 500 }
          );

          if (result.success) {
            console.log('Supabase 사용자 삭제 성공:', id);
          } else {
            console.error('Supabase 사용자 삭제 실패:', result.error);
          }
        } catch (retryError) {
          console.error('삭제 재시도 실패:', retryError);
        }
        break;
      }

      default:
        console.log(`처리되지 않은 이벤트 타입: ${eventType}`);
    }
  } catch (error) {
    console.error('웹훅 처리 중 오류:', error);
    // 하지만 Clerk에는 성공 응답 반환 (재시도 방지)
  }

  // 항상 200 OK 반환 (Clerk가 재전송하지 않도록)
  return new Response('OK', { status: 200 });
}