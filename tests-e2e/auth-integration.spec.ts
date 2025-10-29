import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 설정 (테스트용)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

test.describe('Clerk-Supabase Integration', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  test('새 사용자 회원가입 시 Supabase DB에 자동 저장', async ({ page }) => {
    // 1. 회원가입 페이지로 이동
    await page.goto('/sign-up');
    await page.waitForLoadState('networkidle');

    // 2. Clerk 회원가입 폼 작성
    await page.fill('input[name="emailAddress"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');

    // 3. 회원가입 제출
    await page.click('button[type="submit"]');

    // 4. 이메일 인증 코드 입력 (테스트 환경에서는 모킹 필요)
    // 실제 테스트에서는 Clerk 테스트 모드 또는 환경 변수 설정 필요
    await page.waitForSelector('input[name="code"]', { timeout: 10000 });
    await page.fill('input[name="code"]', '424242'); // Clerk 테스트 모드 기본 코드

    // 5. 대시보드로 리다이렉트 확인
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');

    // 6. Supabase DB에서 사용자 확인
    await page.waitForTimeout(2000); // 웹훅 처리 대기

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', testEmail)
      .single();

    // 테스트 예상 결과: 사용자가 DB에 저장되어야 함
    expect(error).toBeNull();
    expect(user).toBeDefined();
    expect(user?.email).toBe(testEmail);
    expect(user?.clerk_user_id).toBeDefined();
    expect(user?.subscription_tier).toBe('free');
    expect(user?.free_analysis_count).toBe(3);
  });

  test('기존 사용자 로그인 후 대시보드 접근 가능', async ({ page }) => {
    // 1. 로그인 페이지로 이동
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');

    // 2. 로그인 정보 입력
    await page.fill('input[name="identifier"]', testEmail);
    await page.fill('input[name="password"]', testPassword);

    // 3. 로그인 제출
    await page.click('button[type="submit"]');

    // 4. 대시보드로 리다이렉트 확인
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');

    // 5. 401 에러 없이 페이지 로드 확인
    const response = await page.reload();
    expect(response?.status()).not.toBe(401);

    // 6. 대시보드 콘텐츠 확인
    await expect(page.locator('h1')).toContainText(/dashboard/i);
  });

  test('웹훅 중복 호출 시 중복 생성 방지', async ({ page }) => {
    // 웹훅 엔드포인트 직접 호출 테스트
    const webhookPayload = {
      type: 'user.created',
      data: {
        id: 'user_test_duplicate',
        email_addresses: [
          { email_address: 'duplicate@example.com' }
        ],
        first_name: 'Duplicate',
        last_name: 'Test'
      }
    };

    // 웹훅 엔드포인트 호출 (첫 번째)
    const response1 = await page.request.post('/api/webhooks/clerk', {
      data: webhookPayload,
      headers: {
        'svix-id': 'msg_test_1',
        'svix-timestamp': String(Date.now()),
        'svix-signature': 'test_signature' // 실제로는 검증 필요
      }
    });

    expect(response1.status()).toBe(200);

    // 웹훅 엔드포인트 호출 (중복)
    const response2 = await page.request.post('/api/webhooks/clerk', {
      data: webhookPayload,
      headers: {
        'svix-id': 'msg_test_2',
        'svix-timestamp': String(Date.now()),
        'svix-signature': 'test_signature'
      }
    });

    expect(response2.status()).toBe(200);

    // DB에서 중복 확인
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_user_id', 'user_test_duplicate');

    // 중복 생성되지 않고 1개만 존재해야 함
    expect(users?.length).toBe(1);
  });

  test('DB 연결 실패 시 재시도 로직 동작', async ({ page }) => {
    // 이 테스트는 DB 연결을 임의로 끊고 테스트해야 하므로
    // 실제로는 단위 테스트에서 모킹으로 처리하는 것이 적절
    test.skip();
  });
});

test.describe('Edge Cases', () => {
  test('이메일 없는 소셜 로그인 사용자 처리', async ({ page }) => {
    // Google/GitHub OAuth 등으로 이메일 없이 가입하는 경우
    const webhookPayload = {
      type: 'user.created',
      data: {
        id: 'user_oauth_no_email',
        email_addresses: [],
        first_name: 'OAuth',
        last_name: 'User',
        username: 'oauthuser123'
      }
    };

    const response = await page.request.post('/api/webhooks/clerk', {
      data: webhookPayload,
      headers: {
        'svix-id': 'msg_oauth_test',
        'svix-timestamp': String(Date.now()),
        'svix-signature': 'test_signature'
      }
    });

    expect(response.status()).toBe(200);

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_user_id', 'user_oauth_no_email')
      .single();

    // 이메일 대신 username이나 clerk_user_id로 저장
    expect(user).toBeDefined();
    expect(user?.email).toBeNull();
    expect(user?.clerk_user_id).toBe('user_oauth_no_email');
  });

  test('유효하지 않은 웹훅 시그니처 거부', async ({ page }) => {
    const response = await page.request.post('/api/webhooks/clerk', {
      data: { type: 'user.created', data: {} },
      headers: {
        'svix-id': 'invalid',
        'svix-timestamp': String(Date.now()),
        'svix-signature': 'invalid_signature'
      }
    });

    // 유효하지 않은 시그니처는 400 또는 401 반환
    expect([400, 401]).toContain(response.status());
  });
});