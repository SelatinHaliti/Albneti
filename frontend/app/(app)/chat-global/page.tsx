'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';
import { useSocket } from '@/components/SocketProvider';
import { useAuthStore } from '@/store/useAuthStore';

type Sender = {
  _id: string;
  username: string;
  avatar?: string;
  fullName?: string;
};

type GlobalMessage = {
  _id: string;
  sender: Sender;
  content: string;
  type: string;
  createdAt: string;
  pending?: boolean;
};

function formatDateKey(date: string) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Sot';
  if (d.toDateString() === yesterday.toDateString()) return 'Dje';
  return d.toLocaleDateString('sq-AL', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ChatGlobalPage() {
  const { socket, isConnected } = useSocket();
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<GlobalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [banModal, setBanModal] = useState<{ userId: string; username: string } | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banHours, setBanHours] = useState('24');
  const [soundOn, setSoundOn] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tempIdRef = useRef(0);

  const isMod = user?.role === 'admin' || user?.role === 'moderator';

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Ngarko mesazhet fillestare
  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ messages: GlobalMessage[]; hasMore: boolean }>('/api/global-chat/messages?limit=50');
        setMessages(res.messages || []);
        setHasMore(res.hasMore ?? false);
      } catch (_) {
        setMessages([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load more kur scroll në fillim
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    const firstId = messages[0]._id;
    if (firstId.startsWith('temp-')) return;
    setLoadingMore(true);
    try {
      const res = await api<{ messages: GlobalMessage[]; hasMore: boolean }>(
        `/api/global-chat/messages?limit=30&before=${firstId}`
      );
      const list = res.messages || [];
      setHasMore(res.hasMore ?? false);
      setMessages((prev) => [...list, ...prev]);
    } catch (_) {}
    setLoadingMore(false);
  }, [loadingMore, hasMore, messages]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop < 100) loadMore();
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [loadMore]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;
    const onMessage = (msg: GlobalMessage) => {
      setMessages((prev) => {
        const exists = prev.some((m) => m._id === msg._id);
        if (exists) return prev;
        const withoutPending = prev.filter((m) => !m.pending || m.content !== msg.content);
        return [...withoutPending, msg];
      });
      if (soundOn && msg.sender?._id !== user?.id && typeof window !== 'undefined') {
        try {
          const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          if (Ctx) {
            const ctx = new Ctx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
          }
        } catch (_) {}
      }
    };
    const onDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    };
    const onOnlineCount = ({ count }: { count: number }) => {
      setOnlineCount(count);
    };
    const onTyping = ({ userId }: { userId: string }) => {
      if (userId === user?.id) return;
      setTypingUserIds((prev) => new Set(prev).add(userId));
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTypingUserIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }, 3000);
    };
    const onStopTyping = ({ userId }: { userId: string }) => {
      setTypingUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };
    const onError = ({ message }: { message: string }) => {
      setErrorToast(message);
      setTimeout(() => setErrorToast(null), 5000);
    };

    socket.on('global_chat_message', onMessage);
    socket.on('global_chat_message_deleted', onDeleted);
    socket.on('global_chat_online_count', onOnlineCount);
    socket.on('global_chat_typing', onTyping);
    socket.on('global_chat_stop_typing', onStopTyping);
    socket.on('global_chat_error', onError);

    return () => {
      socket.off('global_chat_message', onMessage);
      socket.off('global_chat_message_deleted', onDeleted);
      socket.off('global_chat_online_count', onOnlineCount);
      socket.off('global_chat_typing', onTyping);
      socket.off('global_chat_stop_typing', onStopTyping);
      socket.off('global_chat_error', onError);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [socket, user?.id, soundOn]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const tempId = `temp-${++tempIdRef.current}`;
    const optimistic: GlobalMessage = {
      _id: tempId,
      sender: {
        _id: user!.id,
        username: user!.username,
        avatar: user!.avatar,
        fullName: user!.fullName,
      },
      content: text,
      type: 'text',
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setInput('');
    setSending(true);
    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom(false);

    try {
      if (isConnected && socket) {
        socket.emit('global_chat_message', { content: text });
        socket.emit('global_chat_stop_typing');
        // Mesazhi real do të vijë nga broadcast dhe do të zëvendësojë pending në onMessage
      } else {
        const res = await api<{ message: GlobalMessage }>('/api/global-chat/messages', {
          method: 'POST',
          body: { content: text },
        });
        if (res.message) {
          setMessages((prev) => {
            const without = prev.filter((m) => m._id !== tempId);
            return [...without, res.message!];
          });
        }
      }
    } catch (err: unknown) {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Mesazhi nuk u dërgua.';
      setErrorToast(msg);
      setTimeout(() => setErrorToast(null), 4000);
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (socket && isConnected) {
      socket.emit('global_chat_typing');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => socket.emit('global_chat_stop_typing'), 1500);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!isMod) return;
    try {
      await api(`/api/global-chat/messages/${messageId}`, { method: 'DELETE' });
    } catch (_) {}
  };

  const openBanModal = (sender: Sender) => {
    setBanModal({ userId: sender._id, username: sender.username });
    setBanReason('');
    setBanHours('24');
  };

  const submitBan = async () => {
    if (!banModal || !isMod) return;
    try {
      const durationHours = banHours === 'permanent' ? -1 : parseInt(banHours, 10) || 24;
      await api('/api/global-chat/ban', {
        method: 'POST',
        body: { userId: banModal.userId, reason: banReason, durationHours },
      });
      setBanModal(null);
    } catch (_) {}
  };

  const messagesByDate = messages.reduce<{ key: string; items: GlobalMessage[] }[]>((acc, msg) => {
    const key = formatDateKey(msg.createdAt);
    const last = acc[acc.length - 1];
    if (last && last.key === key) {
      last.items.push(msg);
    } else {
      acc.push({ key, items: [msg] });
    }
    return acc;
  }, []);

  return (
    <div className="max-w-[700px] mx-auto flex flex-col h-[calc(100vh-44px)] md:h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="flex-shrink-0 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-[var(--text)]">Chat Global Shqiptar</h1>
            <p className="text-[13px] text-[var(--text-muted)] mt-0.5">
              Shqipëria · Kosova · Maqedonia · Mali i Zi · Diaspora — vetëm në shqip.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setSoundOn((s) => !s)}
              className={`p-2 rounded-full transition-colors ${soundOn ? 'text-[var(--primary)] bg-[var(--primary-soft)]' : 'text-[var(--text-muted)] bg-[var(--bg)]'}`}
              title={soundOn ? 'Zëri aktiv' : 'Zëri çaktiv'}
              aria-label={soundOn ? 'Çaktivizo zërin' : 'Aktivizo zërin'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {soundOn ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12M9 9a3 3 0 010 4.243M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                )}
              </svg>
            </button>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                isConnected ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {isConnected ? `${onlineCount} online` : 'Duke përdorur REST'}
            </span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 scrollbar-hide">
        {loadingMore && (
          <div className="flex justify-center py-2">
            <div className="w-6 h-6 border-2 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-2 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <p className="font-semibold text-[var(--text)]">Asnjë mesazh ende</p>
            <p className="text-sm mt-1">Bëhu i pari që thotë përshëndetje në gjuhën shqipe.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messagesByDate.map((group) => (
              <div key={group.key}>
                <div className="flex items-center gap-3 py-2">
                  <span className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">{group.key}</span>
                  <span className="flex-1 h-px bg-[var(--border)]" />
                </div>
                <div className="space-y-3">
                  {group.items.map((msg) => (
                    <div key={msg._id} className={`flex gap-3 group ${msg.pending ? 'opacity-80' : ''}`}>
                      <Link href={`/profili/${msg.sender?.username}`} className="flex-shrink-0">
                        <img
                          src={msg.sender?.avatar || ''}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover bg-[var(--border)]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + msg.sender?.username;
                          }}
                        />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <Link href={`/profili/${msg.sender?.username}`} className="text-[13px] font-semibold text-[var(--text)] hover:underline">
                            {msg.sender?.username}
                          </Link>
                          <span className="text-[11px] text-[var(--text-muted)]">
                            {new Date(msg.createdAt).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {msg.pending && (
                            <span className="text-[10px] text-[var(--text-muted)]">(duke dërguar...)</span>
                          )}
                        </div>
                        <p className="text-[14px] text-[var(--text)] break-words mt-0.5 whitespace-pre-wrap">{msg.content}</p>
                        {isMod && !msg.pending && (
                          <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => deleteMessage(msg._id)} className="text-xs text-[var(--danger)] hover:underline">
                              Fshi
                            </button>
                            <button
                              type="button"
                              onClick={() => msg.sender && openBanModal(msg.sender)}
                              className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)]"
                            >
                              Ndalo përdoruesin
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        {typingUserIds.size > 0 && (
          <p className="text-xs text-[var(--text-muted)] italic py-1">Dikush po shkruan...</p>
        )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - gjithmonë i aktiv, përdor socket OSE REST */}
      <form onSubmit={handleSubmit} className="flex-shrink-0 p-3 border-t border-[var(--border)] bg-[var(--bg-card)] safe-area-pb">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Shkruaj në shqip..."
            maxLength={2000}
            className="flex-1 px-4 py-2.5 rounded-full border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder-[var(--text-muted)] text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="px-5 py-2.5 rounded-full bg-[var(--primary)] text-white font-semibold text-[14px] disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {sending ? '...' : 'Dërgo'}
          </button>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-1.5 text-center">
          Vetëm në gjuhën shqipe. Respektoni të tjerët. Mesazhet ruhen dhe mund të moderohen.
        </p>
      </form>

      {/* Error toast */}
      {errorToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[var(--danger)] text-white text-sm font-medium shadow-lg animate-fade-in max-w-[90vw] text-center">
          {errorToast}
        </div>
      )}

      {/* Ban modal */}
      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setBanModal(null)}>
          <div className="w-full max-w-sm bg-[var(--bg-card)] rounded-2xl p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--text)]">Ndalo nga Chat Global</h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">Përdoruesi @{banModal.username} nuk do të mund të dërgojë mesazhe.</p>
            <label className="block text-sm font-medium text-[var(--text-muted)] mt-3">Kohëzgjatja</label>
            <select
              value={banHours}
              onChange={(e) => setBanHours(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
            >
              <option value="1">1 orë</option>
              <option value="24">24 orë</option>
              <option value="72">3 ditë</option>
              <option value="168">1 javë</option>
              <option value="720">30 ditë</option>
              <option value="permanent">Përherë</option>
            </select>
            <label className="block text-sm font-medium text-[var(--text-muted)] mt-2">Arsye (opsional)</label>
            <input
              type="text"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Shkruaj arsyen..."
              className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
            />
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setBanModal(null)} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text)]">
                Anulo
              </button>
              <button type="button" onClick={submitBan} className="flex-1 py-2.5 rounded-xl bg-[var(--danger)] text-white font-semibold">
                Ndalo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
