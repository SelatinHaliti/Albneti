'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api, apiUpload } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocket } from '@/components/SocketProvider';
import { useCall } from '@/components/CallProvider';
import { IconCallPhone, IconCallVideo } from '@/components/Icons';

type StoryRef = { _id: string; mediaUrl: string; type: string };

type Message = {
  _id: string;
  sender: { _id: string; username: string; avatar?: string };
  content: string;
  type: string;
  media?: { url: string; duration?: number };
  story?: StoryRef;
  status: string;
  createdAt: string;
};

type Conversation = {
  _id: string;
  type?: 'direct' | 'group';
  name?: string;
  participants: { _id: string; username: string; avatar?: string }[];
};

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const user = useAuthStore((s) => s.user);
  const { socket, refreshUnreadMessages } = useSocket();
  const { startCall } = useCall();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [typing, setTyping] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef(0);

  const isGroup = conversation?.type === 'group';
  const other = !isGroup
    ? conversation?.participants?.find((p) => String(p._id) !== String(user?.id))
    : null;
  const headerTitle = isGroup
    ? conversation?.name || 'Grup'
    : other?.username || 'Bisedë';

  const markConversationRead = useCallback(async () => {
    if (!id) return;
    try {
      await api(`/api/messages/${id}/lexuar`, { method: 'PUT' });
      socket?.emit('message_read', { conversationId: id });
      void refreshUnreadMessages();
    } catch (_) {}
  }, [id, socket, refreshUnreadMessages]);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      try {
        const res = await api<{ conversation: Conversation; messages: Message[] }>(
          `/api/messages/conversation/${id}`
        );
        setConversation(res.conversation);
        setMessages(res.messages || []);
        await markConversationRead();
      } catch (_) {
        router.replace('/mesazhe');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user, router, markConversationRead]);

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('join_conversation', id);
    socket.on('message', (msg: Message) => {
      setMessages((m) => [...m, msg]);
      if (String(msg.sender?._id) !== String(user?.id)) {
        void markConversationRead();
      }
    });
    socket.on('user_typing', (data: { userId: string }) => setTyping(data.userId));
    socket.on('user_stop_typing', () => setTyping(null));
    return () => {
      socket.emit('leave_conversation', id);
      socket.off('message');
      socket.off('user_typing');
      socket.off('user_stop_typing');
    };
  }, [socket, id, user?.id, markConversationRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const emitTyping = (active: boolean) => {
    if (!socket) return;
    if (active) {
      socket.emit('typing', { conversationId: id, recipientId: other?._id });
    } else {
      socket.emit('stop_typing', { conversationId: id, recipientId: other?._id });
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    emitTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), 2000);
  };

  const initiateCall = async (mode: 'audio' | 'video') => {
    if (!other?._id || !socket?.connected || isGroup) return;
    await startCall({
      conversationId: id,
      otherUserId: String(other._id),
      otherUsername: other.username,
      mode,
    });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text && !sending) return;
    setInput('');
    emitTyping(false);
    setSending(true);
    try {
      if (socket?.connected) {
        socket.emit('new_message', { conversationId: id, content: text, type: 'text' });
      } else {
        const res = await api<{ message: Message }>(`/api/messages/${id}`, {
          method: 'POST',
          body: { content: text, type: 'text' },
        });
        setMessages((m) => [...m, res.message]);
      }
      await markConversationRead();
    } catch (_) {}
    setSending(false);
  };

  const sendMedia = async (file: File, duration?: number) => {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('media', file);
      if (duration) formData.append('duration', String(duration));
      const res = await apiUpload<{ message: Message }>(`/api/messages/${id}`, formData);
      setMessages((m) => [...m, res.message]);
      await markConversationRead();
    } catch (_) {}
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void sendMedia(file);
  };

  const startVoiceNote = async () => {
    if (recording || uploading) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        const durationSec = recordStartRef.current
          ? (Date.now() - recordStartRef.current) / 1000
          : undefined;
        void sendMedia(file, durationSec);
      };
      mediaRecorderRef.current = recorder;
      recordStartRef.current = Date.now();
      recorder.start();
      setRecording(true);
    } catch (_) {}
  };

  const stopVoiceNote = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const renderMessageContent = (msg: Message) => {
    const isMine = String(msg.sender?._id) === String(user?.id);
    return (
      <div
        className={`max-w-[82%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isMine
            ? 'bg-[var(--ig-blue)] text-white rounded-br-md'
            : 'liquid-glass-card text-[var(--text)] rounded-bl-md'
        }`}
      >
        {isGroup && !isMine && (
          <p className="text-[11px] font-semibold opacity-70 mb-1">{msg.sender?.username}</p>
        )}
        {msg.type === 'story_reply' && msg.story?.mediaUrl && (
          <div className="mb-2 rounded-lg overflow-hidden border border-white/20">
            {msg.story.type === 'video' ? (
              <video src={msg.story.mediaUrl} className="w-full max-h-24 object-cover" muted playsInline />
            ) : (
              <img src={msg.story.mediaUrl} alt="" className="w-full max-h-24 object-cover" />
            )}
            <p className="text-[10px] px-2 py-1 opacity-70">↩ Përgjigje story</p>
          </div>
        )}
        {msg.type === 'video' && msg.media?.url ? (
          <video src={msg.media.url} controls playsInline className="rounded-lg max-h-56 max-w-full" />
        ) : msg.type === 'audio' && msg.media?.url ? (
          <audio src={msg.media.url} controls className="w-full min-w-[200px]" />
        ) : msg.media?.url && msg.type === 'image' ? (
          <img src={msg.media.url} alt="" className="rounded-lg max-h-48 object-cover" />
        ) : null}
        {msg.content ? <p className="text-[14px] leading-snug">{msg.content}</p> : null}
      </div>
    );
  };

  if (loading || !conversation) {
    return (
      <div className="mobile-page max-w-2xl mx-auto px-4 py-8">
        <p className="text-[var(--text-muted)]">Duke ngarkuar...</p>
      </div>
    );
  }

  return (
    <div className="mobile-page max-w-2xl mx-auto flex flex-col mobile-chat-shell md:h-[calc(100dvh-2rem)]">
      <header className="ig-page-header flex items-center gap-2 sm:gap-3 p-3 sm:p-4 flex-shrink-0 safe-area-pt">
        <Link href="/mesazhe" className="ig-touch text-xl text-[var(--text)]">←</Link>
        {isGroup ? (
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--text)] truncate">{headerTitle}</p>
            <p className="text-[12px] text-[var(--text-muted)]">{conversation.participants.length} anëtarë</p>
          </div>
        ) : (
          <Link href={`/profili/${other?.username}`} className="flex items-center gap-3 flex-1 min-w-0">
            <img
              src={other?.avatar || ''}
              alt=""
              className="w-10 h-10 rounded-full object-cover bg-[var(--border)] flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + other?.username;
              }}
            />
            <span className="font-semibold text-[var(--text)] truncate">{headerTitle}</span>
          </Link>
        )}
        {!isGroup && other && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => initiateCall('audio')}
              className="ig-touch w-11 h-11 rounded-full border border-[var(--border)] hover:bg-[var(--primary-soft)] flex items-center justify-center text-[var(--text)]"
              aria-label="Thirrje audio"
            >
              <IconCallPhone size={20} />
            </button>
            <button
              type="button"
              onClick={() => initiateCall('video')}
              className="ig-touch w-11 h-11 rounded-full border border-[var(--border)] hover:bg-[var(--primary-soft)] flex items-center justify-center text-[var(--text)]"
              aria-label="Thirrje video"
            >
              <IconCallVideo size={20} />
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 min-h-0">
        {messages.map((msg) => (
          <motion.div
            key={msg._id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${String(msg.sender?._id) === String(user?.id) ? 'justify-end' : 'justify-start'}`}
          >
            {renderMessageContent(msg)}
          </motion.div>
        ))}
        {typing && String(typing) !== String(user?.id) && (
          <p className="text-[13px] text-[var(--text-muted)] px-1">Po shkruan...</p>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="p-3 sm:p-4 border-t border-[var(--border)] liquid-glass-strong flex-shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={handleFilePick}
        />
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || recording}
            className="ig-touch w-11 h-11 rounded-full border border-[var(--border)] hover:bg-[var(--primary-soft)] flex items-center justify-center flex-shrink-0 disabled:opacity-50"
            aria-label="Dërgo foto ose video"
          >
            <svg className="w-5 h-5 text-[var(--text)]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022 18.75V5.25A2.25 2.25 0 0019.75 3H4.25A2.25 2.25 0 002 3.75v13.5A2.25 2.25 0 004.25 21z" />
            </svg>
          </button>
          <button
            type="button"
            onMouseDown={startVoiceNote}
            onMouseUp={stopVoiceNote}
            onMouseLeave={recording ? stopVoiceNote : undefined}
            onTouchStart={startVoiceNote}
            onTouchEnd={stopVoiceNote}
            disabled={uploading}
            className={`ig-touch w-11 h-11 rounded-full border flex items-center justify-center flex-shrink-0 disabled:opacity-50 ${
              recording ? 'border-[var(--danger)] bg-[var(--danger)]/20 text-[var(--danger)]' : 'border-[var(--border)] hover:bg-[var(--primary-soft)] text-[var(--text)]'
            }`}
            aria-label="Mesazh zëri"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zm-5 9a7 7 0 007-7h-2a5 5 0 01-10 0H5a7 7 0 007 7z" />
            </svg>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={recording ? 'Duke regjistruar...' : 'Shkruaj një mesazh...'}
            className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-[15px]"
            disabled={recording}
          />
          <button
            type="submit"
            disabled={sending || uploading || recording || !input.trim()}
            className="px-5 py-3 rounded-xl bg-[var(--ig-blue)] text-white font-semibold text-[14px] disabled:opacity-50 min-h-[48px]"
          >
            {uploading ? '...' : 'Dërgo'}
          </button>
        </div>
      </form>
    </div>
  );
}
