'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/store/useUIStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  useEffect(() => {
    const stored = useUIStore.getState().theme;
    document.documentElement.classList.toggle('dark', stored === 'dark');
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return <>{children}</>;
}
