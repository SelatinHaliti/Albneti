'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';

type Conversation = {
  _id: string;
  participants: { _id: string; username: string; avatar?: string; fullName?: string }[];
  lastMessageAt: string;
  lastMessage?: { content: string; sender: string };
};

export default function MessagesPage() {
  const user = useAuthStore((s) => s.user);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await api<{ conversations: Conversation[] }>('/api/messages');
        setConversations(res.conversations || []);
      } catch (_) {
        setConversations([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const getOther = (c: Conversation) => c.participants?.find((p) => p._id !== user?.id);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4 dark:text-white">Mesazhe</h1>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-gray-500 dark:text-gray-400 text-center py-12"
        >
          Ende nuk keni biseda. Kërko një përdorues dhe fillo një bisedë.
        </motion.p>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => {
            const other = getOther(c);
            return (
              <Link key={c._id} href={`/mesazhe/${c._id}`}>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
                >
                  <img
                    src={other?.avatar || ''}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover bg-gray-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + other?.username;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">
                      {other?.username}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {c.lastMessage?.content || 'Bisedë e re'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {c.lastMessageAt
                      ? new Date(c.lastMessageAt).toLocaleDateString('sq-AL', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : ''}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      )}

      <Link
        href="/mesazhe/te-rinj"
        className="fixed bottom-24 right-4 md:bottom-8 w-14 h-14 rounded-full bg-primary-500 text-white flex items-center justify-center text-2xl shadow-lg hover:bg-primary-600"
      >
        +
      </Link>
    </div>
  );
}
