import { Investment } from '@/types/investment';

export type AssetClass = '한국주식' | '미국주식' | '코인' | '현금';

export const ASSET_CLASS_ORDER: AssetClass[] = ['한국주식', '미국주식', '코인', '현금'];

export const ASSET_CLASS_COLORS: Record<AssetClass, string> = {
  한국주식: '#1976d2',
  미국주식: '#4caf50',
  코인:    '#ff9800',
  현금:    '#9e9e9e',
};

/** ticker가 현금 항목인지 판별 */
export function isCash(ticker: string): boolean {
  return ticker.startsWith('CASH-');
}

/** Investment를 4개 자산군 중 하나로 분류 */
export function getAssetClass(item: Investment): AssetClass {
  if (isCash(item.ticker)) return '현금';
  if (item.category === '코인') return '코인';
  if (item.category === '코스피' || item.category === '코스닥') return '한국주식';
  // ETF는 통화로 보정 (KRW면 한국 ETF, USD면 미국 ETF)
  if (item.category === 'ETF') {
    return item.currency === 'KRW' ? '한국주식' : '미국주식';
  }
  return '미국주식';
}
