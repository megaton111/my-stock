-- 매매일지 테이블 생성 SQL
-- Supabase SQL Editor에서 실행해주세요

-- 1. 매매일지 (종목 단위)
CREATE TABLE trading_journals (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_type TEXT NOT NULL CHECK (market_type IN ('US', 'KOSPI', 'KOSDAQ')),
  stock_name TEXT NOT NULL,
  ticker TEXT NOT NULL,
  broker TEXT NOT NULL DEFAULT '',
  buy_reason TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT '',
  expected_investment NUMERIC NOT NULL DEFAULT 0,
  memo TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 매매 거래 기록 (매수/매도)
CREATE TABLE trading_journal_transactions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  journal_id BIGINT NOT NULL REFERENCES trading_journals(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  price NUMERIC NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL DEFAULT 0,
  trade_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_trading_journals_user ON trading_journals(user_id);
CREATE INDEX idx_trading_journal_tx_journal ON trading_journal_transactions(journal_id);
CREATE INDEX idx_trading_journal_tx_user ON trading_journal_transactions(user_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE trading_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_journal_transactions ENABLE ROW LEVEL SECURITY;

-- service_role은 모든 접근 허용
CREATE POLICY "Service role full access" ON trading_journals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON trading_journal_transactions FOR ALL USING (true) WITH CHECK (true);

-- 3. investments 테이블에 journal_id 컬럼 추가 (매매일지 연결)
-- 이미 trading_journals 테이블을 생성한 후 실행해주세요
ALTER TABLE investments ADD COLUMN journal_id BIGINT REFERENCES trading_journals(id) ON DELETE SET NULL;

-- 4. 목표 매도가 / 손절가 컬럼 추가
ALTER TABLE trading_journals ADD COLUMN target_sell_price NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE trading_journals ADD COLUMN stop_loss_price NUMERIC NOT NULL DEFAULT 0;
