-- ============================================
-- collect_entries 테이블 생성 (dca_entries 복사본)
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- 1. collect_entries 테이블 (주식 모으기 일지)
CREATE TABLE IF NOT EXISTS collect_entries (
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

-- 2. 인덱스
CREATE INDEX IF NOT EXISTS idx_collect_user_ticker ON collect_entries(user_id, ticker);

-- 3. updated_at 자동 갱신 트리거
CREATE TRIGGER collect_entries_updated_at
  BEFORE UPDATE ON collect_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 4. 종목별 요약 함수 (API에서 호출)
CREATE OR REPLACE FUNCTION get_collect_summary(p_user_id INT)
RETURNS TABLE (
  stock_name       VARCHAR,
  ticker           VARCHAR,
  target_quantity  BIGINT,
  current_quantity NUMERIC,
  entry_count      BIGINT
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      ce.stock_name,
      ce.ticker,
      MAX(ce.target_quantity)::BIGINT AS target_quantity,
      SUM(ce.quantity)::NUMERIC AS current_quantity,
      COUNT(*)::BIGINT AS entry_count
    FROM collect_entries ce
    WHERE ce.user_id = p_user_id
    GROUP BY ce.ticker, ce.stock_name
    ORDER BY MIN(ce.id);
END;
$$ LANGUAGE plpgsql;

-- 5. 기존 dca_entries 데이터를 collect_entries로 복사
INSERT INTO collect_entries (id, user_id, stock_name, ticker, target_quantity, purchase_date, amount, quantity, created_at, updated_at)
SELECT id, user_id, stock_name, ticker, target_quantity, purchase_date, amount, quantity, created_at, updated_at
FROM dca_entries;

-- 6. 시퀀스를 기존 데이터의 max id 이후로 설정
SELECT setval('collect_entries_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM collect_entries), 1), 1));
