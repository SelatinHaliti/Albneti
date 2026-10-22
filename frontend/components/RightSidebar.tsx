'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useToastStore } from '@/store/useToastStore';
import { AlbanianPulse } from '@/components/AlbanianPulse';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { publicHandle } from '@/lib/publicName';

type SuggestedUser = {
  _id: string;
  username: string;
  avatar?: string;
  fullName?: string;
  reason?: string;
  reasons?: string[];
  isVerified?: boolean;
  isFollowing?: boolean;
};

export function RightSidebar() {
  const user = useAuthStore((s) => s.user);
  const toastSuccess = useToastStore((s) => s.success);
  const toastError = useToastStore((s) => s.error);
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    api<{ suggestions: SuggestedUser[] }>('/api/explore/sugjerime?limit=5')
      .then((r) => setSuggestions(r.suggestions || []))
      .catch(() => setSuggestions([]));
  }, []);

  const followUser = useCallback(
    async (target: SuggestedUser) => {
      if (followingIds.has(target._id)) return;
      setFollowingIds((prev) => new Set(prev).add(target._id));
      try {
        await api(`/api/users/${target._id}/ndiq`, { method: 'POST' });
        toastSuccess(`Po ndiqni @${target.username}`);
        setSuggestions((prev) => prev.filter((s) => s._id !== target._id));
      } catch (err) {
        setFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(target._id);
          return next;
        });
        toastError(err instanceof Error ? err.message : 'Nuk u ndoq.');
      }
    },
    [followingIds, toastSuccess, toastError]
  );

  if (!user) return null;

  return (
    <aside className="ig-side scrollbar-hide">
      <div className="flex items-center gap-3">
        <Link href={`/profili/${user.username}`}>
          <img
            src={user.avatar || ''}
            alt=""
            className="w-11 h-11 rounded-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.username; }}
          />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profili/${user.username}`} className="text-[14px] font-semibold text-[var(--text)] truncate block">
            {publicHandle(user.username)}
          </Link>
          <p className="text-[14px] text-[var(--text-muted)] truncate">{user.fullName && !user.fullName.includes('@') ? user.fullName : publicHandle(user.username)}</p>
        </div>
        <Link href="/profili/redakto" className="text-[12px] font-semibold text-[var(--primary)]">
          Ndërro
        </Link>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-semibold text-[var(--text-muted)]">Sugjerime për ty</span>
            <Link href="/kerko" className="text-[12px] font-semibold text-[var(--text)]">Shiko të gjitha</Link>
          </div>
          <div className="space-y-3">
            {suggestions.map((s) => {
              const busy = followingIds.has(s._id);
              return (
                <div key={s._id} className="flex items-center gap-3">
                  <Link href={`/profili/${s.username}`}>
                    <img
                      src={s.avatar || ''}
                      alt=""
                      className="w-11 h-11 rounded-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + s.username; }}
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profili/${s.username}`} className="text-[14px] font-semibold text-[var(--text)] truncate block hover:opacity-80">
                      {publicHandle(s.username)}
                      {s.isVerified ? <VerifiedBadge size={13} className="ml-1" /> : null}
                    </Link>
                    <p className="text-[12px] text-[var(--text-muted)] truncate">
                      {s.reason || s.fullName || 'Sugjeruar për ty'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => followUser(s)}
                    className="text-[12px] font-semibold text-[var(--primary)] disabled:opacity-50"
                  >
                    {busy ? '...' : 'Ndiq'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AlbanianPulse />

      <div className="text-[12px] text-[var(--text-secondary)] leading-5 mt-8">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {[
            { label: 'Komuniteti', href: '/komuniteti' },
            { label: 'Shkarko', href: '/shkarko' },
            { label: 'Privatësia', href: '/privatesi' },
            { label: 'Kushtet', href: '/kushtet' },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="hover:underline">
              {l.label}
            </Link>
          ))}
        </div>
        <p className="mt-3">© {new Date().getFullYear()} AlbNet</p>
      </div>
    </aside>
  );
}
