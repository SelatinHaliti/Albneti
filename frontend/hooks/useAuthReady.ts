'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

/** Pret derisa sesioni të ngarkohet nga localStorage – shmang redirect të gabuar te /kycu */
export function useAuthReady() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setReady(true);
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      setReady(true);
    });
    return unsub;
  }, []);

  const hydrated = ready || hasHydrated;
  const isAuthenticated = hydrated && Boolean(user?.username && (token || getTokenFallback()));

  return { ready: hydrated, user, token, isAuthenticated };
}

function getTokenFallback(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || useAuthStore.getState().token;
}
