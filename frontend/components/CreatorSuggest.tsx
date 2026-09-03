'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { useToastStore } from '@/store/useToastStore';
import type { CaptionVariant, CreatorIdea, SuggestResponse } from '@/lib/creatorStudio';

type Props = {
  caption: string;
  type: 'reel' | 'video' | 'image';
  onApplyCaption: (caption: string) => void;
  onApplyHashtags: (hashtags: string) => void;
};

function ViralityBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-400' : 'bg-[var(--primary)]';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="text-[11px] font-semibold tabular-nums text-[var(--text)]">{value}</span>
    </div>
  );
}

export function CreatorSuggest({ caption, type, onApplyCaption, onApplyHashtags }: Props) {
  const toast = useToastStore();
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SuggestResponse | null>(null);
  const [error, setError] = useState('');
  const [activeIdea, setActiveIdea] = useState<string | null>(null);
  const [mood, setMood] = useState<'viral' | 'emotional' | 'funny' | 'professional'>('viral');

  const load = useCallback(async (opts?: { enhance?: boolean }) => {
    setLoading(true);
    setError('');
    try {
      const res = await api<SuggestResponse>('/api/creator/suggest', {
        method: 'POST',
        body: {
          caption,
          type,
          mood,
          enhance: opts?.enhance !== false,
        },
        timeout: 20000,
      });
      setData(res);
      setActiveIdea(res.ideas?.[0]?.id || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nuk u ngarkuan sugjerimet.');
    } finally {
      setLoading(false);
    }
  }, [caption, type, mood]);

  useEffect(() => {
    void load({ enhance: false });
    // load once on mount + when type/mood changes; caption is applied manually
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, mood]);

  const applyIdea = (idea: CreatorIdea) => {
    onApplyCaption(idea.caption);
    onApplyHashtags(idea.hashtags.join(', '));
    toast.success('U aplikua ideja – caption + hashtag');
  };

  const applyCaption = (v: CaptionVariant) => {
    onApplyCaption(v.caption);
    onApplyHashtags((v.hashtags || []).join(', '));
    toast.success('Caption u vendos');
  };

  const applyTags = (tags: string[]) => {
    onApplyHashtags(tags.join(', '));
    toast.info('Hashtag-et u vendosën');
  };

  const idea = data?.ideas?.find((i) => i.id === activeIdea) || data?.ideas?.[0];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <span className="w-9 h-9 rounded-full bg-[var(--ig-gradient)] text-white flex items-center justify-center text-[15px] flex-shrink-0">
          ✦
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[var(--text)]">Studio krijuesi</p>
          <p className="text-[12px] text-[var(--text-muted)] truncate">
            {data?.source === 'ai' ? 'Ide të personalizuara me AI' : 'Ide, hook, caption dhe koha më e mirë për video'}
          </p>
        </div>
        <span className="text-[var(--text-muted)] text-sm">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-[var(--border)] pt-3">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {([
              ['viral', 'Viral'],
              ['emotional', 'Emocional'],
              ['funny', 'Humor'],
              ['professional', 'Pro'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMood(id)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors ${
                  mood === id
                    ? 'bg-[var(--text)] text-[var(--bg-card)]'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load({ enhance: true })}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white"
              style={{ background: 'var(--ig-gradient)' }}
            >
              {loading ? 'Duke krijuar ide…' : caption.trim() ? 'Sugjero nga drafti im' : 'Merr ide për video'}
            </button>
            <Link
              href="/studio"
              className="px-3 py-2.5 rounded-xl border border-[var(--border)] text-[12px] font-semibold text-[var(--text)] flex items-center"
            >
              Studio
            </Link>
          </div>

          {error && <p className="text-[12px] text-[var(--danger)]">{error}</p>}

          {data?.cultural && (
            <p className="text-[12px] text-[var(--text-muted)] bg-[var(--albanian-soft)] rounded-xl px-3 py-2">
              🇦🇱 Momenti i javës: <span className="font-semibold text-[var(--text)]">{data.cultural.title}</span>
              {data.cultural.hook ? ` — ${data.cultural.hook}` : ''}
            </p>
          )}

          {data?.postingWindow && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
              <span className="text-lg leading-none">⏱</span>
              <div>
                <p className="text-[13px] font-semibold text-[var(--text)]">
                  Posto {data.postingWindow.hours}
                </p>
                <p className="text-[12px] text-[var(--text-muted)]">{data.postingWindow.why}</p>
              </div>
            </div>
          )}

          {data?.ideas?.length ? (
            <div className="space-y-2">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Ide për video</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {data.ideas.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveIdea(item.id)}
                    className={`flex-shrink-0 w-[200px] text-left p-3 rounded-xl border transition-colors ${
                      activeIdea === item.id
                        ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
                        : 'border-[var(--border)] bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <p className="text-[11px] text-[var(--text-muted)] mb-1">{item.nicheLabel} · {item.durationSec}s</p>
                    <p className="text-[13px] font-semibold text-[var(--text)] line-clamp-2">{item.title}</p>
                    <div className="mt-2"><ViralityBar value={item.virality} /></div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {idea && (
            <div className="space-y-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-bold text-[var(--text)]">{idea.title}</p>
                  <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{idea.formatLabel} · {idea.difficulty} · {idea.shots} kënde</p>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[var(--primary-soft)] text-[var(--primary)]">
                  {idea.virality}
                </span>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[var(--text-muted)] mb-1">HOOK (0–3s)</p>
                <p className="text-[14px] font-medium text-[var(--text)]">“{idea.hook}”</p>
              </div>
              <ol className="space-y-1">
                {idea.script.map((beat) => (
                  <li key={beat.t} className="text-[12px] text-[var(--text)] flex gap-2">
                    <span className="font-semibold text-[var(--primary)] w-12 flex-shrink-0">{beat.t}</span>
                    <span>{beat.action}</span>
                  </li>
                ))}
              </ol>
              <p className="text-[12px] text-[var(--text-muted)]">{idea.why}</p>
              <p className="text-[12px]">
                ♪ Muzikë: <span className="font-semibold text-[var(--text)]">{idea.musicVibe}</span>
                <span className="text-[var(--text-muted)]"> · CTA: {idea.cta}</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {idea.hashtags.map((t) => (
                  <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]">
                    #{t}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => applyIdea(idea)}
                  className="flex-1 py-2 rounded-lg text-[13px] font-semibold bg-[var(--ig-blue)] text-white"
                >
                  Përdor këtë ide
                </button>
                <button
                  type="button"
                  onClick={() => applyTags(idea.hashtags)}
                  className="px-3 py-2 rounded-lg text-[12px] font-semibold border border-[var(--border)] text-[var(--text)]"
                >
                  Vetëm # 
                </button>
              </div>
            </div>
          )}

          {data?.captions?.length ? (
            <div className="space-y-2">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Caption të gatshme</p>
              {data.captions.slice(0, 3).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => applyCaption(v)}
                  className="w-full text-left p-3 rounded-xl border border-[var(--border)] hover:border-[var(--primary)] transition-colors"
                >
                  <p className="text-[13px] text-[var(--text)] whitespace-pre-line line-clamp-4">{v.caption}</p>
                  <p className="text-[11px] text-[var(--ig-blue)] mt-2 font-semibold">Apliko caption</p>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
