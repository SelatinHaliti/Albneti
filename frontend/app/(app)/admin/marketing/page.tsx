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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    api<MarketingStats>('/api/marketing/admin/stats')
      .then(setStats)
      .catch(() => setStats(null));
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
      pollRef.current = setInterval(async () => {
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
          if (status.status === 'failed' || (status.sent === 0 && status.failed)) {
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
          setBlasting(false);
        }
      }, 3000);
    },
    [load, loadPreview]
  );

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

  if (!stats) return <p className="text-gray-500">Duke ngarkuar...</p>;

  const theme = preview?.theme;
  const aiProvider = preview?.ai?.provider || stats.ai?.provider || 'smart';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold dark:text-white mb-1">AlbNet Ads – AI Marketing</h2>
        <p className="text-sm text-gray-500">Gjenero marketing profesional me AI dhe dërgo me 1 klik</p>
      </div>

      {!stats.smtpConfigured && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/40 text-red-800 dark:text-red-200 text-sm space-y-2">
          <p className="font-bold">❌ SMTP nuk është konfiguruar në production (Render)</p>
          <p>Kjo është arsyeja kryesore pse nuk dërgohen email-et. Vendos në Render Dashboard → albneti-api → Environment:</p>
          <ul className="list-disc ml-5 space-y-1 text-xs">
            <li>SMTP_HOST = smtp.gmail.com</li>
            <li>SMTP_PORT = 587</li>
            <li>SMTP_USER = selatinhaliti6@gmail.com</li>
            <li>SMTP_PASS = (Gmail App Password)</li>
            <li>SMTP_FROM = AlbNet &lt;selatinhaliti6@gmail.com&gt;</li>
          </ul>
          <p className="text-xs">Pastaj bëj <strong>Manual Deploy → Redeploy</strong></p>
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
              onClick={aiBlast}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#0095f6] to-[#0077cc] text-white font-bold text-sm shadow-lg disabled:opacity-50"
            >
              {blasting
                ? '⏳ Duke dërguar në background...'
                : `🚀 Gjenero & Dërgo te ${preview?.recipientCount ?? stats.totalEmailUsers ?? 0} përdorues`}
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
          <p className="text-xs text-gray-500">Aktiv (60 ditë)</p>
          <p className="text-2xl font-bold dark:text-white">{stats.eligibleActiveUsers}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <p className="text-xs text-gray-500">SMTP</p>
          <p className={`text-lg font-bold ${stats.smtpConfigured ? 'text-green-600' : 'text-red-600'}`}>
            {stats.smtpConfigured ? '✅ OK' : '❌ Jo'}
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
        <p className="font-semibold dark:text-white">Test SMTP (1 email)</p>
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
