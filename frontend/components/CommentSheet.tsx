'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { VerifiedBadge } from '@/components/VerifiedBadge';

type Comment = {
  _id: string;
  user: { _id?: string; username: string; avatar?: string; isVerified?: boolean };
  text: string;
  likes?: string[];
  createdAt?: string;
};

export function CommentSheet({
  postId,
  open,
  onClose,
  onCountChange,
}: {
  postId: string;
  open: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}) {
  const user = useAuthStore((s) => s.user);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !postId) return;
    setLoading(true);
    api<{ post: { comments: Comment[] } }>(`/api/posts/${postId}`)
      .then((res) => {
        const list = res.post?.comments || [];
        setComments(list);
        onCountChange?.(list.length);
      })
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, [open, postId, onCountChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const res = await api<{ comment: Comment }>(`/api/posts/${postId}/koment`, {
        method: 'POST',
        body: { text: trimmed },
      });
      const next = [...comments, res.comment];
      setComments(next);
      onCountChange?.(next.length);
      setText('');
    } catch (_) {}
    setSubmitting(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-[470px] max-h-[85dvh] flex flex-col liquid-glass-strong rounded-t-2xl sm:rounded-2xl safe-area-pb"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-[var(--border)] mx-auto mt-3 mb-1 sm:hidden" />
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <p className="text-[15px] font-semibold text-[var(--text)]">Komente</p>
              <button type="button" onClick={onClose} className="text-[14px] font-semibold text-[var(--ig-blue)]">
                Mbyll
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-4 py-2">
              {loading ? (
                <p className="text-center text-[14px] text-[var(--text-muted)] py-8">Duke ngarkuar...</p>
              ) : comments.length === 0 ? (
                <p className="text-center text-[14px] text-[var(--text-muted)] py-8">Bëhu i pari që komenton.</p>
              ) : (
                <ul className="space-y-3 py-2">
                  {comments.map((c) => (
                    <li key={c._id} className="flex gap-3">
                      <Link href={`/profili/${c.user?.username}`} className="flex-shrink-0">
                        <img
                          src={c.user?.avatar || ''}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover bg-[var(--border)]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://api.dicebear.com/7.x/avataaars/svg?seed=' + c.user?.username;
                          }}
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] text-[var(--text)] leading-snug">
                          <Link href={`/profili/${c.user?.username}`} className="font-semibold mr-1.5 hover:opacity-80">
                            {c.user?.username}
                            {c.user?.isVerified && <VerifiedBadge size={12} className="ml-0.5" />}
                          </Link>
                          {c.text}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {user && (
              <form onSubmit={submit} className="border-t border-[var(--border)] p-3 flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Shto një koment..."
                  maxLength={500}
                  className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-[14px]"
                />
                <button
                  type="submit"
                  disabled={submitting || !text.trim()}
                  className="px-4 py-2.5 text-[14px] font-semibold text-[var(--ig-blue)] disabled:opacity-40"
                >
                  Posto
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
