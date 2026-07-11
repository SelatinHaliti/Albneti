'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { AlbanianPulse } from '@/components/AlbanianPulse';

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
    <aside className="hidden xl:block w-[320px] flex-shrink-0 pt-7 pl-7 sticky top-0 h-fit max-h-screen overflow-y-auto scrollbar-hide">
      {/* User card */}
      <div className="flex items-center gap-3 mb-5">
        <Link href={`/profili/${user.username}`}>
          <img
            src={user.avatar || ''}
            alt=""
            className="w-[56px] h-[56px] rounded-full object-cover ring-1 ring-[var(--border)]"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.username; }}
          />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profili/${user.username}`} className="text-[14px] font-semibold text-[var(--text)] truncate block hover:opacity-80">
            {user.username}
          </Link>
          <p className="text-[14px] text-[var(--text-muted)] truncate">{user.fullName || user.username}</p>
        </div>
        <Link href="/profili/redakto" className="text-[12px] font-semibold ig-link">
          Ndërro
        </Link>
      </div>

      {/* Albanian unique features */}
      <AlbanianPulse />

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[14px] font-semibold text-[var(--text-muted)]">Sugjerime për ty</span>
            <Link href="/kerko" className="text-[12px] font-semibold text-[var(--text)] hover:opacity-70">Shiko të gjitha</Link>
          </div>
          <div className="space-y-3">
            {suggestions.map((s) => (
              <div key={s._id} className="flex items-center gap-3">
                <Link href={`/profili/${s.username}`}>
                  <img
                    src={s.avatar || ''}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + s.username; }}
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profili/${s.username}`} className="text-[14px] font-semibold text-[var(--text)] truncate block hover:opacity-80">
                    {s.username}
                  </Link>
                  <p className="text-[12px] text-[var(--text-muted)] truncate">{s.fullName || 'Përdorues i ri'}</p>
                </div>
                <Link href={`/profili/${s.username}`} className="text-[12px] font-semibold ig-link">
                  Ndiq
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-[11px] text-[var(--text-secondary)] leading-5 pt-2">
        <p className="font-semibold text-[var(--text-muted)] mb-1">ALBNET</p>
        <div className="flex flex-wrap gap-x-2">
          {['Rreth', 'Ndihmë', 'Privatësia', 'Kushtet'].map((l) => (
            <span key={l} className="hover:underline cursor-pointer">{l}</span>
          ))}
        </div>
        <p className="pt-3">© 2026 ALBNET · Platforma Sociale Shqiptare</p>
      </div>
    </aside>
  );
}
