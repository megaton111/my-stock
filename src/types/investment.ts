export interface Investment {
  id: string;
  name: string;
  ticker: string;
  category: string;
  quantity: number;
  avgPrice: number;
  currency: 'USD' | 'KRW';
  broker?: string;
  positionId?: number;
}

export type InvestmentInput = Omit<Investment, 'id'>;

export interface PriceResult {
  symbol: string;
  price?: number;
  currency?: string;
  error?: string;
}
