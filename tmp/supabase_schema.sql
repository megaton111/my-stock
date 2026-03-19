-- ============================================
-- Supabase (PostgreSQL) 스키마
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- 1. users 테이블
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. investments 테이블
CREATE TABLE IF NOT EXISTS investments (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id),
  name       VARCHAR(100) NOT NULL,
  ticker     VARCHAR(20) NOT NULL,
  category   VARCHAR(50) DEFAULT '미국주식',
  quantity   DECIMAL(15,4) NOT NULL,
  avg_price  DECIMAL(15,2) NOT NULL,
  currency   VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. dca_entries 테이블 (적립식 매수 일지)
CREATE TABLE IF NOT EXISTS dca_entries (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(id),
  stock_name      VARCHAR(100) NOT NULL,
  ticker          VARCHAR(20) NOT NULL,
  target_quantity INT NOT NULL DEFAULT 0,
  purchase_date   DATE NOT NULL,
  amount          DECIMAL(15,2) NOT NULL,
  quantity        DECIMAL(15,4) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_dca_user_ticker ON dca_entries(user_id, ticker);
CREATE INDEX IF NOT EXISTS idx_investments_user ON investments(user_id);

-- 4. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dca_entries_updated_at
  BEFORE UPDATE ON dca_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 5. DCA 종목별 요약 함수 (API에서 호출)
CREATE OR REPLACE FUNCTION get_dca_summary(p_user_id INT)
RETURNS TABLE (
  stock_name      VARCHAR,
  ticker          VARCHAR,
  target_quantity BIGINT,
  current_quantity NUMERIC,
  entry_count     BIGINT
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      de.stock_name,
      de.ticker,
      MAX(de.target_quantity)::BIGINT AS target_quantity,
      SUM(de.quantity)::NUMERIC AS current_quantity,
      COUNT(*)::BIGINT AS entry_count
    FROM dca_entries de
    WHERE de.user_id = p_user_id
    GROUP BY de.ticker, de.stock_name
    ORDER BY MIN(de.id);
END;
$$ LANGUAGE plpgsql;

-- 6. RLS (Row Level Security) 비활성화 — service_role_key 사용 시 불필요
-- 필요 시 활성화:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE investments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE dca_entries ENABLE ROW LEVEL SECURITY;
