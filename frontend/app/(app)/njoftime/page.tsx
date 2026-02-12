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

function timeAgo(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return 'tani';
  if (sec < 3600) return `para ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `para ${Math.floor(sec / 3600)} orë`;
  if (sec < 604800) return `para ${Math.floor(sec / 86400)} ditë`;
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
    <div className="max-w-[470px] mx-auto min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--bg)]/95 backdrop-blur-sm border-b border-[var(--border)] px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold text-[var(--text)] tracking-tight">Njoftime</h1>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-[13px] font-semibold text-red-600 hover:text-red-500 hover:underline transition-colors"
            >
              Lexo të gjitha
            </button>
          )}
        </div>
        {/* Filter pills */}
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => setFilter('te-gjitha')}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
              filter === 'te-gjitha'
                ? 'bg-[var(--text)] text-[var(--bg)]'
                : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--border)] hover:text-[var(--text)]'
            }`}
          >
            Të gjitha
          </button>
          <button
            type="button"
            onClick={() => setFilter('te-palexuara')}
            className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors flex items-center gap-1.5 ${
              filter === 'te-palexuara'
                ? 'bg-[var(--text)] text-[var(--bg)]'
                : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--border)] hover:text-[var(--text)]'
            }`}
          >
            Të palexuara
            {unreadCount > 0 && (
              <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 py-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <div className="w-11 h-11 rounded-full bg-[var(--border)] animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-[var(--border)] animate-pulse" />
                  <div className="h-2.5 w-1/3 rounded bg-[var(--border)] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center px-4"
          >
            <div className="w-14 h-14 rounded-full bg-[var(--border)] flex items-center justify-center text-[var(--text-muted)] text-2xl mb-4">
              !
            </div>
            <p className="text-[var(--text)] font-medium mb-1">{error}</p>
            <p className="text-[var(--text-muted)] text-sm mb-5">Kontrollo lidhjen dhe provo përsëri.</p>
            <button
              type="button"
              onClick={loadNotifications}
              className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-[14px] font-semibold hover:bg-red-500 active:bg-red-700 transition-colors"
            >
              Provo përsëri
            </button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-[var(--border)]/80 flex items-center justify-center text-[var(--text-muted)] text-3xl mb-4">
              ◉
            </div>
            <p className="text-[var(--text)] font-medium">
              {filter === 'te-palexuara' ? 'Nuk keni njoftime të palexuara' : 'Nuk keni njoftime ende'}
            </p>
            <p className="text-[var(--text-muted)] text-sm mt-1 max-w-[260px]">
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
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  n.isRead
                    ? 'hover:bg-[var(--bg-card)]'
                    : 'bg-red-500/10 hover:bg-red-500/15'
                }`}
              >
                <div className="relative flex-shrink-0">
                  {n.sender ? (
                    <Link href={`/profili/${n.sender.username}`} className="block" onClick={() => markOneRead(n._id)}>
                      <img
                        src={n.sender.avatar || ''}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover bg-[var(--border)] ring-2 ring-[var(--bg)]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + n.sender?.username;
                        }}
                      />
                    </Link>
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-[var(--border)] flex items-center justify-center text-[var(--text-muted)] text-sm font-medium" aria-hidden>
                      ?
                    </div>
                  )}
                  {!n.isRead && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-[var(--bg)]" aria-hidden />
                  )}
                </div>
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
                  <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
                {n.post && (
                  <Link
                    href={`/post/${typeof n.post === 'object' && n.post && '_id' in n.post ? n.post._id : n.post}`}
                    className="flex-shrink-0 text-[13px] font-semibold text-red-600 hover:text-red-500 hover:underline"
                    onClick={() => markOneRead(n._id)}
                  >
                    Shiko
                  </Link>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
