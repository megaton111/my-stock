-- dca_entries에 투자 스케줄 컬럼 추가
-- schedule_type: 'weekly' (매주) 또는 'monthly' (매달)
-- schedule_value: weekly일 때 1~7 (월~일), monthly일 때 1~31 (날짜)

ALTER TABLE dca_entries
  ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(10) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS schedule_value INT DEFAULT NULL;

-- 반환 타입이 변경되므로 기존 함수를 먼저 삭제
DROP FUNCTION IF EXISTS get_dca_summary(INT);

-- get_dca_summary 함수에 스케줄 정보 포함하도록 재정의
CREATE OR REPLACE FUNCTION get_dca_summary(p_user_id INT)
RETURNS TABLE (
  stock_name      VARCHAR,
  ticker          VARCHAR,
  target_quantity BIGINT,
  current_quantity NUMERIC,
  entry_count     BIGINT,
  schedule_type   VARCHAR,
  schedule_value  INT
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
      MAX(de.schedule_value)::INT AS schedule_value
    FROM dca_entries de
    WHERE de.user_id = p_user_id
    GROUP BY de.ticker, de.stock_name
    ORDER BY MIN(de.id);
END;
$$ LANGUAGE plpgsql;
