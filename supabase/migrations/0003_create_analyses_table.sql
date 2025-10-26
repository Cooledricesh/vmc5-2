-- Migration: create analyses table
-- Description: 사주 분석 요청 및 결과를 저장하는 테이블
-- Gemini API를 통한 AI 분석 결과를 JSON 형태로 저장

-- analyses 테이블 생성
CREATE TABLE IF NOT EXISTS public.analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject_name text NOT NULL,
  birth_date date NOT NULL,
  birth_time time,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  ai_model text NOT NULL CHECK (ai_model IN ('gemini-2.0-flash', 'gemini-2.0-pro')),
  analysis_result jsonb,
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 테이블 설명
COMMENT ON TABLE public.analyses IS '사주 분석 요청 및 결과 저장 테이블';
COMMENT ON COLUMN public.analyses.id IS '분석 고유 ID';
COMMENT ON COLUMN public.analyses.user_id IS '사용자 ID (외래 키)';
COMMENT ON COLUMN public.analyses.subject_name IS '분석 대상 이름';
COMMENT ON COLUMN public.analyses.birth_date IS '생년월일';
COMMENT ON COLUMN public.analyses.birth_time IS '출생시간 (선택 사항)';
COMMENT ON COLUMN public.analyses.gender IS '성별: male(남자), female(여자)';
COMMENT ON COLUMN public.analyses.ai_model IS '사용된 AI 모델: gemini-2.0-flash(무료), gemini-2.0-pro(Pro)';
COMMENT ON COLUMN public.analyses.analysis_result IS 'AI 분석 결과 (JSON 형식: 천간지지, 오행, 대운/세운, 종합해석)';
COMMENT ON COLUMN public.analyses.status IS '분석 상태: processing(처리중), completed(완료), failed(실패)';
COMMENT ON COLUMN public.analyses.view_count IS '조회 수';
COMMENT ON COLUMN public.analyses.last_viewed_at IS '마지막 조회 시간';
COMMENT ON COLUMN public.analyses.created_at IS '분석 생성일';
COMMENT ON COLUMN public.analyses.updated_at IS '분석 수정일';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON public.analyses(status);

-- RLS 비활성화
ALTER TABLE public.analyses DISABLE ROW LEVEL SECURITY;
