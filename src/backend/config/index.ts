import { z } from 'zod';
import type { AppConfig } from '@/backend/hono/context';

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  CRON_SECRET_TOKEN: z.string().optional(),
  TOSS_SECRET_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
});

let cachedConfig: AppConfig | null = null;

export const getAppConfig = (): AppConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = envSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CRON_SECRET_TOKEN: process.env.CRON_SECRET_TOKEN,
    TOSS_SECRET_KEY: process.env.TOSS_SECRET_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  });

  if (!parsed.success) {
    const messages = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'config'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid backend configuration: ${messages}`);
  }

  cachedConfig = {
    supabase: {
      url: parsed.data.SUPABASE_URL,
      serviceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
    },
    CRON_SECRET_TOKEN: parsed.data.CRON_SECRET_TOKEN,
    TOSS_SECRET_KEY: parsed.data.TOSS_SECRET_KEY,
    GEMINI_API_KEY: parsed.data.GEMINI_API_KEY,
    CLERK_SECRET_KEY: parsed.data.CLERK_SECRET_KEY,
  } satisfies AppConfig;

  return cachedConfig;
};
