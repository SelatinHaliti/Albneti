'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api } from '@/utils/api';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuthReady } from '@/hooks/useAuthReady';
import { useSocket } from '@/components/SocketProvider';

type Conversation = {
  _id: string;
  type?: 'direct' | 'group';
  name?: string;
  participants: { _id: string; username: string; avatar?: string; fullName?: string }[];
  lastMessageAt: string;
  lastMessage?: { content: string; sender: string; type?: string };
  unreadCount?: number;
};

function convTitle(c: Conversation, userId?: string) {
  if (c.type === 'group') return c.name || 'Grup';
  const other = c.participants?.find((p) => String(p._id) !== String(userId));
  return other?.username || 'Bisedë';
}

function convAvatar(c: Conversation, userId?: string) {
  if (c.type === 'group') return null;
  return c.participants?.find((p) => String(p._id) !== String(userId));
}

export default function MessagesPage() {
  const { ready, isAuthenticated, user } = useAuthReady();
  const { socket, refreshUnreadMessages } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useDocumentTitle('Mesazhe');

  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await api<{ conversations: Conversation[] }>('/api/messages', { timeout: 90000 });
      setConversations(res.conversations || []);
      void refreshUnreadMessages();
    } catch (_) {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, refreshUnreadMessages]);

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    void loadConversations();
  }, [ready, isAuthenticated, loadConversations]);

  useEffect(() => {
    if (!socket) return;
    const onNew = () => { void loadConversations(); };
    const onInbox = () => { void loadConversations(); };
    socket.on('new_message_notification', onNew);
    socket.on('inbox_updated', onInbox);
    return () => {
      socket.off('new_message_notification', onNew);
      socket.off('inbox_updated', onInbox);
    };
  }, [socket, loadConversations]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        void loadConversations();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isAuthenticated, loadConversations]);

  const getOther = (c: Conversation) =>
    c.participants?.find((p) => String(p._id) !== String(user?.id));

  return (
    <div className="mobile-page max-w-[470px] mx-auto min-h-screen bg-[var(--bg)] overflow-x-hidden">
      <div className="ig-page-header ig-nav-bar sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
        <h1 className="text-[16px] font-semibold text-[var(--text)]">Mesazhe</h1>
        <Link href="/mesazhe/te-rinj" className="ig-link-btn text-[14px]">
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
          <div className="empty-state-icon mb-4">
            <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </div>
          <p className="text-[15px] font-semibold text-[var(--text)]">Nuk ka mesazhe</p>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">Fillo një bisedë të re me miqtë.</p>
          <Link href="/mesazhe/te-rinj" className="ig-btn-action mt-5 px-6 py-2 text-[14px] inline-block">
            Bisedë e re
          </Link>
        </motion.div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {conversations.map((c) => {
            const other = getOther(c);
            const title = convTitle(c, user?.id);
            const isGroup = c.type === 'group';
            return (
              <Link key={c._id} href={`/mesazhe/${c._id}`}>
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  className={`conversation-row flex items-center gap-3 px-4 py-3 ${c.unreadCount ? 'conversation-row--unread' : ''}`}
                >
                  {isGroup ? (
                    <div className="w-14 h-14 rounded-full bg-[var(--primary-soft)] flex items-center justify-center flex-shrink-0 text-[var(--primary)] font-bold text-lg">
                      {title.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <img
                      src={other?.avatar || ''}
                      alt=""
                      className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + other?.username;
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] truncate ${c.unreadCount ? 'font-bold text-[var(--text)]' : 'font-semibold text-[var(--text)]'}`}>
                      {title}
                      {isGroup && <span className="text-[var(--text-muted)] font-normal ml-1">({c.participants.length})</span>}
                    </p>
                    <p className={`text-[13px] truncate ${c.unreadCount ? 'text-[var(--text)] font-medium' : 'text-[var(--text-muted)]'}`}>
                      {c.lastMessage?.type === 'audio' ? '🎤 Mesazh zëri' : c.lastMessage?.content || 'Bisedë e re'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      {c.lastMessageAt
                        ? new Date(c.lastMessageAt).toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' })
                        : ''}
                    </span>
                    {c.unreadCount ? (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--primary)] text-white text-[10px] font-bold flex items-center justify-center">
                        {c.unreadCount > 9 ? '9+' : c.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
