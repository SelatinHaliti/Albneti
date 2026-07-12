'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { api } from '@/utils/api';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuthReady } from '@/hooks/useAuthReady';
import { useSocket, type SocialNotification } from '@/components/SocketProvider';

type Notification = SocialNotification & {
  post?: string | { _id: string };
};

const EVENT_TYPES = ['event_interest', 'event_reminder', 'event_update', 'event_promo'];

const typeLabels: Record<string, string> = {
  like: 'pelqeu postimin tënd',
  comment: 'komentoi postimin tënd',
  follow: 'të ndoqi',
  mention: 'të përmendi',
  share: 'ndau postimin tënd',
  story_view: 'shikoi story-n tënd',
  event_interest: 'regjistrim eventi',
  event_reminder: 'kujtesë eventi',
  event_update: 'përditësim eventi',
  event_promo: 'event për ty',
  verification: 'verifikim',
};

const typeIcons: Record<string, string> = {
  like: '❤️',
  comment: '💬',
  follow: '👤',
  mention: '@',
  share: '↗️',
  story_view: '👁',
  event_interest: '✅',
  event_reminder: '🔔',
  event_update: '📅',
  event_promo: '📣',
  verification: '✓',
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

function getActionLabel(n: Notification): string {
  if (n.type === 'follow' && n.text?.includes('kërkoi')) return 'kërkoi të të ndjekë';
  if (n.type === 'mention' && n.text) return n.text;
  return typeLabels[n.type] || n.type;
}

function getPostId(n: Notification): string | null {
  if (!n.post) return null;
  if (typeof n.post === 'object') return String((n.post as { _id: string })._id);
  return String(n.post);
}

function getNotificationHref(n: Notification): string | null {
  const postId = getPostId(n);
  if (postId) return `/post/${postId}`;
  if (EVENT_TYPES.includes(n.type)) return '/komuniteti';
  if (n.type === 'verification') return '/verifikim';
  if (n.type === 'follow' && n.sender?.username) return `/profili/${n.sender.username}`;
  return null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { ready, isAuthenticated } = useAuthReady();
  const { socket, lastNotification, refreshNotifications, clearNotificationBadge } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'te-gjitha' | 'te-palexuara'>('te-gjitha');

  useDocumentTitle('Njoftime');

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api<{ notifications: Notification[]; unreadCount: number }>(
        '/api/notifications?limit=50',
        { timeout: 90000 }
      );
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
      clearNotificationBadge();
    } catch (e) {
      setNotifications([]);
      const msg = e instanceof Error ? e.message : 'Gabim i panjohur';
      setError(msg.includes('kyçur') || msg.includes('Sesioni')
        ? 'Sesioni ka skaduar. Kyçu përsëri.'
        : msg || 'Nuk u ngarkuan njoftimet. Provo përsëri.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, clearNotificationBadge]);

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      router.replace('/kycu');
      return;
    }
    void loadNotifications();
    void refreshNotifications();
  }, [ready, isAuthenticated, router, loadNotifications, refreshNotifications]);

  useEffect(() => {
    if (!lastNotification || lastNotification.type === 'message') return;
    setNotifications((prev) => {
      if (prev.some((n) => n._id === lastNotification._id)) return prev;
      return [lastNotification as Notification, ...prev].slice(0, 50);
    });
    setUnreadCount((c) => c + 1);
  }, [lastNotification]);

  useEffect(() => {
    if (!socket) return;
    const onNotif = (payload: Notification) => {
      if (!payload || payload.type === 'message') return;
      setNotifications((prev) => {
        if (prev.some((n) => n._id === payload._id)) return prev;
        return [payload, ...prev].slice(0, 50);
      });
      setUnreadCount((c) => c + 1);
    };
    socket.on('notification', onNotif);
    return () => {
      socket.off('notification', onNotif);
    };
  }, [socket]);

  const markAllRead = async () => {
    try {
      await api('/api/notifications/lexo-te-gjitha', { method: 'PUT' });
      setNotifications((n) => n.map((x) => ({ ...x, isRead: true })));
      setUnreadCount(0);
      clearNotificationBadge();
    } catch (_) {}
  };

  const markOneRead = async (id: string) => {
    try {
      await api(`/api/notifications/${id}/lexo`, { method: 'PUT' });
      setNotifications((n) => n.map((x) => (x._id === id ? { ...x, isRead: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (_) {}
  };

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isFollowRequest = (n: Notification) =>
    n.type === 'follow' && n.text?.includes('kërkoi');

  const handleAcceptRequest = async (n: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!n.sender?._id) return;
    setActionLoading(n._id);
    try {
      await api(`/api/users/me/kerkesa-ndjekje/${n.sender._id}/prano`, { method: 'POST' });
      if (!n.isRead) await markOneRead(n._id);
      setNotifications((list) => list.filter((x) => x._id !== n._id));
      setUnreadCount((c) => Math.max(0, c - (n.isRead ? 0 : 1)));
    } catch (_) {}
    finally {
      setActionLoading(null);
    }
  };

  const handleDeclineRequest = async (n: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!n.sender?._id) return;
    setActionLoading(n._id);
    try {
      await api(`/api/users/me/kerkesa-ndjekje/${n.sender._id}/refuzo`, { method: 'POST' });
      if (!n.isRead) await markOneRead(n._id);
      setNotifications((list) => list.filter((x) => x._id !== n._id));
      setUnreadCount((c) => Math.max(0, c - (n.isRead ? 0 : 1)));
    } catch (_) {}
    finally {
      setActionLoading(null);
    }
  };

  const openNotification = async (n: Notification) => {
    if (!n.isRead) await markOneRead(n._id);
    const href = getNotificationHref(n);
    if (href) router.push(href);
  };

  const filtered = filter === 'te-palexuara'
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  if (!ready || !isAuthenticated) {
    return (
      <div className="mobile-page max-w-[560px] mx-auto min-h-screen flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm">Duke u ngarkuar...</p>
      </div>
    );
  }

  return (
    <div className="mobile-page max-w-[560px] mx-auto min-h-screen bg-[var(--bg)] overflow-x-hidden">
      <div className="ig-page-header ig-nav-bar sticky top-0 z-10 px-5 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-[16px] font-semibold text-[var(--text)]">Njoftime</h1>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="ig-link-btn text-[14px]"
            >
              Lexo të gjitha
            </button>
          )}
        </div>
        <div className="flex gap-6 mt-3 border-b border-[var(--border)]">
          {[
            { key: 'te-gjitha' as const, label: 'Të gjitha' },
            { key: 'te-palexuara' as const, label: 'Të palexuara' },
          ].map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`filter-chip pb-2.5 ${
                filter === f.key ? 'filter-chip--active' : ''
              }`}
            >
              {f.label}
              {f.key === 'te-palexuara' && unreadCount > 0 && (
                <span className={`min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center ${
                  filter === 'te-palexuara' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--primary)] text-white'
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
            <p className="text-[15px] font-medium text-[var(--text)] mb-1">{error}</p>
            <p className="text-[13px] text-[var(--text-muted)] mb-5">
              Nëse serveri po zgjohet, prit 30–60 sekonda.
            </p>
            <button
              type="button"
              onClick={loadNotifications}
              className="ig-btn-action px-6 py-2 text-[14px]"
            >
              Provo përsëri
            </button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-20 text-center">
            <p className="text-[15px] font-medium text-[var(--text)]">
              {filter === 'te-palexuara' ? 'Nuk keni njoftime të palexuara' : 'Nuk keni njoftime ende'}
            </p>
            <p className="text-[13px] text-[var(--text-muted)] mt-1.5 max-w-[260px]">
              Kur dikush të pelqen, komentojë ose të ndiqë, do të shfaqet këtu.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((n, i) => (
              isFollowRequest(n) ? (
                <motion.div
                  key={n._id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`flex items-center gap-3 p-3 rounded-2xl ${
                    n.isRead ? '' : 'bg-[var(--primary-soft)]'
                  }`}
                >
                  <button type="button" onClick={() => n.sender?.username && router.push(`/profili/${n.sender.username}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <img
                      src={n.sender?.avatar || ''}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover bg-[var(--border)]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://api.dicebear.com/7.x/avataaars/svg?seed=' + n.sender?.username;
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-[14px] text-[var(--text)]">
                    <span className="font-semibold">{n.sender?.username}</span>
                    <span className="text-[var(--text-muted)]"> {getActionLabel(n)}</span>
                  </p>
                  <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{timeAgo(n.createdAt)}</p>
                </div>
              </button>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  disabled={actionLoading === n._id}
                  onClick={(e) => handleAcceptRequest(n, e)}
                  className="ig-btn-action px-3 py-1.5 text-[12px] disabled:opacity-50"
                >
                  Prano
                </button>
                <button
                  type="button"
                  disabled={actionLoading === n._id}
                  onClick={(e) => handleDeclineRequest(n, e)}
                  className="ig-btn-outline px-3 py-1.5 text-[12px] disabled:opacity-50"
                >
                      Refuzo
                    </button>
                  </div>
                </motion.div>
              ) : (
              <motion.button
                key={n._id}
                type="button"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => openNotification(n)}
                className={`notif-card w-full flex items-center gap-3 p-3 text-left ${
                  n.isRead ? '' : 'notif-card--unread'
                }`}
              >
                <div className="relative flex-shrink-0">
                  {n.sender ? (
                    <img
                      src={n.sender.avatar || ''}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover bg-[var(--border)] ring-2 ring-[var(--bg)]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://api.dicebear.com/7.x/avataaars/svg?seed=' + n.sender?.username;
                      }}
                    />
                  ) : EVENT_TYPES.includes(n.type) ? (
                    <div className="w-12 h-12 rounded-full bg-[var(--albanian-red)]/15 flex items-center justify-center text-xl">
                      {typeIcons[n.type] || '📅'}
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[var(--border)] flex items-center justify-center text-sm">?</div>
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center text-[10px]">
                    {typeIcons[n.type] || '🔔'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-[var(--text)] leading-snug">
                    {EVENT_TYPES.includes(n.type) ? (
                      <span className="font-semibold">AlbNet Komuniteti</span>
                    ) : (
                      <span className="font-semibold">{n.sender?.username || 'Dikush'}</span>
                    )}
                    {!EVENT_TYPES.includes(n.type) && (
                      <span className="text-[var(--text-muted)]"> {getActionLabel(n)}</span>
                    )}
                    {n.text && EVENT_TYPES.includes(n.type) && (
                      <span className="text-[var(--text-muted)]"> — {n.text}</span>
                    )}
                    {n.text && n.type === 'comment' && (
                      <span className="text-[var(--text-muted)]">: {n.text}</span>
                    )}
                  </p>
                  <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead ? (
                  <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />
                ) : getNotificationHref(n) ? (
                  <span className="flex-shrink-0 text-[var(--text-muted)]">›</span>
                ) : null}
              </motion.button>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
