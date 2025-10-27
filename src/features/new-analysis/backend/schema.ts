import { z } from 'zod';

/**
 * 새 분석 요청 스키마
 */
export const NewAnalysisRequestSchema = z.object({
  subject_name: z
    .string()
    .min(2, '성함은 2자 이상 입력해주세요')
    .max(50, '성함은 50자 이하로 입력해주세요'),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)')
    .refine(
      (date) => {
        const d = new Date(date);
        const now = new Date();
        const minDate = new Date('1900-01-01');
        return d >= minDate && d <= now;
      },
      '1900년 이후 ~ 오늘 날짜만 입력 가능합니다',
    ),
  birth_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, '올바른 시간 형식이 아닙니다 (HH:mm)')
    .optional()
    .nullable(),
  gender: z.enum(['male', 'female'], {
    errorMap: () => ({ message: '성별을 선택해주세요' }),
  }),
});

/**
 * 분석 횟수 조회 응답 스키마
 */
export const AnalysisCountResponseSchema = z.object({
  subscription_tier: z.enum(['free', 'pro']),
  remaining_count: z.number(),
  max_count: z.number(),
  is_insufficient: z.boolean(),
});

/**
 * 새 분석 생성 응답 스키마
 */
export const NewAnalysisResponseSchema = z.object({
  analysis_id: z.string().uuid(),
  status: z.enum(['processing', 'completed', 'failed']),
  remaining_count: z.number(),
});

/**
 * 분석 상태 조회 응답 스키마
 */
export const AnalysisStatusResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['processing', 'completed', 'failed']),
  analysis_result: z.any().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/**
 * DB Row 스키마 (analyses 테이블)
 */
export const AnalysisRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  subject_name: z.string(),
  birth_date: z.string(),
  birth_time: z.string().nullable(),
  gender: z.string(),
  ai_model: z.string(),
  analysis_result: z.any().nullable(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Type exports
export type NewAnalysisRequest = z.infer<typeof NewAnalysisRequestSchema>;
export type AnalysisCountResponse = z.infer<
  typeof AnalysisCountResponseSchema
>;
export type NewAnalysisResponse = z.infer<typeof NewAnalysisResponseSchema>;
export type AnalysisStatusResponse = z.infer<
  typeof AnalysisStatusResponseSchema
>;
export type AnalysisRow = z.infer<typeof AnalysisRowSchema>;
