/**
 * 통화에 따라 금액을 포맷팅한다.
 * USD → "$1,234", KRW → "1,234원"
 */
export function formatCurrency(amount: number, currency: 'USD' | 'KRW'): string {
  if (currency === 'USD') {
    return `$${amount.toLocaleString()}`;
  }
  return `${Math.floor(amount).toLocaleString()}원`;
}

/**
 * 원화 금액을 포맷팅한다. (소수점 버림)
 */
export function formatKRW(amount: number): string {
  return `${Math.floor(amount).toLocaleString()}원`;
}

/**
 * 수익률을 부호 포함 문자열로 포맷팅한다.
 * 예: "+12.34%", "-5.67%"
 */
export function formatRate(rate: number): string {
  const sign = rate > 0 ? '+' : '';
  return `${sign}${rate.toFixed(2)}%`;
}

/**
 * 수익금을 부호 포함 원화로 포맷팅한다.
 * 예: "+1,234,567원", "-500,000원"
 */
export function formatProfit(profit: number): string {
  const sign = profit > 0 ? '+' : '';
  return `${sign}${Math.floor(profit).toLocaleString()}원`;
}

/**
 * 수익 방향에 따른 MUI 색상 키를 반환한다.
 * 양수 → 빨강(error.main), 음수 → 파랑(primary.main) — 한국 주식시장 관례
 */
export function profitColor(value: number): 'error.main' | 'primary.main' {
  return value >= 0 ? 'error.main' : 'primary.main';
}
