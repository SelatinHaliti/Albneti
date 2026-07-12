'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api } from '@/utils/api';
import { VerifiedBadge } from '@/components/VerifiedBadge';

export type FollowRequest = {
  _id: string;
  username: string;
  fullName?: string;
  avatar?: string;
  isVerified?: boolean;
};

type FollowRequestsPanelProps = {
  requests: FollowRequest[];
  onUpdate: (requests: FollowRequest[], followersDelta?: number) => void;
};

export function FollowRequestsPanel({ requests, onUpdate }: FollowRequestsPanelProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (requests.length === 0) return null;

  const handleAccept = async (id: string) => {
    setLoadingId(id);
    try {
      await api(`/api/users/me/kerkesa-ndjekje/${id}/prano`, { method: 'POST' });
      onUpdate(requests.filter((r) => r._id !== id), 1);
    } catch (_) {}
    finally {
      setLoadingId(null);
    }
  };

  const handleDecline = async (id: string) => {
    setLoadingId(id);
    try {
      await api(`/api/users/me/kerkesa-ndjekje/${id}/refuzo`, { method: 'POST' });
      onUpdate(requests.filter((r) => r._id !== id));
    } catch (_) {}
    finally {
      setLoadingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-[var(--text)]">Kërkesa për ndjekje</h3>
        <span className="text-[12px] font-semibold text-[var(--primary)]">{requests.length}</span>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {requests.map((r) => (
          <div key={r._id} className="flex items-center gap-3 px-4 py-3">
            <Link href={`/profili/${r.username}`} className="flex items-center gap-3 flex-1 min-w-0">
              <img
                src={r.avatar || ''}
                alt=""
                className="w-11 h-11 rounded-full object-cover bg-[var(--border)]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.username}`;
                }}
              />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[var(--text)] truncate flex items-center gap-1">
                  {r.username}
                  {r.isVerified && <VerifiedBadge size={13} />}
                </p>
                {r.fullName && <p className="text-[12px] text-[var(--text-muted)] truncate">{r.fullName}</p>}
              </div>
            </Link>
            <div className="flex gap-2 flex-shrink-0">
              <button
                type="button"
                disabled={loadingId === r._id}
                onClick={() => handleAccept(r._id)}
                className="ig-btn-action px-3.5 py-1.5 text-[12px] disabled:opacity-50"
              >
                Prano
              </button>
              <button
                type="button"
                disabled={loadingId === r._id}
                onClick={() => handleDecline(r._id)}
                className="ig-btn-outline px-3.5 py-1.5 text-[12px] disabled:opacity-50"
              >
                Refuzo
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
