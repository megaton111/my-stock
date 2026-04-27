import { useState, useEffect, useCallback } from 'react';
import { MyIpoEntry } from '@/types/ipo';
import { useUser } from './useUser';

export function useMyIpo() {
  const { user } = useUser();
  const [entries, setEntries] = useState<MyIpoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/ipo/my?userId=${user.id}`);
      if (!res.ok) throw new Error('나의 공모주 데이터를 불러오지 못했습니다.');
      const data = await res.json();
      setEntries(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const totalProfit = entries.reduce((sum, e) => sum + e.profit, 0);

  return { entries, loading, error, userId: user?.id, totalProfit, refetch: fetchEntries };
}
