'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api } from '@/utils/api';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type Notification = {
  _id: string;
  type: string;
  isRead: boolean;
  sender?: { _id: string; username: string; avatar?: string; fullName?: string };
  post?: string | { _id: string };
  text?: string;
  createdAt: string;
};

const typeLabels: Record<string, string> = {
  like: 'pelqeu postimin tënd',
  comment: 'komentoi',
  follow: 'të ndoqi',
  mention: 'të përmendi',
  share: 'ndau postimin tënd',
  story_view: 'shikoi story-n tënd',
  message: 'dërgoi një mesazh',
};

const typeIcons: Record<string, string> = {
  like: '❤️',
  comment: '💬',
  follow: '👤',
  mention: '@',
  share: '↗️',
  story_view: '👁',
  message: '✉️',
};

function timeAgo(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return 'tani';
  if (sec < 3600) return `${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} orë`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} ditë`;
  return d.toLocaleDateString('sq-AL', { day: 'numeric', month: 'short' });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'te-gjitha' | 'te-palexuara'>('te-gjitha');

  useDocumentTitle('Njoftime');

  const loadNotifications = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ notifications: Notification[]; unreadCount: number }>('/api/notifications?limit=50');
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (_) {
      setNotifications([]);
      setError('Nuk u ngarkuan njoftimet. Provo përsëri.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAllRead = async () => {
    try {
      await api('/api/notifications/lexo-te-gjitha', { method: 'PUT' });
      setNotifications((n) => n.map((x) => ({ ...x, isRead: true })));
      setUnreadCount(0);
    } catch (_) {}
  };

  const markOneRead = async (id: string) => {
    try {
      await api(`/api/notifications/${id}/lexo`, { method: 'PUT' });
      setNotifications((n) => n.map((x) => (x._id === id ? { ...x, isRead: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (_) {}
  };

  const filtered = filter === 'te-palexuara'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  return (
    <div className="max-w-[560px] mx-auto min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--bg)]/95 backdrop-blur-xl border-b border-[var(--border)] px-5 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-[var(--text)] tracking-tight">Njoftime</h1>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-[13px] font-semibold text-[var(--primary)] hover:opacity-80 transition-opacity"
            >
              Lexo të gjitha
            </button>
          )}
        </div>
        {/* Filter pills */}
        <div className="flex gap-2 mt-3">
          {[
            { key: 'te-gjitha' as const, label: 'Të gjitha' },
            { key: 'te-palexuara' as const, label: 'Të palexuara' },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-all flex items-center gap-1.5 ${
                filter === f.key
                  ? 'bg-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/20'
                  : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--text-secondary)]'
              }`}
            >
              {f.label}
              {f.key === 'te-palexuara' && unreadCount > 0 && (
                <span className={`min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center ${
                  filter === 'te-palexuara' ? 'bg-white text-[var(--primary)]' : 'bg-[var(--primary)] text-white'
                }`}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl">
                <div className="w-12 h-12 rounded-full bg-[var(--border)] animate-shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded-lg bg-[var(--border)] animate-shimmer" />
                  <div className="h-2.5 w-1/3 rounded bg-[var(--border)] animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center px-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center mb-4 shadow-[var(--shadow-sm)]">
              <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-[15px] font-medium text-[var(--text)] mb-1">{error}</p>
            <p className="text-[13px] text-[var(--text-muted)] mb-5">Kontrollo lidhjen dhe provo përsëri.</p>
            <button
              type="button"
              onClick={loadNotifications}
              className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white text-[14px] font-semibold hover:opacity-90 shadow-md shadow-[var(--primary)]/20 transition-opacity"
            >
              Provo përsëri
            </button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center mb-4 shadow-[var(--shadow-sm)]">
              <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <p className="text-[15px] font-medium text-[var(--text)]">
              {filter === 'te-palexuara' ? 'Nuk keni njoftime të palexuara' : 'Nuk keni njoftime ende'}
            </p>
            <p className="text-[13px] text-[var(--text-muted)] mt-1.5 max-w-[260px] leading-relaxed">
              {filter === 'te-palexuara'
                ? 'Kur të keni të reja, ato do të shfaqen këtu.'
                : 'Kur dikush të pelqen, komentojë ose të ndiqë, do të shfaqet këtu.'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((n, i) => (
              <motion.div
                key={n._id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.025 }}
                className={`flex items-center gap-3 p-3 rounded-2xl transition-colors cursor-pointer ${
                  n.isRead
                    ? 'hover:bg-[var(--bg-card)]'
                    : 'bg-[var(--primary-soft)] hover:bg-[var(--primary-glow)]'
                }`}
                onClick={() => !n.isRead && markOneRead(n._id)}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {n.sender ? (
                    <Link href={`/profili/${n.sender.username}`} onClick={() => markOneRead(n._id)}>
                      <img
                        src={n.sender.avatar || ''}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover bg-[var(--border)] ring-2 ring-[var(--bg)]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + n.sender?.username;
                        }}
                      />
                    </Link>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[var(--border)] flex items-center justify-center text-[var(--text-muted)] text-sm font-medium">
                      ?
                    </div>
                  )}
                  {/* Type icon badge */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-[10px]">
                    {typeIcons[n.type] || '🔔'}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-[var(--text)] leading-snug">
                    {n.sender ? (
                      <Link href={`/profili/${n.sender.username}`} className="font-semibold hover:underline" onClick={() => markOneRead(n._id)}>
                        {n.sender.username}
                      </Link>
                    ) : (
                      <span className="font-semibold">Dikush</span>
                    )}{' '}
                    <span className="text-[var(--text-muted)]">{typeLabels[n.type] || n.type}</span>
                    {n.text && <span className="text-[var(--text-muted)]"> — {n.text}</span>}
                  </p>
                  <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>

                {/* Post link or unread dot */}
                {n.post ? (
                  <Link
                    href={`/post/${typeof n.post === 'object' && n.post && '_id' in n.post ? n.post._id : n.post}`}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[var(--primary)] bg-[var(--primary-soft)] hover:bg-[var(--primary)]/15 transition-colors"
                    onClick={() => markOneRead(n._id)}
                  >
                    Shiko
                  </Link>
                ) : !n.isRead ? (
                  <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />
                ) : null}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
