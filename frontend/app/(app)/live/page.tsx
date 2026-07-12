'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { useAuthReady } from '@/hooks/useAuthReady';

type Live = {
  _id: string;
  title: string;
  viewers: string[];
  startedAt: string;
  user: { _id: string; username: string; avatar?: string; fullName?: string; isVerified?: boolean };
};

export default function LiveListPage() {
  const { ready, isAuthenticated } = useAuthReady();
  const router = useRouter();
  const [lives, setLives] = useState<Live[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      router.replace('/kycu');
      return;
    }
    (async () => {
      try {
        const res = await api<{ lives: Live[] }>('/api/live');
        setLives(res.lives || []);
      } catch (_) {
        setLives([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, isAuthenticated, router]);

  return (
    <div className="mobile-page max-w-[470px] mx-auto min-h-0 flex-1 py-4 px-4 pb-6">
      <div className="flex items-center justify-between mb-5 sticky top-0 ig-page-header z-10 py-3 -mx-1 px-1">
        <h1 className="text-[20px] font-semibold">Live</h1>
        <Link href="/live/nis" className="px-4 py-2.5 rounded-xl bg-[var(--danger)] text-white text-[14px] font-semibold shadow-sm">
          + Nis Live
        </Link>
      </div>

      {loading ? (
        <p className="text-[var(--text-muted)]">Duke ngarkuar...</p>
      ) : lives.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[15px] font-semibold">Nuk ka transmetime aktive</p>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">Bëhu i pari që nis live!</p>
          <Link href="/live/nis" className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-[var(--ig-blue)] text-white font-semibold text-[14px]">
            Nis transmetim
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {lives.map((live) => (
            <Link
              key={live._id}
              href={`/live/${live._id}`}
              className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg)]"
            >
              <div className="relative">
                <img
                  src={live.user?.avatar || ''}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + live.user?.username;
                  }}
                />
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[var(--danger)] text-white">LIVE</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[14px] truncate">{live.user?.username}</p>
                <p className="text-[13px] text-[var(--text-muted)] truncate">{live.title}</p>
                <p className="text-[12px] text-[var(--text-muted)]">{live.viewers?.length || 0} shikues</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
