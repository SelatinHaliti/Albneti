'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { IconSearch } from '@/components/Icons';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const RECENT_KEY = 'albnet_kerko_recent';
const MAX_RECENT = 10;

type UserResult = {
  _id: string;
  username: string;
  avatar?: string;
  fullName?: string;
};

type HashtagResult = {
  tag: string;
  count: number;
};

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(term: string) {
  const t = term.trim().replace(/^#/, '').toLowerCase();
  if (!t || t.length < 2) return;
  let recent = getRecentSearches().filter((r) => r.toLowerCase() !== t);
  recent = [t, ...recent].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch (_) {}
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch (_) {}
}

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [hashtags, setHashtags] = useState<HashtagResult[]>([]);
  useDocumentTitle('Kërko');
  const [suggestions, setSuggestions] = useState<UserResult[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'te-gjitha' | 'perdorues' | 'hashtag'>('te-gjitha');

  useEffect(() => {
    setRecent(getRecentSearches());
  }, []);

  const search = useCallback(async (query: string) => {
    const term = query.trim().replace(/^#/, '');
    if (term.length < 2) {
      setUsers([]);
      setHashtags([]);
      return;
    }
    setLoading(true);
    try {
      const [usersRes, tagsRes] = await Promise.all([
        api<{ users: UserResult[] }>(`/api/users/kerko?q=${encodeURIComponent(term)}&limit=20`),
        api<{ hashtags: HashtagResult[] }>(`/api/explore/kerko-hashtag?q=${encodeURIComponent(term)}`),
      ]);
      setUsers(usersRes.users || []);
      setHashtags(tagsRes.hashtags || []);
      addRecentSearch(term);
      setRecent(getRecentSearches());
    } catch (_) {
      setUsers([]);
      setHashtags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(q), 300);
    return () => clearTimeout(t);
  }, [q, search]);

  useEffect(() => {
    if (q.trim().length >= 2) return;
    api<{ users: UserResult[] }>('/api/explore/sugjerime')
      .then((r) => setSuggestions(r.users || []))
      .catch(() => setSuggestions([]));
  }, [q]);

  const hasResults = users.length > 0 || hashtags.length > 0;
  const showUsers = activeTab === 'te-gjitha' || activeTab === 'perdorues';
  const showHashtags = activeTab === 'te-gjitha' || activeTab === 'hashtag';

  return (
    <div className="max-w-[470px] mx-auto px-4 py-4 bg-[var(--bg)] min-h-screen">
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
          <IconSearch />
        </span>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Kërko përdorues ose hashtag..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] focus:border-[var(--primary)]"
          autoFocus
        />
      </div>

      {q.trim().length >= 2 && (
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('te-gjitha')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
              activeTab === 'te-gjitha' ? 'bg-[var(--text)] text-[var(--bg-card)]' : 'text-[var(--text-muted)]'
            }`}
          >
            Të gjitha
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('perdorues')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
              activeTab === 'perdorues' ? 'bg-[var(--text)] text-[var(--bg-card)]' : 'text-[var(--text-muted)]'
            }`}
          >
            Përdorues
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hashtag')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
              activeTab === 'hashtag' ? 'bg-[var(--text)] text-[var(--bg-card)]' : 'text-[var(--text-muted)]'
            }`}
          >
            Hashtag
          </button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
        </div>
      )}

      {!loading && q.trim().length >= 2 && !hasResults && (
        <p className="text-center text-[var(--text-muted)] py-12">Nuk u gjet asgjë.</p>
      )}

      {!loading && hasResults && (
        <div className="space-y-6">
          {showUsers && users.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wide">Përdorues</h2>
              <div className="space-y-2">
                {users.map((u) => (
                  <Link
                    key={u._id}
                    href={`/profili/${u.username}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg)]"
                  >
                    <img
                      src={u.avatar || ''}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover bg-[var(--border)]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.username;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--text)] truncate">{u.username}</p>
                      {u.fullName && (
                        <p className="text-sm text-[var(--text-muted)] truncate">{u.fullName}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {showHashtags && hashtags.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wide">Hashtag</h2>
              <div className="space-y-2">
                {hashtags.map((h) => (
                  <Link
                    key={h.tag}
                    href={`/explore/hashtag/${h.tag}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg)]"
                  >
                    <span className="text-2xl text-[var(--text-muted)]">#</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--text)]">#{h.tag}</p>
                      <p className="text-sm text-[var(--text-muted)]">{h.count} postime</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {q.trim().length < 2 && (
        <div className="space-y-6">
          {recent.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide">Kërkimet e fundit</h2>
                <button type="button" onClick={() => { clearRecentSearches(); setRecent([]); }} className="text-[13px] font-semibold text-[var(--text)]">
                  Fshi
                </button>
              </div>
              <div className="space-y-1">
                {recent.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setQ(r)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg)] text-left"
                  >
                    <span className="text-[var(--text-muted)]">
                      <IconSearch />
                    </span>
                    <span className="text-[14px] text-[var(--text)]">{r}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {suggestions.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wide">Sugjerime</h2>
              <div className="space-y-2">
                {suggestions.map((u) => (
                  <Link
                    key={u._id}
                    href={`/profili/${u.username}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg)]"
                  >
                    <img
                      src={u.avatar || ''}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover bg-[var(--border)]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.username;
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[var(--text)] truncate">{u.username}</p>
                      {u.fullName && <p className="text-sm text-[var(--text-muted)] truncate">{u.fullName}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {recent.length === 0 && suggestions.length === 0 && (
            <p className="text-center text-[var(--text-muted)] py-12 text-sm">Shkruaj të paktën 2 karaktere për të kërkuar.</p>
          )}
        </div>
      )}
    </div>
  );
}
