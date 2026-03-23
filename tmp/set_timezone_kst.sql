-- ============================================
-- 데이터베이스 timezone을 한국 시간(KST)으로 설정
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- 데이터베이스 기본 timezone을 Asia/Seoul로 변경
ALTER DATABASE postgres SET timezone TO 'Asia/Seoul';

-- 현재 세션에도 즉시 적용
SET timezone = 'Asia/Seoul';

-- 적용 확인 (한국 시간으로 표시되어야 함)
SELECT now();
