'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/utils/api';
import { useSocket } from '@/components/SocketProvider';

const PROVERBS = [
  'Shqiptari nuk harron mikun e vet.',
  'Ku ka shqiptarë, aty ka shqip.',
  'Bukuria vjen nga zemra, jo nga fasada.',
  'Miqësia është pasuria më e madhe.',
  'Bashkë jemi më të fortë.',
  'Gjuha shqipe është thesari ynë.',
];

type Hashtag = { tag: string; count: number };

export function AlbanianPulse() {
  const { socket } = useSocket();
  const [onlineCount, setOnlineCount] = useState(0);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [proverbIndex, setProverbIndex] = useState(() => new Date().getDate() % PROVERBS.length);
  const proverb = PROVERBS[proverbIndex];

  useEffect(() => {
    api<{ hashtags: Hashtag[] }>('/api/explore/hashtag-trending')
      .then((r) => setHashtags((r.hashtags || []).slice(0, 4)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onCount = (data: { count: number }) => setOnlineCount(data.count ?? 0);
    socket.on('global_chat_online_count', onCount);
    return () => { socket.off('global_chat_online_count', onCount); };
  }, [socket]);

  useEffect(() => {
    const id = setInterval(() => {
      setProverbIndex((i) => (i + 1) % PROVERBS.length);
    }, 12000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4 mb-6">
      {/* Chat Global Live */}
      <Link href="/chat-global" className="albanian-card block p-4 hover:opacity-90 transition-opacity">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--albanian-soft)] flex items-center justify-center text-lg">🌍</div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-[var(--text)]">Chat Global Shqiptar</p>
            <p className="text-[12px] text-[var(--text-muted)] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse-live" />
              {onlineCount > 0 ? `${onlineCount} shqiptarë online` : 'Bashkohu tani'}
            </p>
          </div>
          <span className="text-[var(--text-muted)]">→</span>
        </div>
      </Link>

      {/* Diaspora */}
      <div className="liquid-glass rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🦅</span>
          <div>
            <p className="text-[13px] font-bold text-[var(--text)]">Diaspora & Atdhe</p>
            <p className="text-[12px] text-[var(--text-muted)] mt-1 leading-relaxed">
              Lidhu me shqiptarët në Shqipëri, Kosovë, Maqedoni dhe kudo në botë.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {['Shqipëri', 'Kosovë', 'Diaspora', 'Shqip'].map((tag) => (
                <Link
                  key={tag}
                  href={`/explore/hashtag/${encodeURIComponent(tag.toLowerCase())}`}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--albanian-soft)] text-[var(--albanian-red)] hover:opacity-80"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trending hashtags */}
      {hashtags.length > 0 && (
        <div>
          <p className="text-[14px] font-semibold text-[var(--text-muted)] mb-2.5"># Trending Shqip</p>
          <div className="space-y-2">
            {hashtags.map((h, i) => (
              <Link
                key={h.tag}
                href={`/explore/hashtag/${h.tag}`}
                className="flex items-center justify-between py-1.5 hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[13px] font-bold text-[var(--text-secondary)] w-4">{i + 1}</span>
                  <span className="text-[14px] font-semibold text-[var(--text)]">#{h.tag}</span>
                </div>
                <span className="text-[12px] text-[var(--text-muted)]">{h.count} postime</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Proverb of the day – cycles with subtle motion */}
      <div className="rounded-2xl p-4 border border-[var(--border)] bg-[var(--bg-elevated)] overflow-hidden min-h-[88px]">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--albanian-red)] mb-1.5">Fjalë Shqipe</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={proverb}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="text-[13px] text-[var(--text)] italic leading-relaxed"
          >
            &ldquo;{proverb}&rdquo;
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
