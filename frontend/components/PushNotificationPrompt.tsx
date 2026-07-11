'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  dismissPushPrompt,
  getNotificationPermission,
  isPushSupported,
  shouldShowPushPrompt,
  subscribeToPushNotifications,
  syncPushSubscriptionIfGranted,
} from '@/lib/pushNotifications';

export function PushNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (shouldShowPushPrompt()) setVisible(true);
      else void syncPushSubscriptionIfGranted();
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  const onDismiss = useCallback(() => {
    dismissPushPrompt();
    setVisible(false);
  }, []);

  const onEnable = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await subscribeToPushNotifications();
    setLoading(false);
    if (result.ok) {
      setVisible(false);
      return;
    }
    if (result.reason === 'denied') {
      setError('Njoftimet u bllokuan. Aktivizoji te cilësimet e browser-it.');
      return;
    }
    if (result.reason === 'no-vapid') {
      setError('Push nuk është konfiguruar ende në server.');
      return;
    }
    if (result.reason === 'unsupported') {
      setError('Pajisja nuk mbështet njoftime push. Instalo AlbNet si app.');
      return;
    }
    setError('Nuk u aktivizuan. Provo përsëri.');
  }, []);

  if (!visible || !isPushSupported()) return null;

  const permission = getNotificationPermission();

  return (
    <div
      className="fixed inset-0 z-[180] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm safe-area-pb"
      role="dialog"
      aria-labelledby="push-prompt-title"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[var(--ig-blue)] to-purple-600 flex items-center justify-center text-3xl shadow-lg">
            🔔
          </div>
          <h2 id="push-prompt-title" className="text-lg font-bold text-[var(--text)]">
            Aktivizo njoftimet
          </h2>
          <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
            Merr <strong className="text-[var(--text)]">thirrje</strong>,{' '}
            <strong className="text-[var(--text)]">mesazhe</strong> dhe{' '}
            <strong className="text-[var(--text)]">pëlqime</strong> edhe kur je jashtë AlbNet-it
            – si Instagram.
          </p>
          {permission === 'default' && (
            <p className="text-xs text-[var(--text-muted)] mt-3 px-2">
              Pas butonit &quot;Aktivizo&quot;, browser-i do të kërkojë lejen tënde.
            </p>
          )}
          {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
        </div>

        <div className="px-5 pb-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onEnable}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[var(--ig-blue)] text-white font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {loading ? 'Duke u aktivizuar...' : 'Aktivizo njoftimet'}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            disabled={loading}
            className="w-full py-3 rounded-xl border border-[var(--border)] text-[var(--text-muted)] font-medium text-sm hover:bg-[var(--bg)] transition-colors"
          >
            Jo tani
          </button>
          <p className="text-[10px] text-center text-[var(--text-muted)] pt-1">
            Në iPhone: instalo AlbNet në ekranin kryesor për njoftime push.
          </p>
        </div>
      </div>
    </div>
  );
}
