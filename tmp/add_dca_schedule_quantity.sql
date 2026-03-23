-- dca_entries에 스케줄 매수수량 컬럼 추가
ALTER TABLE dca_entries
  ADD COLUMN IF NOT EXISTS schedule_quantity DECIMAL(15,4) DEFAULT NULL;

-- 반환 타입 변경이므로 기존 함수 삭제 후 재생성
DROP FUNCTION IF EXISTS get_dca_summary(INT);

CREATE OR REPLACE FUNCTION get_dca_summary(p_user_id INT)
RETURNS TABLE (
  stock_name        VARCHAR,
  ticker            VARCHAR,
  target_quantity   BIGINT,
  current_quantity  NUMERIC,
  entry_count       BIGINT,
  schedule_type     VARCHAR,
  schedule_value    INT,
  schedule_quantity NUMERIC
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      de.stock_name,
      de.ticker,
      MAX(de.target_quantity)::BIGINT AS target_quantity,
      SUM(de.quantity)::NUMERIC AS current_quantity,
      COUNT(*)::BIGINT AS entry_count,
      MAX(de.schedule_type)::VARCHAR AS schedule_type,
      MAX(de.schedule_value)::INT AS schedule_value,
      MAX(de.schedule_quantity)::NUMERIC AS schedule_quantity
    FROM dca_entries de
    WHERE de.user_id = p_user_id
    GROUP BY de.ticker, de.stock_name
    ORDER BY MIN(de.id);
END;
$$ LANGUAGE plpgsql;
