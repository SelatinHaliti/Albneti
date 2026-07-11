'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function InstallAppBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    if (navigator.userAgent.includes('AlbNetDesktop') || navigator.userAgent.includes('AlbNetApp')) {
      document.body.classList.add('is-desktop-app');
    }

    const dismissedAt = localStorage.getItem('albnet-install-dismissed');
    if (dismissedAt && Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000) {
      setDismissed(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') setDeferred(null);
  };

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem('albnet-install-dismissed', String(Date.now()));
  };

  if (isStandalone || dismissed) return null;
  if (typeof window !== 'undefined' && (window.navigator.userAgent.includes('AlbNetApp') || window.navigator.userAgent.includes('AlbNetDesktop'))) return null;
  if (!deferred && !isIOS) return null;

  return (
    <div className="install-banner animate-fade-in">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 ring-1 ring-[var(--border)]">
          <img src="/icon" alt="AlbNet" className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[var(--text)] truncate">Instalo AlbNet</p>
          <p className="text-[11px] text-[var(--text-muted)] truncate">
            {isIOS ? 'Shto në Ekranin Kryesor' : 'Aplikacion në telefon & desktop'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {deferred ? (
          <button type="button" onClick={install} className="install-btn">
            Instalo
          </button>
        ) : (
          <Link href="/shkarko" className="install-btn">
            Si?
          </Link>
        )}
        <button type="button" onClick={dismiss} className="text-[var(--text-muted)] p-1" aria-label="Mbyll">
          ✕
        </button>
      </div>
    </div>
  );
}
