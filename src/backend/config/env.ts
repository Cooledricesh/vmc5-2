import { z } from 'zod';

/**
 * 환경 변수 스키마 정의
 */
const envSchema = z.object({
  // Node 환경
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),

  // Clerk (인증)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string(),
  CLERK_SECRET_KEY: z.string(),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default('/sign-in'),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default('/sign-up'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default('/dashboard'),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default('/dashboard'),

  // Gemini API
  GEMINI_API_KEY: z.string(),

  // TossPayments
  TOSS_SECRET_KEY: z.string(),
  NEXT_PUBLIC_TOSS_CLIENT_KEY: z.string(),

  // App Configuration
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().default('사주풀이 AI'),

  // Optional: Analytics
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_HOTJAR_ID: z.string().optional(),
  NEXT_PUBLIC_HOTJAR_VERSION: z.string().optional(),

  // Optional: Sentry
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),

  // Optional: Monitoring
  NEW_RELIC_LICENSE_KEY: z.string().optional(),
  NEW_RELIC_APP_NAME: z.string().optional(),
});

/**
 * 환경 변수 타입
 */
export type Env = z.infer<typeof envSchema>;

/**
 * 서버 전용 환경 변수 타입
 */
export type ServerEnv = Pick<
  Env,
  | 'NODE_ENV'
  | 'SUPABASE_URL'
  | 'SUPABASE_SERVICE_ROLE_KEY'
  | 'CLERK_SECRET_KEY'
  | 'GEMINI_API_KEY'
  | 'TOSS_SECRET_KEY'
  | 'SENTRY_AUTH_TOKEN'
  | 'SENTRY_ORG'
  | 'SENTRY_PROJECT'
  | 'NEW_RELIC_LICENSE_KEY'
  | 'NEW_RELIC_APP_NAME'
>;

/**
 * 클라이언트 전용 환경 변수 타입
 */
export type ClientEnv = Pick<
  Env,
  | 'NODE_ENV'
  | 'NEXT_PUBLIC_SUPABASE_URL'
  | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  | 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
  | 'NEXT_PUBLIC_CLERK_SIGN_IN_URL'
  | 'NEXT_PUBLIC_CLERK_SIGN_UP_URL'
  | 'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL'
  | 'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL'
  | 'NEXT_PUBLIC_TOSS_CLIENT_KEY'
  | 'NEXT_PUBLIC_APP_URL'
  | 'NEXT_PUBLIC_APP_NAME'
  | 'NEXT_PUBLIC_GA_MEASUREMENT_ID'
  | 'NEXT_PUBLIC_HOTJAR_ID'
  | 'NEXT_PUBLIC_HOTJAR_VERSION'
  | 'NEXT_PUBLIC_SENTRY_DSN'
>;

// 캐시된 환경 변수
let cachedEnv: Env | undefined;

/**
 * 환경 변수 파싱 및 검증
 */
export function parseEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  try {
    cachedEnv = envSchema.parse(process.env);
    return cachedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:', error.flatten().fieldErrors);
      throw new Error('Failed to parse environment variables');
    }
    throw error;
  }
}

/**
 * 서버 환경 변수 가져오기 (서버 컴포넌트에서만 사용)
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error('getServerEnv() called on client side');
  }

  const env = parseEnv();

  return {
    NODE_ENV: env.NODE_ENV,
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    CLERK_SECRET_KEY: env.CLERK_SECRET_KEY,
    GEMINI_API_KEY: env.GEMINI_API_KEY,
    TOSS_SECRET_KEY: env.TOSS_SECRET_KEY,
    SENTRY_AUTH_TOKEN: env.SENTRY_AUTH_TOKEN,
    SENTRY_ORG: env.SENTRY_ORG,
    SENTRY_PROJECT: env.SENTRY_PROJECT,
    NEW_RELIC_LICENSE_KEY: env.NEW_RELIC_LICENSE_KEY,
    NEW_RELIC_APP_NAME: env.NEW_RELIC_APP_NAME,
  };
}

/**
 * 클라이언트 환경 변수 가져오기 (클라이언트 컴포넌트에서 사용)
 */
export function getClientEnv(): ClientEnv {
  // 클라이언트에서는 NEXT_PUBLIC_ 접두사가 있는 환경변수만 접근 가능
  return {
    NODE_ENV: process.env.NODE_ENV as 'development' | 'production' | 'test',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '',
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || '/sign-in',
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || '/sign-up',
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || '/dashboard',
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || '/dashboard',
    NEXT_PUBLIC_TOSS_CLIENT_KEY: process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || '',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || '사주풀이 AI',
    NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
    NEXT_PUBLIC_HOTJAR_ID: process.env.NEXT_PUBLIC_HOTJAR_ID,
    NEXT_PUBLIC_HOTJAR_VERSION: process.env.NEXT_PUBLIC_HOTJAR_VERSION,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  };
}

/**
 * 개발 환경 여부 확인
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * 프로덕션 환경 여부 확인
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * 테스트 환경 여부 확인
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

/**
 * 서버 사이드 여부 확인
 */
export function isServerSide(): boolean {
  return typeof window === 'undefined';
}

/**
 * 클라이언트 사이드 여부 확인
 */
export function isClientSide(): boolean {
  return typeof window !== 'undefined';
}

/**
 * 환경 변수 설정 가이드 출력
 */
export function printEnvGuide(): void {
  console.log(`
📋 Required Environment Variables:
================================

# Supabase Configuration
SUPABASE_URL=                     # Your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=        # Service role key (server-side only)
NEXT_PUBLIC_SUPABASE_URL=          # Public Supabase URL (optional)
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Public anon key (optional)

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY= # Clerk publishable key
CLERK_SECRET_KEY=                  # Clerk secret key (server-side only)

# External APIs
GEMINI_API_KEY=                    # Google Gemini API key
TOSS_SECRET_KEY=                   # TossPayments secret key
NEXT_PUBLIC_TOSS_CLIENT_KEY=       # TossPayments client key

# App Configuration
NEXT_PUBLIC_APP_URL=               # Your app URL (default: http://localhost:3000)
NEXT_PUBLIC_APP_NAME=              # Your app name (default: 사주풀이 AI)

================================
  `);
}