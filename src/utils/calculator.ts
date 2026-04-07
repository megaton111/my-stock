import { Investment } from '@/types/investment';
import { isCash } from './assetClass';

/** 환율 팩터: USD면 환율 적용, KRW면 1 */
function currencyFactor(currency: 'USD' | 'KRW', exchangeRate: number): number {
  return currency === 'USD' ? exchangeRate : 1;
}

/** 개별 종목의 투자금액(KRW) */
export function investedAmount(item: Investment, exchangeRate: number): number {
  return item.avgPrice * item.quantity * currencyFactor(item.currency, exchangeRate);
}

/** 개별 종목의 현재 평가금액(KRW) */
export function currentValue(item: Investment, currentPrice: number, exchangeRate: number): number {
  return currentPrice * item.quantity * currencyFactor(item.currency, exchangeRate);
}

/** 포트폴리오 전체 요약 계산
 *  - totalInvested / totalCurrentValue: 현금 포함 (총 자산 표현)
 *  - totalProfit / totalRate: 현금 제외 (수익률 희석 방지)
 */
export function calcPortfolioSummary(
  investments: Investment[],
  prices: Record<string, number>,
  exchangeRate: number,
) {
  let totalInvested = 0;
  let totalCurrentValue = 0;
  let stockInvested = 0;
  let stockCurrentValue = 0;

  for (const item of investments) {
    const factor = currencyFactor(item.currency, exchangeRate);
    const invested = item.avgPrice * item.quantity * factor;
    const price = prices[item.ticker] || item.avgPrice;
    const current = price * item.quantity * factor;

    totalInvested += invested;
    totalCurrentValue += current;

    if (!isCash(item.ticker)) {
      stockInvested += invested;
      stockCurrentValue += current;
    }
  }

  const totalProfit = stockCurrentValue - stockInvested;
  const totalRate = stockInvested > 0 ? (totalProfit / stockInvested) * 100 : 0;

  return { totalInvested, totalCurrentValue, totalProfit, totalRate };
}
