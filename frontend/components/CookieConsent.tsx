'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'albnet_cookie_consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch (_) {}
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch (_) {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[90] p-4 safe-area-pb pointer-events-none"
      role="dialog"
      aria-label="Pëlqimi për cookies"
    >
      <div className="pointer-events-auto max-w-[520px] mx-auto liquid-glass-ultra rounded-2xl p-4 shadow-lg border border-[var(--border)]">
        <p className="text-[13px] text-[var(--text)] leading-relaxed">
          AlbNet përdor cookies dhe ruajtje lokale për sesionin, preferencat dhe funksionimin e platformës.{' '}
          <Link href="/cookies" className="text-[var(--ig-blue)] font-semibold hover:underline">
            Mëso më shumë
          </Link>
        </p>
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={accept}
            className="flex-1 py-2.5 rounded-xl bg-[var(--ig-blue)] text-white text-[13px] font-semibold"
          >
            Pranoj
          </button>
          <Link
            href="/privatesi"
            className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[13px] font-semibold text-[var(--text-muted)] hover:bg-[var(--primary-soft)] flex items-center"
          >
            Privatësia
          </Link>
        </div>
      </div>
    </div>
  );
}
