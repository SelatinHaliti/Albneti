'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';

type SuggestedUser = {
  _id: string;
  username: string;
  avatar?: string;
  fullName?: string;
};

export function RightSidebar() {
  const user = useAuthStore((s) => s.user);
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);

  useEffect(() => {
    api<{ suggestions: SuggestedUser[] }>('/api/explore/sugjerime?limit=5')
      .then((r) => setSuggestions(r.suggestions || []))
      .catch(() => setSuggestions([]));
  }, []);

  if (!user) return null;

  return (
    <aside className="hidden xl:block w-[320px] flex-shrink-0 pt-8 pl-8 sticky top-0 h-fit">
      {/* User card */}
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/profili/${user.username}`}>
          <img
            src={user.avatar || ''}
            alt=""
            className="w-14 h-14 rounded-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.username; }}
          />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profili/${user.username}`} className="text-[14px] font-semibold text-[var(--text)] truncate block hover:opacity-80">
            {user.username}
          </Link>
          <p className="text-[14px] text-[var(--text-muted)] truncate">{user.fullName || user.username}</p>
        </div>
        <Link href="/profili/redakto" className="text-[12px] font-semibold text-[var(--primary)] hover:opacity-80">
          Ndërro
        </Link>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-semibold text-[var(--text-muted)]">Sugjerime për ty</span>
            <Link href="/kerko" className="text-[12px] font-semibold text-[var(--text)] hover:opacity-80">Shiko të gjitha</Link>
          </div>
          <div className="space-y-3">
            {suggestions.map((s) => (
              <div key={s._id} className="flex items-center gap-3">
                <Link href={`/profili/${s.username}`}>
                  <img
                    src={s.avatar || ''}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + s.username; }}
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profili/${s.username}`} className="text-[14px] font-semibold text-[var(--text)] truncate block hover:opacity-80">
                    {s.username}
                  </Link>
                  <p className="text-[12px] text-[var(--text-muted)] truncate">{s.fullName || 'Sugjerim i ri'}</p>
                </div>
                <Link href={`/profili/${s.username}`} className="text-[12px] font-semibold text-[var(--primary)] hover:opacity-80">
                  Ndiq
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer links */}
      <div className="text-[11px] text-[var(--text-secondary)] leading-5 space-y-1">
        <p>ALBNET · Platforma sociale shqiptare</p>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
          {['Rreth', 'Ndihmë', 'API', 'Privatësia'].map((l) => (
            <span key={l} className="hover:underline cursor-pointer">{l}</span>
          ))}
        </div>
        <p className="pt-2">© 2026 ALBNET</p>
      </div>
    </aside>
  );
}
