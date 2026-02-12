'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api, apiUpload } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocket } from '@/components/SocketProvider';

type Message = {
  _id: string;
  sender: { _id: string; username: string; avatar?: string };
  content: string;
  type: string;
  media?: { url: string };
  status: string;
  createdAt: string;
};

type Conversation = {
  _id: string;
  participants: { _id: string; username: string; avatar?: string }[];
};

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const user = useAuthStore((s) => s.user);
  const { socket } = useSocket();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      try {
        const res = await api<{ conversation: Conversation; messages: Message[] }>(
          `/api/messages/conversation/${id}`
        );
        setConversation(res.conversation);
        setMessages(res.messages || []);
      } catch (_) {
        router.replace('/mesazhe');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user, router]);

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('join_conversation', id);
    socket.on('message', (msg: Message) => {
      setMessages((m) => [...m, msg]);
    });
    socket.on('user_typing', (data: { userId: string }) => setTyping(data.userId));
    socket.on('user_stop_typing', () => setTyping(null));
    return () => {
      socket.emit('leave_conversation', id);
      socket.off('message');
      socket.off('user_typing');
      socket.off('user_stop_typing');
    };
  }, [socket, id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const other = conversation?.participants?.find((p) => p._id !== user?.id);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text && !sending) return;
    setInput('');
    setSending(true);
    try {
      if (socket?.connected) {
        socket.emit('new_message', {
          conversationId: id,
          content: text,
          type: 'text',
        });
      } else {
        const res = await api<{ message: Message }>(`/api/messages/${id}`, {
          method: 'POST',
          body: { content: text, type: 'text' },
        });
        setMessages((m) => [...m, res.message]);
      }
      await api(`/api/messages/${id}/lexuar`, { method: 'PUT' });
    } catch (_) {}
    setSending(false);
  };

  if (loading || !conversation) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-gray-500">Duke ngarkuar...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)]">
      <header className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <Link href="/mesazhe" className="text-xl">←</Link>
        <Link href={`/profili/${other?.username}`} className="flex items-center gap-3 flex-1">
          <img
            src={other?.avatar || ''}
            alt=""
            className="w-10 h-10 rounded-full object-cover bg-gray-200"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + other?.username;
            }}
          />
          <span className="font-semibold dark:text-white">{other?.username}</span>
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <motion.div
            key={msg._id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.sender?._id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                msg.sender?._id === user?.id
                  ? 'bg-primary-500 text-white rounded-br-md'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
              }`}
            >
              {msg.media?.url ? (
                <img src={msg.media.url} alt="" className="rounded-lg max-h-48 object-cover" />
              ) : null}
              {msg.content ? <p className="text-sm">{msg.content}</p> : null}
            </div>
          </motion.div>
        ))}
        {typing && typing !== user?.id && (
          <p className="text-sm text-gray-500">Po shkruan...</p>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Shkruaj një mesazh..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={sending}
            className="px-6 py-2.5 rounded-xl bg-primary-500 text-white font-medium disabled:opacity-50"
          >
            Dërgo
          </button>
        </div>
      </form>
    </div>
  );
}
