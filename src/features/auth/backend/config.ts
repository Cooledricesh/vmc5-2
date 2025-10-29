import { z } from 'zod';

// 환경 변수 스키마 정의
const envSchema = z.object({
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().min(1),
  SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

// 환경 변수 검증 및 캐싱
let cachedConfig: z.infer<typeof envSchema> | null = null;

export function getAuthConfig() {
  // 테스트 환경에서는 캐싱 안함
  if (cachedConfig && process.env.NODE_ENV !== 'test') return cachedConfig;

  const config = {
    CLERK_WEBHOOK_SIGNING_SECRET: process.env.CLERK_WEBHOOK_SIGNING_SECRET,
    SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  try {
    cachedConfig = envSchema.parse(config);
    return cachedConfig;
  } catch (error) {
    console.error('환경 변수 검증 실패:', error);
    throw new Error('필수 환경 변수가 설정되지 않았습니다');
  }
}

// Supabase URL 우선순위 처리
export function getSupabaseUrl(): string {
  const config = getAuthConfig();
  return config.SUPABASE_URL || config.NEXT_PUBLIC_SUPABASE_URL;
}