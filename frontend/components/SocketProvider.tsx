'use client';

import { useEffect, createContext, useContext, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/useAuthStore';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type SocketContextType = {
  socket: Socket | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      setIsConnected(false);
      return;
    }
    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    setSocket(s);
    s.on('connect', () => setIsConnected(true));
    s.on('disconnect', () => setIsConnected(false));
    return () => {
      s.close();
      setSocket(null);
      setIsConnected(false);
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
