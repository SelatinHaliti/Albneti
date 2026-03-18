'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api, apiUpload } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocket } from '@/components/SocketProvider';
import { CallModal } from '@/components/CallModal';

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
  const [call, setCall] = useState<null | {
    direction: 'outgoing' | 'incoming';
    mode: 'audio' | 'video';
    offerSdp?: RTCSessionDescriptionInit;
    fromUserId?: string;
  }>(null);

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
    socket.on('call:offer', (payload: { fromUserId: string; conversationId?: string; mode: 'audio' | 'video'; sdp: RTCSessionDescriptionInit }) => {
      if (payload.conversationId && payload.conversationId !== id) return;
      setCall({ direction: 'incoming', mode: payload.mode, offerSdp: payload.sdp, fromUserId: payload.fromUserId });
    });
    socket.on('call:end', (payload: { fromUserId: string; conversationId?: string }) => {
      if (payload.conversationId && payload.conversationId !== id) return;
      setCall(null);
    });
    return () => {
      socket.emit('leave_conversation', id);
      socket.off('message');
      socket.off('user_typing');
      socket.off('user_stop_typing');
      socket.off('call:offer');
      socket.off('call:end');
    };
  }, [socket, id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const other = conversation?.participants?.find((p) => p._id !== user?.id);

  const startCall = (mode: 'audio' | 'video') => {
    if (!socket || !user || !other?._id) return;
    setCall({ direction: 'outgoing', mode });
  };

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => startCall('audio')}
            className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-center"
            aria-label="Thirrje audio"
            title="Thirrje audio"
          >
            <svg className="w-4 h-4 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0-1.242 1.008-2.25 2.25-2.25h2.1c.7 0 1.33.4 1.63 1.02l1.1 2.2c.3.6.25 1.32-.14 1.87l-.83 1.16a14.1 14.1 0 006.33 6.33l1.16-.83c.55-.39 1.27-.44 1.87-.14l2.2 1.1c.62.3 1.02.93 1.02 1.63v2.1c0 1.242-1.008 2.25-2.25 2.25h-.75C9.056 23.25 2.25 16.444 2.25 8.25v-.75z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => startCall('video')}
            className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-center"
            aria-label="Thirrje video"
            title="Thirrje video"
          >
            <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5v-1.125A2.625 2.625 0 0013.125 6.75H5.625A2.625 2.625 0 003 9.375v5.25a2.625 2.625 0 002.625 2.625h7.5a2.625 2.625 0 002.625-2.625V13.5l4.5 2.25v-7.5l-4.5 2.25z" />
            </svg>
          </button>
        </div>
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

      {call && socket && user && other?._id && (
        <CallModal
          socket={socket}
          selfUserId={user.id}
          otherUserId={call.direction === 'incoming' && call.fromUserId ? call.fromUserId : other._id}
          conversationId={id}
          otherUsername={other.username}
          direction={call.direction}
          mode={call.mode}
          offerSdp={call.offerSdp as RTCSessionDescriptionInit}
          onClose={() => setCall(null)}
        />
      )}
    </div>
  );
}
