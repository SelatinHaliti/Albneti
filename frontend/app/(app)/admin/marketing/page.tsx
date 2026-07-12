'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '@/utils/api';

type AiTheme = {
  id: string;
  subject: string;
  headline: string;
  intro: string;
  urgencyLine?: string;
  heroEmoji?: string;
  aiSource?: string;
  features?: { emoji: string; title: string; desc: string; cta: string; path: string }[];
};

type MarketingStats = {
  smtpConfigured: boolean;
  smtpVerified?: boolean;
  smtpError?: string;
  emailProvider?: 'resend' | 'smtp' | null;
  resendNeedsDomain?: boolean;
  deliveryNote?: string | null;
  currentWeekKey: string;
  optedIn: number;
  optedOut: number;
  eligibleActiveUsers: number;
  totalEmailUsers?: number;
  runningBlast?: { runKey: string; sent: number; failed: number } | null;
  ai?: { provider: string; model: string; gemini: boolean; openai: boolean; geminiKeyLooksValid?: boolean };
  lastRun?: {
    weekKey: string;
    subject: string;
    sentCount: number;
    failedCount: number;
    completedAt: string;
    aiSource?: string;
    status?: string;
    errorMessage?: string;
  };
  themes?: { id: string; subject: string }[];
};

type AiPreview = {
  theme: AiTheme;
  recipientCount: number;
  highlights: {
    activeUsers: number;
    activeLives: number;
    totalUsers: number;
    trendingCreator?: string | null;
    upcomingEvent?: string | null;
  };
  ai: { provider: string; model: string };
};

type BlastStatus = {
  status: string;
  runKey?: string;
  sent?: number;
  failed?: number;
  skipped?: number;
  subject?: string;
  error?: string;
};

const AI_PROVIDER_LABEL: Record<string, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI GPT',
  smart: 'AlbNet Smart AI',
};

export default function AdminMarketingPage() {
  const [stats, setStats] = useState<MarketingStats | null>(null);
  const [preview, setPreview] = useState<AiPreview | null>(null);
  const [sending, setSending] = useState(false);
  const [blasting, setBlasting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [activeRunKey, setActiveRunKey] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const MAX_POLL_TICKS = 200;

  const load = useCallback(() => {
    setStatsLoading(true);
    setStatsError(null);
    api<MarketingStats>('/api/marketing/admin/stats', { timeout: 90000 })
      .then((data) => {
        setStats(data);
        setStatsError(null);
      })
      .catch((err) => {
        setStats(null);
        setStatsError(err instanceof Error ? err.message : 'Nuk u ngarkuan statistikat.');
      })
      .finally(() => setStatsLoading(false));
  }, []);

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const res = await api<AiPreview>('/api/marketing/admin/ai-preview');
      setPreview(res);
    } catch {
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const pollBlastStatus = useCallback(
    (runKey: string) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollCountRef.current = 0;
      pollRef.current = setInterval(async () => {
        pollCountRef.current += 1;
        if (pollCountRef.current > MAX_POLL_TICKS) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setBlasting(false);
          setResult('⚠️ Dërguar po zgjat shumë. Kliko "Anulo dërgim të ngecur" ose prit dhe rifresko faqen.');
          load();
          return;
        }
        try {
          const status = await api<BlastStatus>(`/api/marketing/admin/blast-status?runKey=${encodeURIComponent(runKey)}`);
          if (status.status === 'running') {
            setResult(`⏳ Duke dërguar... ${status.sent ?? 0} dërguar, ${status.failed ?? 0} dështuar`);
            return;
          }
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setBlasting(false);
          setActiveRunKey(null);
          if (status.status === 'failed' || (status.sent === 0 && (status.failed ?? 0) > 0)) {
            setResult(`❌ Dështoi: ${status.error || 'Asnjë email nuk u dërgua.'} (${status.failed ?? 0} dështuar)`);
          } else {
            setResult(
              `✅ Përfundoi: ${status.sent ?? 0} dërguar, ${status.failed ?? 0} dështuar${status.subject ? `\n"${status.subject}"` : ''}`
            );
          }
          load();
          loadPreview();
        } catch {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setBlasting(false);
          setResult('❌ Nuk mund të lexohet statusi. Rifresko faqen ose anulo dërgimin e ngecur.');
        }
      }, 3000);
    },
    [load, loadPreview]
  );

  const cancelStuck = async () => {
    if (!confirm('Anulo çdo dërgim që është ngecur në "running"?')) return;
    setCancelling(true);
    try {
      const res = await api<{ message?: string; cancelled?: number }>('/api/marketing/admin/cancel-stuck', {
        method: 'POST',
        body: {},
      });
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      setBlasting(false);
      setActiveRunKey(null);
      setResult(res.message || 'U anulua.');
      load();
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Gabim anulimi');
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    load();
    loadPreview();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load, loadPreview]);

  useEffect(() => {
    if (stats?.runningBlast?.runKey && !activeRunKey) {
      setActiveRunKey(stats.runningBlast.runKey);
      setBlasting(true);
      pollBlastStatus(stats.runningBlast.runKey);
    }
  }, [stats?.runningBlast, activeRunKey, pollBlastStatus]);

  const sendTest = async () => {
    const email = testEmail.trim();
    if (!email) return;
    setTesting(true);
    setResult(null);
    try {
      const res = await api<{ ok?: boolean; message?: string; error?: string }>(
        '/api/marketing/admin/test-email',
        { method: 'POST', body: { email } }
      );
      if (res.error) setResult(`Test dështoi: ${res.error}`);
      else setResult(res.message || 'Email test u dërgua.');
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Gabim test');
    } finally {
      setTesting(false);
    }
  };

  const sendWeekly = async (force = false) => {
    if (!confirm(force ? 'Dërgo përsëri këtë javë (force)?' : 'Dërgo AlbNet Ads për këtë javë?')) return;
    setSending(true);
    setResult(null);
    try {
      const res = await api<{ sent?: number; failed?: number; skipped?: boolean; error?: string; subject?: string }>(
        '/api/marketing/admin/send-weekly',
        { method: 'POST', body: { force }, timeout: 300000 }
      );
      if (res.error) setResult(`Gabim: ${res.error}`);
      else if (res.skipped) setResult('Kampanja e kësaj jave është dërguar tashmë.');
      else setResult(`Dërguar: ${res.sent ?? 0} email, dështuar: ${res.failed ?? 0}${res.subject ? ` · "${res.subject}"` : ''}`);
      load();
      loadPreview();
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Gabim');
    } finally {
      setSending(false);
    }
  };

  const sendActiveNow = async () => {
    const count = stats?.eligibleActiveUsers ?? preview?.activeRecipientCount ?? 0;
    if (!confirm(`Dërgo AlbNet Ads te ${count} përdorues AKTIVË (60 ditë)?`)) return;
    setBlasting(true);
    setResult(null);
    try {
      const res = await api<{
        started?: boolean;
        runKey?: string;
        total?: number;
        error?: string;
        message?: string;
      }>('/api/marketing/admin/send-active', { method: 'POST', body: {} });
      if (res.error) {
        setResult(`Gabim: ${res.error}`);
        setBlasting(false);
        return;
      }
      if (res.alreadyRunning && res.runKey) {
        setActiveRunKey(res.runKey);
        setResult(res.message || 'Dërgim aktiv – duke vazhduar...');
        pollBlastStatus(res.runKey);
        return;
      }
      if (res.runKey) {
        setActiveRunKey(res.runKey);
        setResult(res.message || `Duke dërguar te ${res.total ?? count} aktivë...`);
        pollBlastStatus(res.runKey);
      }
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Gabim');
      setBlasting(false);
    }
  };

  const aiBlast = async () => {
    const count = preview?.recipientCount ?? stats?.totalEmailUsers ?? 0;
    const subject = preview?.theme?.subject ?? 'kampanjë AI';
    if (!confirm(`Gjenero & dërgo marketing te ${count} përdorues?\n\nSubjekt: ${subject}`)) return;
    setBlasting(true);
    setResult(null);
    try {
      const res = await api<{
        started?: boolean;
        alreadyRunning?: boolean;
        runKey?: string;
        total?: number;
        error?: string;
        message?: string;
      }>('/api/marketing/admin/ai-blast', { method: 'POST', body: {} });
      if (res.error) {
        setResult(`Gabim: ${res.error}`);
        setBlasting(false);
        return;
      }
      if (res.alreadyRunning && res.runKey) {
        setActiveRunKey(res.runKey);
        setResult(res.message || 'Dërgim aktiv – duke vazhduar...');
        pollBlastStatus(res.runKey);
        return;
      }
      if (res.runKey) {
        setActiveRunKey(res.runKey);
        setResult(res.message || `Duke dërguar te ${res.total ?? count} përdorues...`);
        pollBlastStatus(res.runKey);
      } else {
        setBlasting(false);
        setResult(res.message || 'U nis.');
      }
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Gabim');
      setBlasting(false);
    }
  };

  if (statsLoading && !stats) {
    return (
      <div className="space-y-4">
        <p className="text-gray-500">Duke ngarkuar AlbNet Ads...</p>
        <p className="text-xs text-gray-400">Nëse zgjat më shumë se 1 minutë, serveri po zgjohet (Render free).</p>
      </div>
    );
  }

  if (statsError && !stats) {
    return (
      <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 space-y-3">
        <p className="font-semibold text-red-700 dark:text-red-300">Nuk u ngarkua paneli i marketing</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{statsError}</p>
        <button
          type="button"
          onClick={load}
          className="px-4 py-2 rounded-lg bg-[#0095f6] text-white text-sm font-semibold"
        >
          Provo përsëri
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const theme = preview?.theme;
  const aiProvider = preview?.ai?.provider || stats.ai?.provider || 'smart';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold dark:text-white mb-1">AlbNet Ads – AI Marketing</h2>
        <p className="text-sm text-gray-500">Gjenero marketing profesional me AI dhe dërgo me 1 klik</p>
      </div>

      {stats.resendNeedsDomain && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-sm space-y-2">
          <p className="font-bold">⚠️ Resend: domain nuk është verifikuar</p>
          <p>{stats.deliveryNote || 'Blast-i përdor Gmail SMTP derisa të verifikosh domain në resend.com/domains.'}</p>
          <p className="text-xs">
            Pas verifikimit, vendos në Render: <code className="text-xs">RESEND_FROM=AlbNet &lt;noreply@domaini-yt.com&gt;</code>
          </p>
        </div>
      )}

      {!stats.smtpConfigured && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/40 text-red-800 dark:text-red-200 text-sm space-y-2">
          <p className="font-bold">❌ Email nuk është konfiguruar në production (Render)</p>
          <p>Vendos <strong>RESEND_API_KEY</strong> ose SMTP_* në Render Dashboard → albneti-api → Environment.</p>
          <p className="text-xs">Pastaj bëj <strong>Manual Deploy → Redeploy</strong></p>
        </div>
      )}

      {stats.smtpConfigured && stats.smtpError && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-sm">
          <p className="font-bold">⚠️ SMTP: {stats.smtpError}</p>
          <p className="text-xs mt-1">Provo &quot;Dërgo test&quot; poshtë për të verifikuar dërgimin real.</p>
        </div>
      )}

      {stats.runningBlast && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/40 text-sm flex flex-wrap items-center justify-between gap-3">
          <p>
            Dërgim aktiv: {stats.runningBlast.sent} dërguar, {stats.runningBlast.failed} dështuar
          </p>
          <button
            type="button"
            disabled={cancelling}
            onClick={cancelStuck}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            {cancelling ? 'Duke anuluar...' : 'Anulo dërgim të ngecur'}
          </button>
        </div>
      )}

      {/* Hero AI Blast */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-[#0095f6]/10 via-white to-[#c41e3a]/10 dark:from-[#0095f6]/20 dark:via-gray-900 dark:to-[#c41e3a]/20 p-6">
        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✨</span>
            <div>
              <p className="font-bold text-lg dark:text-white">Marketing AI – 1 Klik</p>
              <p className="text-xs text-gray-500">
                Motor: {AI_PROVIDER_LABEL[aiProvider] || aiProvider}
              </p>
            </div>
          </div>

          {loadingPreview ? (
            <p className="text-sm text-gray-500">Duke gjeneruar preview...</p>
          ) : theme ? (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl border p-4 space-y-2">
              <p className="text-xs font-bold text-[#0095f6] uppercase tracking-wide">Preview</p>
              <p className="font-bold dark:text-white">{theme.subject}</p>
              <p className="text-lg font-semibold dark:text-white">{theme.headline}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{theme.intro}</p>
              {theme.urgencyLine && (
                <p className="text-xs font-semibold text-[#c41e3a] bg-[#c41e3a]/10 inline-block px-2 py-1 rounded">
                  {theme.urgencyLine}
                </p>
              )}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={blasting || !stats.smtpConfigured}
              onClick={sendActiveNow}
              className="px-6 py-3 rounded-xl bg-[#c41e3a] text-white font-bold text-sm shadow-lg disabled:opacity-50"
            >
              {blasting ? '⏳ Duke dërguar...' : `📧 Dërgo te ${stats.eligibleActiveUsers ?? 0} AKTIVË tani`}
            </button>
            <button
              type="button"
              disabled={blasting || !stats.smtpConfigured}
              onClick={aiBlast}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#0095f6] to-[#0077cc] text-white font-bold text-sm shadow-lg disabled:opacity-50"
            >
              {blasting ? '⏳ Duke dërguar...' : `🚀 Dërgo te ${preview?.recipientCount ?? stats.totalEmailUsers ?? 0} (të gjithë me email)`}
            </button>
            <button
              type="button"
              disabled={loadingPreview}
              onClick={loadPreview}
              className="px-4 py-3 rounded-xl border text-sm font-semibold disabled:opacity-50"
            >
              🔄 Rifresko preview
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <p className="text-xs text-gray-500">Me email</p>
          <p className="text-2xl font-bold dark:text-white">{stats.totalEmailUsers ?? 0}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <p className="text-xs text-gray-500">Aktiv (60 ditë + email)</p>
          <p className="text-2xl font-bold dark:text-white">{stats.eligibleActiveUsers}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <p className="text-xs text-gray-500">Email</p>
          <p className={`text-lg font-bold ${stats.smtpConfigured ? 'text-green-600' : 'text-red-600'}`}>
            {stats.smtpConfigured
              ? stats.emailProvider === 'resend'
                ? '✅ Resend'
                : stats.resendNeedsDomain
                  ? '✅ Gmail SMTP'
                  : '✅ SMTP'
              : '❌ Jo'}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <p className="text-xs text-gray-500">Java</p>
          <p className="text-lg font-bold dark:text-white">{stats.currentWeekKey}</p>
        </div>
      </div>

      {stats.lastRun && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4 text-sm">
          <p className="font-semibold dark:text-white mb-2">Kampanja e fundit</p>
          <p className="text-gray-600 dark:text-gray-400">{stats.lastRun.subject}</p>
          <p className="text-gray-500 mt-1">
            Dërguar: {stats.lastRun.sentCount} · Dështuar: {stats.lastRun.failedCount} ·{' '}
            {stats.lastRun.completedAt ? new Date(stats.lastRun.completedAt).toLocaleString('sq-AL') : '—'}
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border p-4 space-y-3">
        <p className="font-semibold dark:text-white">Test email (1 dërgim)</p>
        <div className="flex flex-wrap gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="selatinhaliti6@gmail.com"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border bg-transparent text-sm"
          />
          <button
            type="button"
            disabled={testing || !stats.smtpConfigured || !testEmail.trim()}
            onClick={sendTest}
            className="px-4 py-2 rounded-lg border font-semibold text-sm disabled:opacity-50"
          >
            {testing ? 'Duke dërguar...' : 'Dërgo test'}
          </button>
        </div>
      </div>

      {result && (
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border text-sm whitespace-pre-line">
          {result}
        </div>
      )}
    </div>
  );
}
