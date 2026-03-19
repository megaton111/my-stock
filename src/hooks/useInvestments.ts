import { useState, useEffect, useCallback } from 'react';
import { Investment } from '@/types/investment';
import { useUser } from './useUser';

export function useInvestments() {
  const { user } = useUser();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvestments = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/investments?userId=${user.id}`);
      if (!res.ok) throw new Error('투자 데이터를 불러오지 못했습니다.');
      const data = await res.json();
      setInvestments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  return { investments, loading, error, userId: user?.id, refetch: fetchInvestments };
}
