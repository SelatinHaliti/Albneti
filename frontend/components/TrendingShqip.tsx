'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';

type Hashtag = { tag: string; count: number };

export function TrendingShqip() {
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);

  useEffect(() => {
    api<{ hashtags: Hashtag[] }>('/api/explore/hashtag-trending')
      .then((r) => setHashtags((r.hashtags || []).slice(0, 8)))
      .catch(() => setHashtags([]));
  }, []);

  if (hashtags.length === 0) return null;

  return (
    <div className="border-b border-[var(--border)] py-3">
      <div className="flex items-center gap-2 px-4 mb-2.5">
        <span className="albanian-badge">🇦🇱 Trending</span>
        <span className="text-[13px] font-semibold text-[var(--text-muted)]">në Shqip</span>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-1">
        {hashtags.map((h) => (
          <Link key={h.tag} href={`/explore/hashtag/${h.tag}`} className="trend-pill">
            #{h.tag}
          </Link>
        ))}
        <Link href="/explore" className="trend-pill text-[var(--link)] border-[var(--link)]/30">
          Eksploro →
        </Link>
      </div>
    </div>
  );
}
