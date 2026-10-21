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
      className="fixed bottom-0 left-0 right-0 z-[90] p-3 sm:p-4 safe-area-pb pointer-events-none"
      role="dialog"
      aria-label="Pëlqimi për cookies"
    >
      <div className="pointer-events-auto max-w-[560px] mx-auto flex flex-col sm:flex-row sm:items-center gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 shadow-[var(--shadow-md)]">
        <p className="text-[12px] sm:text-[13px] text-[var(--text-muted)] leading-relaxed flex-1">
          Përdorim cookies për sesionin dhe preferencat.{' '}
          <Link href="/cookies" className="text-[var(--albanian-red)] font-semibold hover:underline">
            Detaje
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={accept}
            className="px-4 py-2 rounded-[10px] bg-[var(--albanian-red)] text-white text-[13px] font-semibold"
          >
            Pranoj
          </button>
          <Link
            href="/privatesi"
            className="px-3 py-2 rounded-[10px] border border-[var(--border)] text-[13px] font-semibold text-[var(--text-muted)] hover:bg-[var(--bg)]"
          >
            Privatësia
          </Link>
        </div>
      </div>
    </div>
  );
}
