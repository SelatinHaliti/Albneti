'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type Conversation = {
  _id: string;
  participants: { _id: string; username: string; avatar?: string; fullName?: string }[];
  lastMessageAt: string;
  lastMessage?: { content: string; sender: string };
};

export default function MessagesPage() {
  const user = useAuthStore((s) => s.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useDocumentTitle('Mesazhe');

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await api<{ conversations: Conversation[] }>('/api/messages');
        setConversations(res.conversations || []);
      } catch (_) {
        setConversations([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const getOther = (c: Conversation) => c.participants?.find((p) => p._id !== user?.id);

  return (
    <div className="mobile-page max-w-[470px] mx-auto min-h-screen bg-[var(--bg)] overflow-x-hidden">
      <div className="px-4 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <h1 className="text-[18px] font-bold text-[var(--text)]">Mesazhe</h1>
        <Link href="/mesazhe/te-rinj" className="text-[var(--primary)] text-[14px] font-semibold hover:opacity-80">
          E re
        </Link>
      </div>

      {loading ? (
        <div className="divide-y divide-[var(--border)]">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="w-14 h-14 rounded-full bg-[var(--border)] animate-shimmer" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-[var(--border)] rounded animate-shimmer" />
                <div className="h-2.5 w-40 bg-[var(--border)] rounded animate-shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 px-6 text-center"
        >
          <div className="w-16 h-16 rounded-full glass-card flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <p className="text-[15px] font-semibold text-[var(--text)]">Nuk ka mesazhe</p>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">Fillo një bisedë të re me miqtë.</p>
          <Link href="/mesazhe/te-rinj" className="mt-5 px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white text-[14px] font-semibold">
            Bisedë e re
          </Link>
        </motion.div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {conversations.map((c) => {
            const other = getOther(c);
            return (
              <Link key={c._id} href={`/mesazhe/${c._id}`}>
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--primary-soft)] transition-colors"
                >
                  <img
                    src={other?.avatar || ''}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + other?.username;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14px] text-[var(--text)] truncate">
                      {other?.username}
                    </p>
                    <p className="text-[13px] text-[var(--text-muted)] truncate">
                      {c.lastMessage?.content || 'Bisedë e re'}
                    </p>
                  </div>
                  <span className="text-[11px] text-[var(--text-secondary)] flex-shrink-0">
                    {c.lastMessageAt
                      ? new Date(c.lastMessageAt).toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' })
                      : ''}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
