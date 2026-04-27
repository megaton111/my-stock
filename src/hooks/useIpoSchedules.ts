import { useState, useEffect, useCallback } from 'react';
import { IpoSchedule } from '@/types/ipo';

export function useIpoSchedules() {
  const [items, setItems] = useState<IpoSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ipo');
      if (!res.ok) throw new Error('공모주 일정을 불러오지 못했습니다.');
      const data = await res.json();
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, error, refetch: fetchItems };
}
