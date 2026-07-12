'use client';

import { useEffect, useState } from 'react';
import { api } from '@/utils/api';

type MarketingStats = {
  smtpConfigured: boolean;
  currentWeekKey: string;
  optedIn: number;
  optedOut: number;
  eligibleActiveUsers: number;
  lastRun?: {
    weekKey: string;
    subject: string;
    sentCount: number;
    failedCount: number;
    completedAt: string;
  };
  themes?: { id: string; subject: string }[];
};

export default function AdminMarketingPage() {
  const [stats, setStats] = useState<MarketingStats | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const load = () => {
    api<MarketingStats>('/api/marketing/admin/stats')
      .then(setStats)
      .catch(() => setStats(null));
  };

  useEffect(() => { load(); }, []);

  const sendWeekly = async (force = false) => {
    if (!confirm(force ? 'Dërgo përsëri këtë javë (force)?' : 'Dërgo AlbNet Ads për këtë javë?')) return;
    setSending(true);
    setResult(null);
    try {
      const res = await api<{ sent?: number; failed?: number; skipped?: boolean; error?: string }>(
        '/api/marketing/admin/send-weekly',
        { method: 'POST', body: { force } }
      );
      if (res.error) setResult(`Gabim: ${res.error}`);
      else if (res.skipped) setResult('Kampanja e kësaj jave është dërguar tashmë.');
      else setResult(`Dërguar: ${res.sent ?? 0} email, dështuar: ${res.failed ?? 0}`);
      load();
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Gabim');
    } finally {
      setSending(false);
    }
  };

  if (!stats) return <p className="text-gray-500">Duke ngarkuar...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold dark:text-white mb-1">AlbNet Ads – Email Marketing</h2>
        <p className="text-sm text-gray-500">Emaile javore për përdoruesit aktivë (1x në javë)</p>
      </div>

      {!stats.smtpConfigured && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-sm">
          ⚠️ SMTP nuk është konfiguruar. Vendos SMTP_HOST, SMTP_USER, SMTP_PASS në Render.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <p className="text-xs text-gray-500">Opt-in</p>
          <p className="text-2xl font-bold dark:text-white">{stats.optedIn}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <p className="text-xs text-gray-500">Çabonuar</p>
          <p className="text-2xl font-bold dark:text-white">{stats.optedOut}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <p className="text-xs text-gray-500">Aktiv (60 ditë)</p>
          <p className="text-2xl font-bold dark:text-white">{stats.eligibleActiveUsers}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <p className="text-xs text-gray-500">Java aktuale</p>
          <p className="text-lg font-bold dark:text-white">{stats.currentWeekKey}</p>
        </div>
      </div>

      {stats.lastRun && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4 text-sm">
          <p className="font-semibold dark:text-white mb-2">Kampanja e fundit</p>
          <p className="text-gray-600 dark:text-gray-400">{stats.lastRun.subject}</p>
          <p className="text-gray-500 mt-1">
            Dërguar: {stats.lastRun.sentCount} · Dështuar: {stats.lastRun.failedCount} ·{' '}
            {new Date(stats.lastRun.completedAt).toLocaleString('sq-AL')}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={sending || !stats.smtpConfigured}
          onClick={() => sendWeekly(false)}
          className="px-5 py-2.5 rounded-xl bg-[var(--ig-blue)] text-white font-semibold text-sm disabled:opacity-50"
        >
          {sending ? 'Duke dërguar...' : 'Dërgo AlbNet Ads (këtë javë)'}
        </button>
        <button
          type="button"
          disabled={sending || !stats.smtpConfigured}
          onClick={() => sendWeekly(true)}
          className="px-5 py-2.5 rounded-xl border font-semibold text-sm disabled:opacity-50"
        >
          Dërgo përsëri (force)
        </button>
      </div>

      {result && <p className="text-sm text-gray-600 dark:text-gray-300">{result}</p>}

      {stats.themes && stats.themes.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <p className="font-semibold dark:text-white mb-2">Temat javore (rotacion)</p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {stats.themes.map((t) => (
              <li key={t.id}>· {t.subject}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
