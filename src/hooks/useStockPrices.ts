import { useEffect, useState } from 'react';
import { Investment, PriceResult } from '@/types/investment';
import { isCash } from '@/utils/assetClass';

const POLL_INTERVAL = 30_000; // 30초
const EXCHANGE_RATE_SYMBOL = 'USDKRW=X';
const DEFAULT_EXCHANGE_RATE = 1410;

interface StockPricesState {
  prices: Record<string, number>;
  exchangeRate: number;
  loading: boolean;
}

export function useStockPrices(investments: Investment[]): StockPricesState {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (investments.length === 0) {
      setLoading(false);
      return;
    }

    const tickers = investments.map(item => item.ticker).filter(t => !isCash(t));
    const symbols = [...tickers, EXCHANGE_RATE_SYMBOL].join(',');

    const fetchPrices = async () => {
      try {
        const response = await fetch(`/api/stock/price?symbols=${symbols}`);
        const data: PriceResult[] = await response.json();

        const priceMap: Record<string, number> = {
          'CASH-KRW': 1,
          'CASH-USD': 1,
        };
        for (const item of data) {
          if (item.symbol === EXCHANGE_RATE_SYMBOL) {
            if (item.price) setExchangeRate(item.price);
          } else if (item.price) {
            priceMap[item.symbol] = item.price;
          }
        }
        setPrices(priceMap);
      } catch (error) {
        console.error('Failed to fetch prices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(() => {
      if (!document.hidden) fetchPrices();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [investments]);

  return { prices, exchangeRate, loading };
}
