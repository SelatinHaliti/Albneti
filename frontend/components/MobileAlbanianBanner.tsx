'use client';

import Link from 'next/link';
import { useSocket } from '@/components/SocketProvider';
import { useEffect, useState } from 'react';

/** Banner kompakt për mobile – Chat Global live */
export function MobileAlbanianBanner() {
  const { socket } = useSocket();
  const [online, setOnline] = useState(0);

  useEffect(() => {
    if (!socket) return;
    const onCount = (d: { count: number }) => setOnline(d.count ?? 0);
    socket.on('global_chat_online_count', onCount);
    return () => { socket.off('global_chat_online_count', onCount); };
  }, [socket]);

  return (
    <Link
      href="/chat-global"
      className="xl:hidden mx-3 mb-3 albanian-card flex items-center gap-3 p-3.5 hover:opacity-90 transition-opacity"
    >
      <span className="text-xl">🌍</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[var(--text)]">Chat Global Shqiptar</p>
        <p className="text-[11px] text-[var(--text-muted)]">
          {online > 0 ? `${online} online tani` : 'Bisedo me shqiptarë live'}
        </p>
      </div>
      <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse-live flex-shrink-0" />
    </Link>
  );
}
