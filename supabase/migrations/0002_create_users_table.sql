-- Migration: create users table
-- Description: 사용자 기본 정보 및 구독 상태를 관리하는 테이블
-- Clerk OAuth로 인증된 사용자 정보를 저장하고 분석 횟수를 추적

-- pgcrypto extension 확인 (gen_random_uuid 사용)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- users 테이블 생성
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text UNIQUE NOT NULL,
  email text NOT NULL,
  name text,
  profile_image text,
  subscription_tier text NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
  free_analysis_count integer NOT NULL DEFAULT 3,
  monthly_analysis_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 테이블 설명
COMMENT ON TABLE public.users IS '사용자 기본 정보 및 구독 상태 관리 테이블';
COMMENT ON COLUMN public.users.id IS '내부 사용자 고유 ID';
COMMENT ON COLUMN public.users.clerk_user_id IS 'Clerk에서 발급한 사용자 고유 ID';
COMMENT ON COLUMN public.users.email IS '사용자 이메일 (Clerk OAuth에서 수신)';
COMMENT ON COLUMN public.users.name IS '사용자 이름';
COMMENT ON COLUMN public.users.profile_image IS '프로필 이미지 URL';
COMMENT ON COLUMN public.users.subscription_tier IS '구독 등급: free(무료), pro(프리미엄)';
COMMENT ON COLUMN public.users.free_analysis_count IS '무료 분석 잔여 횟수 (가입 시 3회 부여)';
COMMENT ON COLUMN public.users.monthly_analysis_count IS 'Pro 월간 분석 잔여 횟수 (Pro 구독 시 10회)';
COMMENT ON COLUMN public.users.created_at IS '계정 생성일';
COMMENT ON COLUMN public.users.updated_at IS '정보 수정일';

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON public.users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON public.users(subscription_tier);

-- RLS 비활성화 (service-role 키로 직접 접근)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
