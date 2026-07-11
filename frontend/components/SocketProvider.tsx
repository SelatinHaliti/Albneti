'use client';

import { useEffect, createContext, useContext, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore, getAuthToken } from '@/store/useAuthStore';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? 'https://albneti-api.onrender.com'
    : 'http://localhost:5000');

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
  unreadNotifications: number;
  bumpNotifications: () => void;
};

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  unreadNotifications: 0,
  bumpNotifications: () => {},
});

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const bumpNotifications = useCallback(() => {
    setUnreadNotifications((n) => n + 1);
  }, []);

  useEffect(() => {
    const authToken = token || getAuthToken();
    if (!hasHydrated && !useAuthStore.persist.hasHydrated()) return;
    if (!authToken) {
      setSocket(null);
      setIsConnected(false);
      return;
    }
    const s = io(SOCKET_URL, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
    });
    setSocket(s);
    s.on('connect', () => setIsConnected(true));
    s.on('disconnect', () => setIsConnected(false));
    s.on('notification', () => {
      setUnreadNotifications((n) => n + 1);
    });
    return () => {
      s.close();
      setSocket(null);
      setIsConnected(false);
    };
  }, [token, hasHydrated]);

  return (
    <SocketContext.Provider value={{ socket, isConnected, unreadNotifications, bumpNotifications }}>
      {children}
    </SocketContext.Provider>
  );
}
