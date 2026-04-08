-- ============================================
-- 매도/실현손익 기능: 거래 단위 기록 테이블 추가
-- Supabase SQL Editor에서 순서대로 실행하세요
-- ============================================
-- 작성일: 2026-04-08
-- 목적:
--  1) positions: 종목 보유 사이클 (매수→전량매도가 한 사이클)
--  2) buy_transactions: 매수 거래 (행 단위)
--  3) sell_transactions: 매도 거래 (실현손익 스냅샷 포함)
--  4) investments.position_id 컬럼 추가 + 기존 데이터 마이그레이션
-- ============================================

-- ============================================
-- 1. positions 테이블 (보유 사이클)
-- ============================================
CREATE TABLE IF NOT EXISTS positions (
  id                    SERIAL PRIMARY KEY,
  user_id               INT NOT NULL REFERENCES users(id),
  ticker                VARCHAR(20) NOT NULL,
  stock_name            VARCHAR(100) NOT NULL,
  category              VARCHAR(50) NOT NULL DEFAULT '미국주식',
  currency              VARCHAR(3) NOT NULL,
  broker                VARCHAR(50),
  opened_at             DATE NOT NULL,              -- 첫 매수일
  closed_at             DATE,                        -- 전량매도일 (NULL = 활성)
  total_realized_pl_krw DECIMAL(15,2),              -- closed 시 캐시
  created_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_positions_user_status ON positions(user_id, closed_at);
CREATE INDEX IF NOT EXISTS idx_positions_user_ticker ON positions(user_id, ticker);

-- ============================================
-- 2. buy_transactions 테이블 (매수 거래)
-- ============================================
CREATE TABLE IF NOT EXISTS buy_transactions (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id),
  position_id   INT NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  ticker        VARCHAR(20) NOT NULL,
  stock_name    VARCHAR(100) NOT NULL,
  category      VARCHAR(50) NOT NULL,
  currency      VARCHAR(3) NOT NULL,
  broker        VARCHAR(50),
  buy_date      DATE NOT NULL,
  buy_quantity  DECIMAL(15,4) NOT NULL,
  buy_price     DECIMAL(15,2) NOT NULL,
  exchange_rate DECIMAL(15,2),                      -- 매수 시점 환율 (과거 데이터는 NULL 허용)
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buy_tx_position ON buy_transactions(position_id);
CREATE INDEX IF NOT EXISTS idx_buy_tx_user_ticker ON buy_transactions(user_id, ticker);

-- ============================================
-- 3. sell_transactions 테이블 (매도 거래)
-- ============================================
CREATE TABLE IF NOT EXISTS sell_transactions (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(id),
  position_id     INT NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  ticker          VARCHAR(20) NOT NULL,
  stock_name      VARCHAR(100) NOT NULL,
  category        VARCHAR(50) NOT NULL,
  currency        VARCHAR(3) NOT NULL,
  sell_date       DATE NOT NULL,
  sell_quantity   DECIMAL(15,4) NOT NULL,
  sell_price      DECIMAL(15,2) NOT NULL,
  avg_buy_price   DECIMAL(15,2) NOT NULL,           -- 매도 시점 평균매입가 스냅샷
  exchange_rate   DECIMAL(15,2) NOT NULL,           -- 매도 시점 환율 스냅샷 (KRW는 1)
  realized_pl     DECIMAL(15,2) NOT NULL,           -- 원본 통화 기준 실현손익
  realized_pl_krw DECIMAL(15,2) NOT NULL,           -- KRW 환산 실현손익
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sell_tx_position ON sell_transactions(position_id);
CREATE INDEX IF NOT EXISTS idx_sell_tx_user_date ON sell_transactions(user_id, sell_date);

-- ============================================
-- 4. investments 테이블에 position_id 컬럼 추가
-- ============================================
ALTER TABLE investments
  ADD COLUMN IF NOT EXISTS position_id INT REFERENCES positions(id);

CREATE INDEX IF NOT EXISTS idx_investments_position ON investments(position_id);

-- ============================================
-- 5. 기존 investments 데이터 마이그레이션
--    각 investments 1행 → positions 1행 + buy_transactions 1행
--    buy_date = investments.created_at 날짜
-- ============================================
DO $$
DECLARE
  inv RECORD;
  new_position_id INT;
BEGIN
  FOR inv IN
    SELECT * FROM investments WHERE position_id IS NULL ORDER BY id
  LOOP
    -- position 생성
    INSERT INTO positions (
      user_id, ticker, stock_name, category, currency, broker, opened_at
    )
    VALUES (
      inv.user_id, inv.ticker, inv.name, inv.category, inv.currency, inv.broker,
      DATE(inv.created_at)
    )
    RETURNING id INTO new_position_id;

    -- buy_transaction 생성 (과거 환율은 알 수 없으므로 NULL)
    INSERT INTO buy_transactions (
      user_id, position_id, ticker, stock_name, category, currency, broker,
      buy_date, buy_quantity, buy_price, exchange_rate
    )
    VALUES (
      inv.user_id, new_position_id, inv.ticker, inv.name, inv.category, inv.currency, inv.broker,
      DATE(inv.created_at), inv.quantity, inv.avg_price, NULL
    );

    -- investments 행과 연결
    UPDATE investments SET position_id = new_position_id WHERE id = inv.id;
  END LOOP;
END $$;

-- ============================================
-- 6. 검증 쿼리 — 하나씩 실행해서 결과 확인
-- ============================================

-- 검증 1: position_id가 모두 채워졌는지 (결과: 0 이어야 함)
SELECT COUNT(*) AS unmigrated_count FROM investments WHERE position_id IS NULL;

-- 검증 2: investments 집계가 buy_transactions와 일치하는지
--         (결과: 불일치 행만 반환 — 0행이어야 함)
SELECT
  i.id,
  i.ticker,
  i.quantity       AS inv_quantity,
  SUM(b.buy_quantity) AS bt_quantity,
  i.avg_price      AS inv_avg_price,
  ROUND(SUM(b.buy_quantity * b.buy_price) / NULLIF(SUM(b.buy_quantity), 0), 2) AS bt_avg_price
FROM investments i
LEFT JOIN buy_transactions b ON b.position_id = i.position_id
GROUP BY i.id, i.ticker, i.quantity, i.avg_price
HAVING
  SUM(b.buy_quantity) <> i.quantity
  OR ABS(SUM(b.buy_quantity * b.buy_price) / NULLIF(SUM(b.buy_quantity), 0) - i.avg_price) > 0.01;

-- 검증 3: 생성된 테이블 행 수 확인
SELECT 'positions' AS table_name, COUNT(*) FROM positions
UNION ALL SELECT 'buy_transactions', COUNT(*) FROM buy_transactions
UNION ALL SELECT 'sell_transactions', COUNT(*) FROM sell_transactions
UNION ALL SELECT 'investments (w/ position_id)', COUNT(*) FROM investments WHERE position_id IS NOT NULL;
