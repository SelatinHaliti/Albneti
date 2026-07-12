'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { useAuthReady } from '@/hooks/useAuthReady';

type Friend = { _id: string; username: string; avatar?: string; fullName?: string };

export default function CloseFriendsPage() {
  const { ready, isAuthenticated } = useAuthReady();
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFriends = async () => {
    try {
      const res = await api<{ closeFriends: Friend[] }>('/api/users/me/miq-te-ngushte');
      setFriends(res.closeFriends || []);
    } catch (_) {
      setFriends([]);
    }
  };

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      router.replace('/kycu');
      return;
    }
    void loadFriends().finally(() => setLoading(false));
  }, [ready, isAuthenticated, router]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    api<{ users: Friend[] }>(`/api/users/kerko?q=${encodeURIComponent(query)}&limit=15`)
      .then((res) => { if (!cancelled) setSearchResults(res.users || []); })
      .catch(() => { if (!cancelled) setSearchResults([]); });
    return () => { cancelled = true; };
  }, [query]);

  const addFriend = async (userId: string) => {
    try {
      await api(`/api/users/${userId}/mik-i-ngushte`, { method: 'POST' });
      await loadFriends();
      setQuery('');
      setSearchResults([]);
    } catch (_) {}
  };

  const removeFriend = async (userId: string) => {
    try {
      await api(`/api/users/${userId}/mik-i-ngushte`, { method: 'POST' });
      setFriends((f) => f.filter((x) => x._id !== userId));
    } catch (_) {}
  };

  return (
    <div className="mobile-page max-w-[470px] mx-auto py-5 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profili/redakto" className="text-xl text-[var(--text)]">←</Link>
        <h1 className="text-[20px] font-semibold">Miq të ngushtë</h1>
      </div>

      <p className="text-[13px] text-[var(--text-muted)] mb-4">
        Vetëm miqtë e ngushtë shohin story-t me unazë jeshile. Shto deri në 50 miq.
      </p>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Kërko për të shtuar..."
        className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] mb-4"
      />

      {searchResults.length > 0 && (
        <div className="mb-6 space-y-2">
          {searchResults.map((u) => (
            <button
              key={u._id}
              type="button"
              onClick={() => addFriend(u._id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] text-left hover:bg-[var(--bg)]"
            >
              <img src={u.avatar || ''} alt="" className="w-10 h-10 rounded-full object-cover" />
              <span className="font-semibold text-[14px]">{u.username}</span>
              <span className="ml-auto text-[var(--ig-blue)] text-[13px] font-semibold">Shto</span>
            </button>
          ))}
        </div>
      )}

      <h2 className="text-[14px] font-semibold mb-3">Lista ({friends.length})</h2>
      {loading ? (
        <p className="text-[var(--text-muted)]">Duke ngarkuar...</p>
      ) : friends.length === 0 ? (
        <p className="text-[var(--text-muted)] text-[14px]">Nuk ke miq të ngushtë ende.</p>
      ) : (
        <div className="space-y-2">
          {friends.map((f) => (
            <div key={f._id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)]">
              <img src={f.avatar || ''} alt="" className="w-10 h-10 rounded-full object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[14px] truncate">{f.username}</p>
                {f.fullName && <p className="text-[12px] text-[var(--text-muted)] truncate">{f.fullName}</p>}
              </div>
              <button
                type="button"
                onClick={() => removeFriend(f._id)}
                className="text-[13px] text-[var(--danger)] font-semibold"
              >
                Hiq
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
