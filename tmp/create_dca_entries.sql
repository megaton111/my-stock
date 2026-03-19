-- 적립식 매수 일지 테이블 (단일 테이블로 종목 정보 + 매수 기록 통합)
CREATE TABLE IF NOT EXISTS dca_entries (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  stock_name    VARCHAR(100) NOT NULL COMMENT '종목명 (예: QLD)',
  ticker        VARCHAR(20)  NOT NULL COMMENT '티커 심볼',
  target_quantity INT NOT NULL DEFAULT 0 COMMENT '목표수량',
  purchase_date DATE NOT NULL COMMENT '매수일',
  amount        DECIMAL(15,2) NOT NULL COMMENT '매수금액 (USD)',
  quantity      DECIMAL(15,4) NOT NULL COMMENT '매수수량',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_ticker (user_id, ticker)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
