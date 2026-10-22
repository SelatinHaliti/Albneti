'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { api } from '@/utils/api';
import { useToastStore } from '@/store/useToastStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Skeleton } from '@/components/Skeleton';
import type { CalendarDay, CreatorIdea, StudioResponse } from '@/lib/creatorStudio';

function ScoreRing({ score }: { score: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <svg width="92" height="92" viewBox="0 0 92 92" className="flex-shrink-0">
      <circle cx="46" cy="46" r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
      <circle
        cx="46"
        cy="46"
        r={r}
        fill="none"
        stroke="url(#studioGrad)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 46 46)"
      />
      <defs>
        <linearGradient id="studioGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c8102e" />
          <stop offset="55%" stopColor="#7a0a1c" />
          <stop offset="100%" stopColor="#b8973a" />
        </linearGradient>
      </defs>
      <text x="46" y="50" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--text)">
        {score}
      </text>
    </svg>
  );
}

function IdeaCard({
  idea,
  onUse,
  expanded,
  onToggle,
}: {
  idea: CreatorIdea;
  onUse: (idea: CreatorIdea) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="liquid-glass-card p-4 space-y-3">
      <button type="button" onClick={onToggle} className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] text-[var(--text-muted)] mb-1">
              {idea.nicheLabel} · {idea.formatLabel} · {idea.durationSec}s
            </p>
            <p className="text-[15px] font-semibold text-[var(--text)]">{idea.title}</p>
          </div>
          <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-[var(--primary-soft)] text-[var(--primary)] flex-shrink-0">
            {idea.virality}
          </span>
        </div>
        <p className="text-[13px] text-[var(--text)] mt-2 line-clamp-2">“{idea.hook}”</p>
      </button>
      {expanded && (
        <div className="space-y-2 pt-1 border-t border-[var(--border)]">
          <ol className="space-y-1">
            {idea.script.map((b) => (
              <li key={b.t} className="text-[12px] flex gap-2">
                <span className="font-semibold text-[var(--primary)] w-12 flex-shrink-0">{b.t}</span>
                <span className="text-[var(--text)]">{b.action}</span>
              </li>
            ))}
          </ol>
          <p className="text-[12px] text-[var(--text-muted)]">{idea.why}</p>
          <p className="text-[12px] text-[var(--text)]">♪ {idea.musicVibe} · {idea.cta}</p>
          <div className="flex flex-wrap gap-1">
            {idea.hashtags.map((t) => (
              <span key={t} className="text-[11px] px-2 py-0.5 rounded-full border border-[var(--border)]">#{t}</span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onUse(idea)}
            className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white"
            style={{ background: 'var(--ig-gradient)' }}
          >
            Krijo Reel me këtë ide
          </button>
        </div>
      )}
    </div>
  );
}

export default function CreatorStudioPage() {
  const router = useRouter();
  const toast = useToastStore();
  const [data, setData] = useState<StudioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [niche, setNiche] = useState('');
  const [openIdea, setOpenIdea] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [tone, setTone] = useState<'viral' | 'emotional' | 'funny' | 'professional'>('viral');
  const [labLoading, setLabLoading] = useState(false);
  const [labCaptions, setLabCaptions] = useState<{ id: string; caption: string; hashtags: string[]; hook: string }[]>([]);

  useDocumentTitle('Studio');

  const load = useCallback(async (nicheId?: string) => {
    setLoading(true);
    setError('');
    try {
      const q = nicheId ? `?niche=${encodeURIComponent(nicheId)}` : '';
      const res = await api<StudioResponse>(`/api/creator/studio${q}`);
      setData(res);
      setOpenIdea(res.ideas?.[0]?.id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nuk u ngarkua Studio.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(niche || undefined);
  }, [load, niche]);

  const useIdea = (idea: CreatorIdea) => {
    try {
      sessionStorage.setItem(
        'albnet_studio_draft',
        JSON.stringify({ caption: idea.caption, hashtags: idea.hashtags.join(', '), hook: idea.hook })
      );
    } catch { /* ignore */ }
    toast.success('Ideja u ruajt – plotëso videon');
    router.push('/krijo/reel');
  };

  const runCaptionLab = async () => {
    if (!draft.trim()) {
      toast.info('Shkruaj një draft caption');
      return;
    }
    setLabLoading(true);
    try {
      const res = await api<{ variants: { id: string; caption: string; hashtags: string[]; hook: string }[] }>(
        '/api/creator/caption',
        { method: 'POST', body: { caption: draft, tone } }
      );
      setLabCaptions(res.variants || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim te caption lab.');
    } finally {
      setLabLoading(false);
    }
  };

  const applyLab = (caption: string, hashtags: string[]) => {
    try {
      sessionStorage.setItem(
        'albnet_studio_draft',
        JSON.stringify({ caption, hashtags: hashtags.join(', ') })
      );
    } catch { /* ignore */ }
    toast.success('Caption u ruajt – hap Reel');
    router.push('/krijo/reel');
  };

  return (
    <div className="app-page app-page--studio">
      <header className="app-page-head">
        <h1>Studio</h1>
      </header>

      {loading && !data ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : error && !data ? (
        <div className="auth-card p-6 text-center space-y-3">
          <p className="text-[14px] text-[var(--text)]">{error}</p>
          <button type="button" onClick={() => void load()} className="auth-btn">Provo sërish</button>
        </div>
      ) : data ? (
        <div className="space-y-5">
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="auth-card p-5 flex items-center gap-4"
          >
            <ScoreRing score={data.insights.score} />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide font-semibold text-[var(--text-muted)]">Niveli yt</p>
              <p className="text-[18px] font-bold text-[var(--text)]">{data.insights.level}</p>
              <p className="text-[13px] text-[var(--text-muted)] mt-1">{data.insights.nextAction}</p>
              <p className="text-[12px] text-[var(--text)] mt-2">
                {data.insights.total} postime · {data.insights.videoRatio}% video · {data.insights.avgLikes} pëlqime mesatare
              </p>
            </div>
          </motion.section>

          <div className="grid grid-cols-2 gap-2">
            {data.windows.slice(0, 2).map((w) => (
              <div key={w.label} className="liquid-glass-card p-3">
                <p className="text-[11px] text-[var(--text-muted)]">{w.label}</p>
                <p className="text-[14px] font-bold text-[var(--text)] mt-0.5">{w.hours}</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2">{w.why}</p>
              </div>
            ))}
          </div>

          {data.cultural?.[0] && (
            <div className="rounded-2xl px-4 py-3 bg-[var(--albanian-soft)] border border-[var(--border)]">
              <p className="text-[12px] font-semibold text-[var(--text)]">🇦🇱 {data.cultural[0].title}</p>
              {data.cultural[0].hook && (
                <p className="text-[13px] text-[var(--text-muted)] mt-1">{data.cultural[0].hook}</p>
              )}
            </div>
          )}

          {data.trendingHashtags?.length > 0 && (
            <section>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">Trending tani</p>
              <div className="flex flex-wrap gap-1.5">
                {data.trendingHashtags.map((t) => (
                  <Link
                    key={t.tag}
                    href={`/explore/hashtag/${encodeURIComponent(t.tag)}`}
                    className="text-[12px] px-3 py-1.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text)]"
                  >
                    #{t.tag} <span className="text-[var(--text-muted)]">{t.count}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Nisha</p>
              <button type="button" onClick={() => void load(niche || undefined)} className="text-[12px] font-semibold text-[var(--ig-blue)]">
                Rifresko
              </button>
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
              <button
                type="button"
                onClick={() => setNiche('')}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap ${
                  !niche ? 'bg-[var(--text)] text-[var(--bg-card)]' : 'border border-[var(--border)] text-[var(--text)]'
                }`}
              >
                Për ty
              </button>
              {data.niches.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setNiche(n.id)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap ${
                    niche === n.id ? 'bg-[var(--text)] text-[var(--bg-card)]' : 'border border-[var(--border)] text-[var(--text)]'
                  }`}
                >
                  {n.emoji} {n.label}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Ide për video</p>
            {data.ideas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                expanded={openIdea === idea.id}
                onToggle={() => setOpenIdea((id) => (id === idea.id ? null : idea.id))}
                onUse={useIdea}
              />
            ))}
          </section>

          <section className="auth-card p-5 space-y-3">
            <div>
              <p className="text-[15px] font-semibold text-[var(--text)]">Caption Lab</p>
              <p className="text-[12px] text-[var(--text-muted)]">Shkruaj një draft – mer 3 versione gati për postim</p>
            </div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              maxLength={500}
              className="auth-input resize-none"
              placeholder="P.sh. sot gatova byrek me nënën…"
            />
            <div className="flex gap-1.5 flex-wrap">
              {([
                ['viral', 'Viral'],
                ['emotional', 'Emocional'],
                ['funny', 'Humor'],
                ['professional', 'Pro'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTone(id)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold ${
                    tone === id ? 'bg-[var(--text)] text-[var(--bg-card)]' : 'border border-[var(--border)] text-[var(--text)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => void runCaptionLab()} disabled={labLoading} className="auth-btn">
              {labLoading ? 'Duke rishkruar…' : 'Rishkruaj caption'}
            </button>
            {labCaptions.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => applyLab(v.caption, v.hashtags)}
                className="w-full text-left p-3 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]"
              >
                <p className="text-[13px] text-[var(--text)] whitespace-pre-line">{v.caption}</p>
                <p className="text-[11px] text-[var(--ig-blue)] mt-2 font-semibold">Përdor te Reel</p>
              </button>
            ))}
          </section>

          <section>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">Kalendari 7 ditë</p>
            <div className="space-y-2">
              {data.calendar.map((day: CalendarDay) => (
                <div key={day.date} className="flex gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]">
                  <div className="w-14 flex-shrink-0">
                    <p className="text-[11px] text-[var(--text-muted)] uppercase">{day.weekday}</p>
                    <p className="text-[13px] font-bold text-[var(--text)]">{day.label}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--text)] line-clamp-2">{day.idea?.title}</p>
                    {day.moment && (
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">🇦🇱 {day.moment.title}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Link
            href="/krijo/reel"
            className="block text-center auth-btn py-3.5"
            style={{ background: 'var(--albanian-red)' }}
          >
            Krijo Reel tani
          </Link>
        </div>
      ) : null}
    </div>
  );
}
