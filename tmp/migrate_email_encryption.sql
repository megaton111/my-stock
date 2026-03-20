-- 이메일 암호화 마이그레이션
-- Supabase SQL Editor에서 실행하세요

-- 1. email_hash 컬럼 추가 (HMAC-SHA256 해시, 조회용)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_hash VARCHAR(64);

-- 2. email_hash에 유니크 인덱스 생성
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_hash ON users (email_hash);

-- 3. 기존 email 컬럼의 UNIQUE 제약 제거 (암호화된 값은 매번 다르므로)
-- 기존 제약 이름 확인 후 제거 (보통 users_email_key)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- 4. email 컬럼 크기 확장 (암호화된 base64 문자열은 더 길 수 있음)
ALTER TABLE users ALTER COLUMN email TYPE TEXT;
