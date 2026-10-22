'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { useSocket } from '@/components/SocketProvider';

type Hashtag = { tag: string; count: number };

export function AlbanianPulse() {
  const { socket } = useSocket();
  const [onlineCount, setOnlineCount] = useState(0);
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);

  useEffect(() => {
    api<{ hashtags: Hashtag[] }>('/api/explore/hashtag-trending')
      .then((r) => setHashtags((r.hashtags || []).slice(0, 5)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onCount = (data: { count: number }) => setOnlineCount(data.count ?? 0);
    socket.on('global_chat_online_count', onCount);
    return () => { socket.off('global_chat_online_count', onCount); };
  }, [socket]);

  return (
    <div className="mt-6">
      <Link href="/chat-global" className="flex items-center justify-between gap-3 py-1.5 group">
        <span className="text-[14px] font-semibold text-[var(--text)] group-hover:opacity-70">Chat Global</span>
        <span className="text-[12px] text-[var(--text-muted)] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
          {onlineCount > 0 ? `${onlineCount} online` : 'Hyr'}
        </span>
      </Link>

      {hashtags.length > 0 && (
        <div className="mt-6">
          <p className="text-[14px] font-semibold text-[var(--text-muted)] mb-2">Në trend</p>
          <div>
            {hashtags.map((h) => (
              <Link
                key={h.tag}
                href={`/explore/hashtag/${h.tag}`}
                className="flex items-center justify-between py-1.5 hover:opacity-70"
              >
                <span className="text-[14px] font-semibold text-[var(--text)]">#{h.tag}</span>
                <span className="text-[12px] text-[var(--text-muted)]">{h.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
