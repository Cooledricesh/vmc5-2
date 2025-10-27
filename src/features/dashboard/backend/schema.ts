import { z } from 'zod';

// 요청 스키마
export const AnalysesListRequestSchema = z.object({
  period: z.enum(['all', '7days', '30days', '90days']).default('all'),
  sort: z.enum(['latest', 'oldest']).default('latest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// 응답 스키마
export const DashboardSummaryResponseSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    subscription_tier: z.enum(['free', 'pro']),
  }),
  subscription: z.object({
    status: z.enum(['active', 'pending_cancellation', 'suspended']).nullable(),
    next_payment_date: z.string().nullable(),
    card_last_4digits: z.string().nullable(),
    remaining_count: z.number(),
  }),
});

export const DashboardStatsResponseSchema = z.object({
  total_count: z.number(),
  monthly_count: z.number(),
  this_week_count: z.number(),
});

export const AnalysisItemSchema = z.object({
  id: z.string().uuid(),
  subject_name: z.string(),
  birth_date: z.string(),
  gender: z.enum(['male', 'female']),
  ai_model: z.string(),
  status: z.enum(['processing', 'completed', 'failed']),
  created_at: z.string(),
  view_count: z.number(),
});

export const PaginationSchema = z.object({
  current_page: z.number(),
  total_pages: z.number(),
  total_count: z.number(),
  per_page: z.number(),
});

export const AnalysesListResponseSchema = z.object({
  analyses: z.array(AnalysisItemSchema),
  pagination: PaginationSchema,
});

// 타입 추출
export type AnalysesListRequest = z.infer<typeof AnalysesListRequestSchema>;
export type DashboardSummaryResponse = z.infer<typeof DashboardSummaryResponseSchema>;
export type DashboardStatsResponse = z.infer<typeof DashboardStatsResponseSchema>;
export type AnalysisItem = z.infer<typeof AnalysisItemSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type AnalysesListResponse = z.infer<typeof AnalysesListResponseSchema>;
