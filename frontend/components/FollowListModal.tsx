'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/utils/api';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { useAuthStore } from '@/store/useAuthStore';

export type FollowListUser = {
  _id: string;
  username: string;
  fullName?: string;
  avatar?: string;
  isVerified?: boolean;
  isFollowing?: boolean;
  followRequestPending?: boolean;
  isOwn?: boolean;
};

type FollowListModalProps = {
  open: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  type: 'followers' | 'following';
  canView?: boolean;
  onFollowChange?: () => void;
};

export function FollowListModal({
  open,
  onClose,
  userId,
  username,
  type,
  canView = true,
  onFollowChange,
}: FollowListModalProps) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const panelRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<FollowListUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  const title = type === 'followers' ? 'Ndjekës' : 'Ndjek';
  const endpoint = type === 'followers'
    ? `/api/users/liste/${userId}/ndjekesit`
    : `/api/users/liste/${userId}/ndjeket`;

  const load = useCallback(async (q: string) => {
    if (!canView) {
      setError('Ky profil është privat.');
      setUsers([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}&limit=50` : '?limit=50';
      const res = await api<{ users: FollowListUser[]; total: number }>(`${endpoint}${qs}`, { timeout: 60000 });
      setUsers(res.users || []);
      setTotal(res.total ?? res.users?.length ?? 0);
    } catch (e) {
      setUsers([]);
      setTotal(0);
      setError(e instanceof Error ? e.message : 'Nuk u ngarkua lista.');
    } finally {
      setLoading(false);
    }
  }, [canView, endpoint]);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    void load('');
  }, [open, load, type, userId]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => { void load(search); }, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search, open, load]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const handleFollow = async (target: FollowListUser) => {
    if (!currentUserId || target.isOwn) return;
    setFollowLoading(target._id);
    try {
      const res = await api<{ isFollowing: boolean; followRequestPending?: boolean }>(
        `/api/users/${target._id}/ndiq`,
        { method: 'POST' }
      );
      setUsers((prev) =>
        prev.map((u) =>
          u._id === target._id
            ? { ...u, isFollowing: res.isFollowing, followRequestPending: !!res.followRequestPending }
            : u
        )
      );
      onFollowChange?.();
    } catch (_) {}
    finally {
      setFollowLoading(null);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[90] ig-modal-overlay flex items-end sm:items-center justify-center"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="w-full max-w-[420px] max-h-[85vh] sm:max-h-[70vh] liquid-glass-ultra rounded-t-3xl sm:rounded-3xl flex flex-col safe-area-pb sm:mx-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-1 rounded-full bg-[var(--border)] mx-auto mt-3 mb-1 sm:hidden" />

          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-glass)]">
            <div>
              <h2 className="text-[17px] font-bold text-[var(--text)]">{title}</h2>
              <p className="text-[12px] text-[var(--text-muted)]">@{username}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--primary-soft)]"
              aria-label="Mbyll"
            >
              ✕
            </button>
          </div>

          {canView && (
            <div className="px-4 py-3 border-b border-[var(--border-glass)]">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Kërko..."
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[14px] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-2 py-2">
            {loading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="w-11 h-11 rounded-full bg-[var(--border)] animate-shimmer" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-28 bg-[var(--border)] rounded animate-shimmer" />
                      <div className="h-2.5 w-20 bg-[var(--border)] rounded animate-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="py-16 text-center px-6">
                <p className="text-[15px] font-medium text-[var(--text)]">{error}</p>
                {canView && (
                  <button
                    type="button"
                    onClick={() => load(search)}
                    className="mt-4 px-5 py-2 rounded-xl bg-[var(--primary)] text-white text-[13px] font-semibold"
                  >
                    Provo përsëri
                  </button>
                )}
              </div>
            ) : users.length === 0 ? (
              <div className="py-16 text-center px-6">
                <p className="text-[15px] font-medium text-[var(--text)]">
                  {search ? 'Asnjë rezultat' : type === 'followers' ? 'Ende nuk ka ndjekës' : 'Ende nuk ndjek askënd'}
                </p>
                <p className="text-[13px] text-[var(--text-muted)] mt-1">
                  {search ? 'Provo një emër tjetër.' : 'Lista do të përditësohet këtu.'}
                </p>
              </div>
            ) : (
              <>
                <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide px-3 py-1">
                  {total} {type === 'followers' ? 'ndjekës' : 'ndjekje'}
                </p>
                {users.map((u) => (
                  <div key={u._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--primary-soft)]/60 transition-colors">
                    <Link href={`/profili/${u.username}`} onClick={onClose} className="flex items-center gap-3 flex-1 min-w-0">
                      <img
                        src={u.avatar || ''}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover bg-[var(--border)] flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`;
                        }}
                      />
                      <div className="min-w-0 text-left">
                        <p className="text-[14px] font-semibold text-[var(--text)] truncate flex items-center gap-1">
                          {u.username}
                          {u.isVerified && <VerifiedBadge size={13} />}
                        </p>
                        {u.fullName && (
                          <p className="text-[12px] text-[var(--text-muted)] truncate">{u.fullName}</p>
                        )}
                      </div>
                    </Link>
                    {!u.isOwn && currentUserId && (
                      <button
                        type="button"
                        disabled={followLoading === u._id}
                        onClick={() => handleFollow(u)}
                        className={`flex-shrink-0 px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                          u.isFollowing
                            ? 'border border-[var(--border)] text-[var(--text)]'
                            : u.followRequestPending
                              ? 'border border-[var(--ig-blue)] text-[var(--ig-blue)]'
                              : 'bg-[var(--primary)] text-white hover:opacity-90'
                        }`}
                      >
                        {u.isFollowing ? 'Çndiq' : u.followRequestPending ? 'Dërguar' : 'Ndiq'}
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
