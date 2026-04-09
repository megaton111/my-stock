-- ============================================
-- krx_stocks 테이블 생성 (KRX 상장종목 마스터)
-- 공공데이터포털 KRX상장종목정보 API로 일 1회 동기화
-- Supabase SQL Editor에서 실행하세요
-- ============================================

-- 1. krx_stocks 테이블
CREATE TABLE IF NOT EXISTS krx_stocks (
  ticker     VARCHAR(20) PRIMARY KEY,   -- 단축코드 (예: 005930)
  name       VARCHAR(100) NOT NULL,     -- 한글 종목명
  market     VARCHAR(20) NOT NULL,      -- KOSPI / KOSDAQ / KONEX 등
  isin       VARCHAR(20),               -- ISIN 코드
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 이름 검색용 인덱스 (pg_trgm 사용하지 않고 ILIKE 기본)
CREATE INDEX IF NOT EXISTS idx_krx_stocks_name ON krx_stocks (name);
CREATE INDEX IF NOT EXISTS idx_krx_stocks_market ON krx_stocks (market);
