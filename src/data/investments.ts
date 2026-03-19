import { Investment } from '@/types/investment';

export const INVESTMENT_DATA: Investment[] = [
  { id: '1', name: '애플', ticker: 'AAPL', category: '주식', quantity: 550, avgPrice: 192.53, currency: 'USD' },
  { id: '2', name: '테슬라', ticker: 'TSLA', category: '주식', quantity: 1200, avgPrice: 208.33, currency: 'USD' },
  { id: '3', name: '메타', ticker: 'META', category: '주식', quantity: 200, avgPrice: 425.53, currency: 'USD' },
  { id: '4', name: '비트코인', ticker: 'BTC-USD', category: '코인', quantity: 0.5, avgPrice: 70921.98, currency: 'USD' },
  { id: '5', name: '삼성전자', ticker: '005930.KS', category: '주식', quantity: 100, avgPrice: 200000, currency: 'KRW' },
];
