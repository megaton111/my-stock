import { useCallback, useEffect, useRef, useState } from 'react';
import { PriceResult } from '@/types/investment';

const POLL_INTERVAL = 30_000;

export interface WatchlistItem {
  id: string;
  ticker: string;
  stockName: string;
  exchange?: string;
  stockType?: string;
  naverCode?: string;
}

export interface WatchlistQuote {
  price?: number;
  changePercent?: number;
  currency?: string;
}

interface UseWatchlistResult {
  items: WatchlistItem[];
  quotes: Record<string, WatchlistQuote>;
  loading: boolean;
  reload: () => Promise<void>;
  add: (ticker: string, stockName: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useWatchlist(userId: string | null): UseWatchlistResult {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, WatchlistQuote>>({});
  const [loading, setLoading] = useState(true);
  const tickersRef = useRef<string[]>([]);

  const fetchItems = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/watchlist?userId=${userId}`);
    if (!res.ok) return;
    const data: WatchlistItem[] = await res.json();
    setItems(data);
  }, [userId]);

  const fetchQuotes = useCallback(async () => {
    const tickers = tickersRef.current;
    if (tickers.length === 0) {
      setQuotes({});
      return;
    }
    try {
      const res = await fetch(`/api/stock/price?symbols=${tickers.join(',')}`);
      const data: PriceResult[] = await res.json();
      const map: Record<string, WatchlistQuote> = {};
      for (const item of data) {
        if (item.price) {
          map[item.symbol] = {
            price: item.price,
            changePercent: item.changePercent,
            currency: item.currency,
          };
        }
      }
      setQuotes(map);
    } catch (error) {
      console.error('Failed to fetch watchlist quotes:', error);
    }
  }, []);

  // 사용자 변경 시 목록 로드
  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      Promise.resolve().then(() => {
        if (cancelled) return;
        setItems([]);
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }
    Promise.resolve()
      .then(() => {
        if (!cancelled) setLoading(true);
      })
      .then(() => fetchItems())
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, fetchItems]);

  // 종목 변경 시 시세 폴링 시작
  useEffect(() => {
    tickersRef.current = items.map((i) => i.ticker);
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) fetchQuotes();
    });
    const interval = setInterval(fetchQuotes, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [items, fetchQuotes]);

  const add = useCallback(
    async (ticker: string, stockName: string, exchange?: string, stockType?: string) => {
      if (!userId) return;
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ticker, stockName, exchange, stockType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '등록 실패');
      }
      await fetchItems();
    },
    [userId, fetchItems],
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/watchlist/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('삭제 실패');
      setItems((prev) => prev.filter((i) => i.id !== id));
    },
    [],
  );

  return { items, quotes, loading, reload: fetchItems, add, remove };
}
