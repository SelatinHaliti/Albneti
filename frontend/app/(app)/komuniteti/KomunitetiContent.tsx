'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useToastStore } from '@/store/useToastStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type CommunityEvent = {
  _id: string;
  slug: string;
  title: string;
  description: string;
  shortDate: string;
  startAt: string;
  location: string;
  city: string;
  emoji: string;
  category: string;
  isOnline: boolean;
  featured: boolean;
  interestedCount: number;
  isInterested: boolean;
  status: 'upcoming' | 'live' | 'past';
  daysUntil: number;
};

type Hashtag = { tag: string; count: number };

const CATEGORY_LABELS: Record<string, string> = {
  diaspora: 'Diaspora',
  online: 'Online',
  kulture: 'Kulturë',
  muzike: 'Muzikë',
  fest: 'Festa',
  sport: 'Sport',
  biznes: 'Biznes',
  krijues: 'Krijues',
  festival: 'Festival',
};

const CREATORS_FALLBACK = [
  { username: 'albnet_official', name: 'AlbNet', verified: true, followers: 0 },
];

export default function KomunitetiContent() {
  useDocumentTitle('Komuniteti');
  const user = useAuthStore((s) => s.user);
  const toast = useToastStore((s) => s.success);
  const toastError = useToastStore((s) => s.error);
  const searchParams = useSearchParams();

  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [creators, setCreators] = useState<{ username: string; name: string; verified: boolean; followers: number }[]>(CREATORS_FALLBACK);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [tab, setTab] = useState<'upcoming' | 'mine'>('upcoming');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CommunityEvent | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [myCount, setMyCount] = useState(0);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ filter: tab });
    if (category !== 'all') params.set('category', category);
    if (search.trim()) params.set('q', search.trim());
    try {
      const res = await api<{
        events: CommunityEvent[];
        myInterestedCount: number;
        categories: { id: string; label: string }[];
      }>(`/api/community/events?${params}`);
      setEvents(res.events || []);
      setMyCount(res.myInterestedCount || 0);
      if (res.categories?.length) setCategories(res.categories);
    } catch {
      setEvents([]);
      toastError('Nuk u ngarkuan eventet.');
    } finally {
      setLoading(false);
    }
  }, [tab, category, search, toastError]);

  useEffect(() => {
    const t = setTimeout(loadEvents, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [loadEvents, search]);

  useEffect(() => {
    api<{ hashtags: Hashtag[] }>('/api/explore/hashtag-trending')
      .then((r) => setHashtags(r.hashtags || []))
      .catch(() => {});
    api<{ creators: { username: string; name: string; verified: boolean; followers: number }[] }>('/api/verification/creators')
      .then((r) => { if (r.creators?.length) setCreators(r.creators); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const slug = searchParams.get('event');
    if (!slug || events.length === 0) return;
    const match = events.find((e) => e.slug === slug);
    if (match) setSelected(match);
  }, [searchParams, events]);

  const handleInterest = async (ev: CommunityEvent) => {
    if (!user) {
      toastError('Kyçu për t\'u regjistruar në evente.');
      return;
    }
    setTogglingId(ev._id);
    try {
      const res = await api<{
        interested: boolean;
        interestedCount: number;
        event: CommunityEvent;
      }>(`/api/community/events/${ev._id}/interesohem`, { method: 'POST' });
      setEvents((list) =>
        list.map((e) =>
          e._id === ev._id
            ? { ...e, isInterested: res.interested, interestedCount: res.interestedCount }
            : e
        )
      );
      if (selected?._id === ev._id) {
        setSelected((s) => s ? { ...s, isInterested: res.interested, interestedCount: res.interestedCount } : s);
      }
      setMyCount((c) => (res.interested ? c + 1 : Math.max(0, c - 1)));
      toast(
        res.interested
          ? `U regjistruat! Do të njoftohesh për "${ev.title}".`
          : 'U ç\'regjistruat nga eventi.'
      );
    } catch (e) {
      toastError(e instanceof Error ? e.message : 'Gabim. Provo përsëri.');
    } finally {
      setTogglingId(null);
    }
  };

  const featured = events.filter((e) => e.featured && e.status !== 'past').slice(0, 3);

  return (
    <div className="mobile-page max-w-[630px] mx-auto py-6 pb-4 overflow-x-hidden">
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[var(--text)] mb-1">Komuniteti Shqiptar</h1>
        <p className="text-[13px] text-[var(--text-muted)]">
          Ngjarje, diaspora, krijues dhe lidhje me shqiptarët kudo.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { val: String(events.length), label: 'Evente', icon: '📅' },
          { val: String(myCount), label: 'Të miat', icon: '✅' },
          { val: '50+', label: 'Vende', icon: '🌍' },
        ].map((s) => (
          <div key={s.label} className="community-stat-pill">
            <span>{s.icon}</span>
            <p className="text-[16px] font-bold text-[var(--text)]">{s.val}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Featured carousel */}
      {featured.length > 0 && (
        <section className="mb-6">
          <h2 className="text-[13px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">⭐ Në fokus</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {featured.map((e) => (
              <button
                key={e._id}
                type="button"
                onClick={() => setSelected(e)}
                className="community-featured-card flex-shrink-0 w-[260px] text-left"
              >
                <span className="text-3xl">{e.emoji}</span>
                <p className="text-[14px] font-bold text-[var(--text)] mt-2 line-clamp-2">{e.title}</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">{e.shortDate}</p>
                {e.status === 'live' && <span className="community-live-badge mt-2">LIVE</span>}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Events section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold text-[var(--text)] flex items-center gap-2">
            <span>📅</span> Ngjarje & Evente
          </h2>
          <Link href="/njoftime" className="text-[12px] font-semibold text-[var(--ig-blue)]">
            Njoftimet →
          </Link>
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Kërko evente, qytete..."
          className="auth-input w-full mb-3 text-[13px]"
        />

        <div className="flex gap-2 mb-3">
          {[
            { id: 'upcoming' as const, label: 'Së shpejti' },
            { id: 'mine' as const, label: `Të miat${myCount ? ` (${myCount})` : ''}` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-full text-[12px] font-semibold ${
                tab === t.id ? 'bg-[var(--text)] text-[var(--bg)]' : 'glass-card text-[var(--text-muted)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
          <button
            type="button"
            onClick={() => setCategory('all')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap ${
              category === 'all' ? 'bg-[var(--albanian-red)] text-white' : 'border border-[var(--border)] text-[var(--text-muted)]'
            }`}
          >
            Të gjitha
          </button>
          {categories.filter((c) => c.id !== 'all').map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap ${
                category === cat.id ? 'bg-[var(--albanian-red)] text-white' : 'border border-[var(--border)] text-[var(--text-muted)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="community-event-card animate-pulse h-[72px]" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
            <p className="text-[14px] text-[var(--text-muted)]">
              {tab === 'mine' ? 'Nuk je regjistruar në asnjë event ende.' : 'Nuk u gjet asnjë event.'}
            </p>
            {tab === 'mine' && (
              <button type="button" onClick={() => setTab('upcoming')} className="mt-3 text-[13px] font-semibold text-[var(--ig-blue)]">
                Shiko eventet →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((e) => (
              <EventCard
                key={e._id}
                event={e}
                toggling={togglingId === e._id}
                onOpen={() => setSelected(e)}
                onInterest={() => handleInterest(e)}
              />
            ))}
          </div>
        )}
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
          {creators.map((c) => (
            <Link key={c.username} href={`/profili/${c.username}`} className="creator-row liquid-glass-card">
              <div className="w-10 h-10 rounded-full bg-[var(--albanian-gradient)] flex items-center justify-center text-white font-bold text-sm">
                {c.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-[var(--text)] flex items-center gap-1">
                  {c.name}
                  {c.verified && <VerifiedBadge />}
                </p>
                <p className="text-[12px] text-[var(--text-muted)]">
                  @{c.username} · {c.followers >= 1000 ? `${(c.followers / 1000).toFixed(1)}K` : c.followers} ndjekës
                </p>
              </div>
              <span className="text-[12px] font-semibold text-[var(--ig-blue)]">Ndiq</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Diaspora */}
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

      {/* Event detail modal */}
      <AnimatePresence>
        {selected && (
          <EventModal
            event={selected}
            toggling={togglingId === selected._id}
            onClose={() => setSelected(null)}
            onInterest={() => handleInterest(selected)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function EventCard({
  event: e,
  toggling,
  onOpen,
  onInterest,
}: {
  event: CommunityEvent;
  toggling: boolean;
  onOpen: () => void;
  onInterest: () => void;
}) {
  return (
    <div className={`community-event-card ${e.isInterested ? 'community-event-card-active' : ''}`}>
      <button type="button" onClick={onOpen} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="community-event-emoji">{e.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-semibold text-[var(--text)] truncate">{e.title}</p>
            {e.status === 'live' && <span className="community-live-badge">LIVE</span>}
            {e.isOnline && <span className="community-online-badge">Online</span>}
          </div>
          <p className="text-[12px] text-[var(--text-muted)]">{e.shortDate} · {e.location}</p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            {CATEGORY_LABELS[e.category] || e.category}
            {e.daysUntil > 0 && e.status === 'upcoming' && ` · për ${e.daysUntil} ditë`}
            {e.interestedCount > 0 && ` · ${e.interestedCount} të interesuar`}
          </p>
        </div>
      </button>
      <button
        type="button"
        disabled={toggling}
        onClick={(ev) => { ev.stopPropagation(); onInterest(); }}
        className={`community-interest-btn ${e.isInterested ? 'community-interest-btn-active' : ''}`}
      >
        {toggling ? '...' : e.isInterested ? '✓ Regjistruar' : 'Interesohem'}
      </button>
    </div>
  );
}

function EventModal({
  event: e,
  toggling,
  onClose,
  onInterest,
}: {
  event: CommunityEvent;
  toggling: boolean;
  onClose: () => void;
  onInterest: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center ig-modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        className="w-full max-w-[420px] liquid-glass-strong rounded-t-3xl sm:rounded-3xl p-6 pb-8 safe-area-pb max-h-[85vh] overflow-y-auto"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-[var(--border)] mx-auto mb-4 sm:hidden" />
        <div className="flex items-start gap-4 mb-4">
          <span className="text-4xl">{e.emoji}</span>
          <div>
            <h3 className="text-[18px] font-bold text-[var(--text)] leading-tight">{e.title}</h3>
            <p className="text-[13px] text-[var(--text-muted)] mt-1">{e.shortDate}</p>
            <p className="text-[13px] text-[var(--text)] mt-1">📍 {e.location}</p>
          </div>
        </div>
        {e.description && (
          <p className="text-[14px] text-[var(--text)] leading-relaxed mb-4">{e.description}</p>
        )}
        <div className="flex flex-wrap gap-2 mb-5">
          <span className="community-tag">{CATEGORY_LABELS[e.category] || e.category}</span>
          {e.isOnline && <span className="community-tag">📡 Online</span>}
          {e.interestedCount > 0 && <span className="community-tag">👥 {e.interestedCount} të interesuar</span>}
          {e.daysUntil > 0 && <span className="community-tag">⏳ {e.daysUntil} ditë</span>}
        </div>
        <p className="text-[12px] text-[var(--text-muted)] mb-4">
          Duke u regjistruar, merr njoftim në AlbNet para fillimit të eventit.
        </p>
        <button
          type="button"
          disabled={toggling}
          onClick={onInterest}
          className={`w-full py-3.5 rounded-xl font-semibold text-[14px] transition-colors ${
            e.isInterested
              ? 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]'
              : 'text-white'
          }`}
          style={e.isInterested ? undefined : { background: 'var(--albanian-red)' }}
        >
          {toggling ? 'Duke procesuar...' : e.isInterested ? '✓ I regjistruar – Kliko për të hequr' : '🔔 Interesohem & Njofto mua'}
        </button>
        <button type="button" onClick={onClose} className="w-full mt-2 py-3 text-[14px] font-semibold text-[var(--text-muted)]">
          Mbyll
        </button>
      </motion.div>
    </div>
  );
}

function VerifiedBadge() {
  return (
    <span className="verified-badge" title="Krijues i verifikuar">
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="var(--ig-blue)">
        <circle cx="12" cy="12" r="10" stroke="var(--ig-blue)" strokeWidth="2" fill="var(--ig-blue)" fillOpacity="0.15" />
        <path d="M8.5 12.5l2 2 5-5" stroke="var(--ig-blue)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    </span>
  );
}
