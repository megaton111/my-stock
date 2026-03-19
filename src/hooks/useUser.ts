'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface User {
  id: string;
  email: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const init = useCallback(async () => {
    try {
      // Supabase Auth에서 현재 세션 확인
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser?.email) {
        setLoading(false);
        return;
      }

      // 우리 users 테이블에서 조회
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authUser.email }),
      });
      const data = await res.json();
      setUser(data);
    } catch (err) {
      console.error('Failed to init user:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase.auth]);

  useEffect(() => {
    init();

    // 로그인/로그아웃 이벤트 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      init();
    });

    return () => subscription.unsubscribe();
  }, [init, supabase.auth]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/login';
  }, [supabase.auth]);

  return { user, loading, signOut };
}
