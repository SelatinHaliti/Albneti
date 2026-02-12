'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';

type User = { _id: string; username: string; avatar?: string; fullName?: string };

export default function NewMessagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetUsername = searchParams.get('username') || '';
  const user = useAuthStore((s) => s.user);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [presetUser, setPresetUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!presetUsername.trim()) {
      setPresetUser(null);
      return;
    }
    let cancelled = false;
    api<{ user: User }>(`/api/users/${encodeURIComponent(presetUsername)}`)
      .then((res) => {
        if (!cancelled && res?.user && res.user._id !== user?.id) setPresetUser(res.user);
        else if (!cancelled) setPresetUser(null);
      })
      .catch(() => {
        if (!cancelled) setPresetUser(null);
      });
    return () => { cancelled = true; };
  }, [presetUsername, user?.id]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setUsers([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api<{ users: User[] }>(`/api/users/kerko?q=${encodeURIComponent(query)}&limit=20`)
      .then((res) => {
        if (!cancelled) setUsers(res.users || []);
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [query]);

  const startChat = async (userId: string) => {
    try {
      const res = await api<{ conversation: { _id: string } }>(`/api/messages/me/${userId}`);
      router.push(`/mesazhe/${res.conversation._id}`);
    } catch (_) {}
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/mesazhe" className="text-2xl text-[var(--text)]">←</Link>
        <h1 className="text-xl font-bold text-[var(--text)]">Bisedë e re</h1>
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Kërko përdorues..."
        className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder-[var(--text-muted)]"
      />
      {presetUser && (
        <div className="mt-4 p-3 rounded-xl bg-[var(--primary-soft)] border border-[var(--border)]">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Fillo bisedën me</p>
          <button
            type="button"
            onClick={() => startChat(presetUser._id)}
            className="w-full flex items-center gap-4 p-3 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg)] text-left"
          >
            <img
              src={presetUser.avatar || ''}
              alt=""
              className="w-12 h-12 rounded-full object-cover bg-[var(--border)]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + presetUser.username;
              }}
            />
            <div>
              <p className="font-semibold text-[var(--text)]">{presetUser.username}</p>
              {presetUser.fullName && <p className="text-sm text-[var(--text-muted)]">{presetUser.fullName}</p>}
            </div>
          </button>
        </div>
      )}
      {loading && <p className="text-sm text-[var(--text-muted)] mt-2">Duke kërkuar...</p>}
      <div className="mt-4 space-y-2">
        {users.map((u) => (
          <button
            key={u._id}
            type="button"
            onClick={() => startChat(u._id)}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] hover:bg-[var(--bg)] text-left"
          >
            <img
              src={u.avatar || ''}
              alt=""
              className="w-12 h-12 rounded-full object-cover bg-[var(--border)]"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.username;
              }}
            />
            <div>
              <p className="font-semibold text-[var(--text)]">{u.username}</p>
              {u.fullName && <p className="text-sm text-[var(--text-muted)]">{u.fullName}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
