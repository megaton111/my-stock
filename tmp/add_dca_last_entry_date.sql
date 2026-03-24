-- get_dca_summary RPC에 last_entry_date 컬럼 추가
-- Supabase SQL Editor에서 실행

DROP FUNCTION IF EXISTS get_dca_summary(INT);

CREATE OR REPLACE FUNCTION get_dca_summary(p_user_id INT)
RETURNS TABLE(
  stock_name VARCHAR,
  ticker VARCHAR,
  target_quantity INT,
  current_quantity NUMERIC,
  entry_count BIGINT,
  schedule_type VARCHAR,
  schedule_value INT,
  schedule_quantity NUMERIC,
  last_entry_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.stock_name,
    de.ticker,
    MAX(de.target_quantity)::INT,
    SUM(de.quantity),
    COUNT(*)::BIGINT,
    MAX(de.schedule_type),
    MAX(de.schedule_value),
    MAX(de.schedule_quantity),
    MAX(de.purchase_date)
  FROM dca_entries de
  WHERE de.user_id = p_user_id
  GROUP BY de.ticker, de.stock_name
  ORDER BY MIN(de.id);
END;
$$ LANGUAGE plpgsql;
