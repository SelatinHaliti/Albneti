'use client';

import { useEffect, createContext, useContext, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore, getAuthToken } from '@/store/useAuthStore';
import { api } from '@/utils/api';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? 'https://albneti-api.onrender.com'
    : 'http://localhost:5000');

export type SocialNotification = {
  _id: string;
  type: string;
  isRead?: boolean;
  sender?: { _id: string; username: string; avatar?: string; fullName?: string };
  post?: string;
  event?: string;
  text?: string;
  createdAt: string;
};

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  unreadNotifications: number;
  unreadMessages: number;
  lastNotification: SocialNotification | null;
  refreshNotifications: () => Promise<void>;
  refreshUnreadMessages: () => Promise<void>;
  clearNotificationBadge: () => void;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  unreadNotifications: 0,
  unreadMessages: 0,
  lastNotification: null,
  refreshNotifications: async () => {},
  refreshUnreadMessages: async () => {},
  clearNotificationBadge: () => {},
});

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [lastNotification, setLastNotification] = useState<SocialNotification | null>(null);

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await api<{ unreadCount: number }>('/api/notifications?limit=1');
      setUnreadNotifications(res.unreadCount ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  const refreshUnreadMessages = useCallback(async () => {
    try {
      const res = await api<{ conversations: { unreadCount?: number }[] }>('/api/messages');
      const total = (res.conversations || []).reduce((s, c) => s + (c.unreadCount || 0), 0);
      setUnreadMessages(total);
    } catch {
      /* ignore */
    }
  }, []);

  const clearNotificationBadge = useCallback(() => {
    setUnreadNotifications(0);
  }, []);

  useEffect(() => {
    if (!token && !getAuthToken()) return;
    if (!user?.emailVerified) return;
    void refreshNotifications();
    void refreshUnreadMessages();
  }, [token, hasHydrated, user?.emailVerified, refreshNotifications, refreshUnreadMessages]);

  useEffect(() => {
    const authToken = token || getAuthToken();
    if (!hasHydrated && !useAuthStore.persist.hasHydrated()) return;
    if (!authToken || !user?.emailVerified) {
      setSocket(null);
      setIsConnected(false);
      return;
    }
    const s = io(SOCKET_URL, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
    });
    setSocket(s);
    s.on('connect', () => {
      setIsConnected(true);
      void refreshNotifications();
      void refreshUnreadMessages();
    });
    s.on('disconnect', () => setIsConnected(false));
    s.on('notification', (payload?: SocialNotification) => {
      if (!payload || payload.type === 'message') return;
      setUnreadNotifications((n) => n + 1);
      setLastNotification(payload);
    });
    s.on('new_message_notification', () => {
      void refreshUnreadMessages();
    });
    s.on('inbox_updated', () => {
      void refreshUnreadMessages();
    });
    return () => {
      s.close();
      setSocket(null);
      setIsConnected(false);
    };
  }, [token, hasHydrated, user?.emailVerified, refreshNotifications, refreshUnreadMessages]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        unreadNotifications,
        unreadMessages,
        lastNotification,
        refreshNotifications,
        refreshUnreadMessages,
        clearNotificationBadge,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
