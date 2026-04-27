'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface User {
  id: string;
  email: string;
}

const supabase = createClient();

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (cancelled) return;
        if (!authUser?.email) {
          setLoading(false);
          return;
        }

        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authUser.email }),
        });
        const data = await res.json();
        if (!cancelled) setUser(data);
      } catch (err) {
        console.error('Failed to init user:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/login';
  }, []);

  return { user, loading, signOut };
}
