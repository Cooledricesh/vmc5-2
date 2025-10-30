-- Configure Cron Job settings in app_settings table
-- 이 파일은 Supabase Dashboard의 SQL Editor에서 실행하세요

-- 1. Cron Secret Token 설정
INSERT INTO app_settings (key, value, description)
VALUES (
  'cron_secret_token',
  '1Y6hBNak+jiaC6C7xA/kqrOvqy3YFM8wx1D3LokHTo0=',
  'Cron Job 인증용 비밀 토큰'
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;

-- 2. Cron API URL 설정
-- ⚠️ 주의: 아래 URL을 실제 배포된 도메인으로 변경하세요
-- 로컬 테스트: http://localhost:3000/api/cron/process-payments
-- 프로덕션: https://your-domain.vercel.app/api/cron/process-payments
INSERT INTO app_settings (key, value, description)
VALUES (
  'cron_api_url',
  'http://localhost:3000/api/cron/process-payments',
  'Cron Job이 호출할 API URL (배포 시 프로덕션 URL로 변경 필요)'
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;

-- 3. 설정 확인
SELECT * FROM app_settings WHERE key IN ('cron_secret_token', 'cron_api_url');
