import { z } from 'zod';

// 천간지지 스키마
export const HeavenlyStemsSchema = z.object({
  year: z.string(),
  month: z.string(),
  day: z.string(),
  hour: z.string().optional(),
});

// 오행 스키마
export const FiveElementsSchema = z.object({
  wood_score: z.number(),
  fire_score: z.number(),
  earth_score: z.number(),
  metal_score: z.number(),
  water_score: z.number(),
});

// 운세 흐름 스키마
export const FortuneFlowSchema = z.object({
  major_fortune: z.string(),
  yearly_fortune: z.string(),
});

// 종합 해석 스키마
export const InterpretationSchema = z.object({
  personality: z.string(),
  wealth: z.string(),
  health: z.string(),
  love: z.string(),
});

// 분석 결과 스키마
export const AnalysisResultSchema = z.object({
  heavenly_stems: HeavenlyStemsSchema,
  five_elements: FiveElementsSchema,
  fortune_flow: FortuneFlowSchema,
  interpretation: InterpretationSchema,
});

// 분석 상세 응답 스키마
export const AnalysisDetailResponseSchema = z.object({
  id: z.string().uuid(),
  subject_name: z.string(),
  birth_date: z.string(),
  birth_time: z.string().nullable(),
  gender: z.enum(['male', 'female']),
  ai_model: z.string(),
  analysis_result: AnalysisResultSchema.nullable(),
  status: z.enum(['processing', 'completed', 'failed']),
  view_count: z.number(),
  created_at: z.string(),
  last_viewed_at: z.string().nullable(),
});

// 재분석 요청 스키마
export const ReanalyzeRequestSchema = z.object({
  original_analysis_id: z.string().uuid(),
  subject_name: z.string(),
  birth_date: z.string(),
  birth_time: z.string().nullable(),
  gender: z.enum(['male', 'female']),
});

// 재분석 응답 스키마
export const ReanalyzeResponseSchema = z.object({
  new_analysis_id: z.string().uuid(),
  status: z.enum(['processing', 'completed']),
  remaining_count: z.number(),
});

// 타입 추출
export type AnalysisDetailResponse = z.infer<typeof AnalysisDetailResponseSchema>;
export type ReanalyzeRequest = z.infer<typeof ReanalyzeRequestSchema>;
export type ReanalyzeResponse = z.infer<typeof ReanalyzeResponseSchema>;
export type HeavenlyStems = z.infer<typeof HeavenlyStemsSchema>;
export type FiveElements = z.infer<typeof FiveElementsSchema>;
export type FortuneFlow = z.infer<typeof FortuneFlowSchema>;
export type Interpretation = z.infer<typeof InterpretationSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
