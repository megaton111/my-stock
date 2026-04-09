-- ============================================
-- watchlist 테이블 생성 (관심종목)
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- 1. watchlist 테이블
CREATE TABLE IF NOT EXISTS watchlist (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id),
  ticker     VARCHAR(30) NOT NULL,
  stock_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, ticker)
);

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist(user_id);
