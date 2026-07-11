'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const EVENTS = [
  { id: 1, title: 'Festivali i Diasporës', date: '15 Korrik', location: 'Zürich', emoji: '🎉' },
  { id: 2, title: 'Netët e Kulturës Shqiptare', date: '22 Korrik', location: 'Tiranë', emoji: '🎭' },
  { id: 3, title: 'AlbNet Live Meetup', date: '1 Gusht', location: 'Online', emoji: '📡' },
  { id: 4, title: 'Dita e Flamurit', date: '28 Nëntor', location: 'Kudo', emoji: '🇦🇱' },
];

const CREATORS = [
  { username: 'albnet_official', name: 'AlbNet', verified: true, followers: '12.5K' },
  { username: 'diaspora_shqip', name: 'Diaspora Shqip', verified: true, followers: '8.2K' },
  { username: 'kultura_shqiptare', name: 'Kultura Shqiptare', verified: false, followers: '5.1K' },
];

type Hashtag = { tag: string; count: number };

export default function KomunitetiPage() {
  useDocumentTitle('Komuniteti');
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);

  useEffect(() => {
    api<{ hashtags: Hashtag[] }>('/api/explore/hashtag-trending')
      .then((r) => setHashtags(r.hashtags || []))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-[630px] mx-auto px-4 py-6 pb-24 md:pb-6">
      <h1 className="text-[22px] font-bold text-[var(--text)] mb-1">Komuniteti Shqiptar</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-6">
        Ngjarje, krijues, hashtag-e dhe lidhje me diasporën.
      </p>

      {/* Events */}
      <section className="mb-8">
        <h2 className="text-[15px] font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <span>📅</span> Ngjarje & Evente
        </h2>
        <div className="space-y-2">
          {EVENTS.map((e) => (
            <div key={e.id} className="community-event-card">
              <span className="text-2xl">{e.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[var(--text)] truncate">{e.title}</p>
                <p className="text-[12px] text-[var(--text-muted)]">{e.date} · {e.location}</p>
              </div>
              <button type="button" className="text-[12px] font-semibold text-[var(--ig-blue)] shrink-0">
                Interesohem
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Trending */}
      {hashtags.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[15px] font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
            <span>🔥</span> Trending Shqip
          </h2>
          <div className="flex flex-wrap gap-2">
            {hashtags.map((h) => (
              <Link key={h.tag} href={`/explore/hashtag/${h.tag}`} className="trend-pill">
                #{h.tag} <span className="text-[var(--text-muted)] font-normal ml-1">{h.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Creators */}
      <section className="mb-8">
        <h2 className="text-[15px] font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <span>⭐</span> Krijues të Verifikuar
        </h2>
        <div className="space-y-2">
          {CREATORS.map((c) => (
            <Link key={c.username} href={`/profili/${c.username}`} className="creator-row">
              <div className="w-10 h-10 rounded-full bg-[var(--albanian-gradient)] flex items-center justify-center text-white font-bold text-sm">
                {c.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[var(--text)] flex items-center gap-1">
                  {c.name}
                  {c.verified && <VerifiedBadge />}
                </p>
                <p className="text-[12px] text-[var(--text-muted)]">@{c.username} · {c.followers} ndjekës</p>
              </div>
              <span className="text-[12px] font-semibold text-[var(--ig-blue)]">Ndiq</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Diaspora map placeholder */}
      <section className="albanian-card p-5 mb-8">
        <h2 className="text-[15px] font-bold text-[var(--text)] mb-2 flex items-center gap-2">
          <span>🦅</span> Diaspora & Atdhe
        </h2>
        <p className="text-[13px] text-[var(--text-muted)] leading-relaxed mb-4">
          Shqiptarë aktivë në më shumë se 50 vende. Lidhu me komunitetin tënd lokal ose global.
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { flag: '🇦🇱', label: 'Shqipëri', count: '2.8M' },
            { flag: '🇽🇰', label: 'Kosovë', count: '1.9M' },
            { flag: '🌍', label: 'Diaspora', count: '2M+' },
          ].map((r) => (
            <div key={r.label} className="liquid-glass rounded-xl p-3">
              <span className="text-xl">{r.flag}</span>
              <p className="text-[11px] font-semibold text-[var(--text)] mt-1">{r.label}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{r.count}</p>
            </div>
          ))}
        </div>
        <Link href="/chat-global" className="mt-4 block text-center py-2.5 rounded-lg text-[13px] font-semibold text-white" style={{ background: 'var(--albanian-red)' }}>
          Hyr në Chat Global
        </Link>
      </section>

      <Link href="/shkarko" className="install-cta-card block">
        <span className="text-2xl">📲</span>
        <div>
          <p className="text-[14px] font-semibold text-[var(--text)]">Shkarko AlbNet</p>
          <p className="text-[12px] text-[var(--text-muted)]">iOS · Android · Mac · Windows</p>
        </div>
        <span className="text-[var(--text-muted)]">→</span>
      </Link>
    </div>
  );
}

function VerifiedBadge() {
  return (
    <span className="verified-badge" title="Krijues i verifikuar">
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="var(--ig-blue)">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="var(--ig-blue)" strokeWidth="2" fill="none" />
        <circle cx="12" cy="12" r="10" stroke="var(--ig-blue)" strokeWidth="2" fill="var(--ig-blue)" fillOpacity="0.15" />
        <path d="M8.5 12.5l2 2 5-5" stroke="var(--ig-blue)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    </span>
  );
}
