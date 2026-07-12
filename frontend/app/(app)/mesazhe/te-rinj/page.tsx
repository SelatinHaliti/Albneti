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
  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
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
      .catch(() => { if (!cancelled) setPresetUser(null); });
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
      .then((res) => { if (!cancelled) setUsers(res.users || []); })
      .catch(() => { if (!cancelled) setUsers([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [query]);

  const startChat = async (userId: string) => {
    try {
      const res = await api<{ conversation: { _id: string } }>(`/api/messages/me/${userId}`);
      router.push(`/mesazhe/${res.conversation._id}`);
    } catch (_) {}
  };

  const toggleSelect = (u: User) => {
    setSelected((prev) => {
      const exists = prev.some((x) => x._id === u._id);
      if (exists) return prev.filter((x) => x._id !== u._id);
      if (prev.length >= 31) return prev;
      return [...prev, u];
    });
  };

  const createGroup = async () => {
    if (selected.length < 2) return;
    try {
      const res = await api<{ conversation: { _id: string } }>('/api/messages/grup', {
        method: 'POST',
        body: {
          participantIds: selected.map((u) => u._id),
          name: groupName.trim() || 'Grup i ri',
        },
      });
      router.push(`/mesazhe/${res.conversation._id}`);
    } catch (_) {}
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/mesazhe" className="text-2xl text-[var(--text)]">←</Link>
        <h1 className="text-xl font-bold text-[var(--text)]">Bisedë e re</h1>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMode('direct')}
          className={`flex-1 py-2 rounded-xl text-[14px] font-semibold ${mode === 'direct' ? 'bg-[var(--ig-blue)] text-white' : 'border border-[var(--border)] text-[var(--text)]'}`}
        >
          1:1
        </button>
        <button
          type="button"
          onClick={() => setMode('group')}
          className={`flex-1 py-2 rounded-xl text-[14px] font-semibold ${mode === 'group' ? 'bg-[var(--ig-blue)] text-white' : 'border border-[var(--border)] text-[var(--text)]'}`}
        >
          Grup
        </button>
      </div>

      {mode === 'group' && (
        <div className="mb-4 space-y-3">
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Emri i grupit (opsional)"
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
          />
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map((u) => (
                <span key={u._id} className="px-3 py-1 rounded-full bg-[var(--primary-soft)] text-[13px] font-medium">
                  {u.username}
                  <button type="button" onClick={() => toggleSelect(u)} className="ml-1 opacity-60">×</button>
                </span>
              ))}
            </div>
          )}
          {selected.length >= 2 && (
            <button
              type="button"
              onClick={createGroup}
              className="w-full py-3 rounded-xl bg-[var(--ig-blue)] text-white font-semibold"
            >
              Krijo grupin ({selected.length + 1} anëtarë)
            </button>
          )}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Kërko përdorues..."
        className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
      />

      {mode === 'direct' && presetUser && (
        <div className="mt-4 p-3 rounded-xl bg-[var(--primary-soft)] border border-[var(--border)]">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">Fillo bisedën me</p>
          <button
            type="button"
            onClick={() => startChat(presetUser._id)}
            className="w-full flex items-center gap-4 p-3 rounded-xl bg-[var(--bg-card)] text-left"
          >
            <img src={presetUser.avatar || ''} alt="" className="w-12 h-12 rounded-full object-cover" />
            <div>
              <p className="font-semibold">{presetUser.username}</p>
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
            onClick={() => mode === 'direct' ? startChat(u._id) : toggleSelect(u)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left ${
              mode === 'group' && selected.some((s) => s._id === u._id)
                ? 'border-[var(--ig-blue)] bg-[var(--primary-soft)]'
                : 'border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg)]'
            }`}
          >
            <img src={u.avatar || ''} alt="" className="w-12 h-12 rounded-full object-cover" />
            <div className="flex-1">
              <p className="font-semibold">{u.username}</p>
              {u.fullName && <p className="text-sm text-[var(--text-muted)]">{u.fullName}</p>}
            </div>
            {mode === 'group' && selected.some((s) => s._id === u._id) && (
              <span className="text-[var(--ig-blue)] font-bold">✓</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
