'use client';

import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  email: string;
}

const STORAGE_KEY = 'mystock_user';
const DEFAULT_EMAIL = 'admin@mystock.local';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // localStorage에서 사용자 정보 로드 또는 기본 사용자로 초기화
  const init = useCallback(async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
        setLoading(false);
        return;
      }

      // 저장된 정보 없으면 기본 사용자로 등록/조회
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: DEFAULT_EMAIL }),
      });
      const data = await res.json();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setUser(data);
    } catch (err) {
      console.error('Failed to init user:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  return { user, loading };
}
