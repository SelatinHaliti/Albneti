'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocket } from '@/components/SocketProvider';
import { getPeerConnectionConfig } from '@/lib/webrtc';

type LiveComment = {
  _id: string;
  text: string;
  createdAt: string;
  user: { username: string; avatar?: string };
};

type LiveData = {
  _id: string;
  title: string;
  isActive: boolean;
  user: { _id: string; username: string; avatar?: string };
  viewers: string[];
};

export default function WatchLivePage() {
  const params = useParams();
  const router = useRouter();
  const liveId = params?.id as string;
  const user = useAuthStore((s) => s.user);
  const { socket } = useSocket();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [live, setLive] = useState<LiveData | null>(null);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [input, setInput] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!liveId) return;
    (async () => {
      try {
        const res = await api<{ live: LiveData & { comments: LiveComment[] } }>(`/api/live/${liveId}`);
        if (!res.live?.isActive) {
          router.replace('/live');
          return;
        }
        setLive(res.live);
        setComments(res.live.comments || []);
        setViewerCount(res.live.viewers?.length || 0);
        await api(`/api/live/${liveId}/bashkohu`, { method: 'POST' });
      } catch (_) {
        router.replace('/live');
      } finally {
        setLoading(false);
      }
    })();
  }, [liveId, router]);

  useEffect(() => {
    if (!socket || !liveId || !live) return;
    socket.emit('live:join', liveId);

    const onComment = (c: LiveComment) => setComments((prev) => [...prev.slice(-99), c]);
    const onCount = (data: { count?: number }) => setViewerCount(data.count ?? 0);
    const onEnded = () => router.replace('/live');

    const onOffer = async (data: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
      if (data.fromUserId !== live.user._id) return;
      const config = await getPeerConnectionConfig();
      const pc = new RTCPeerConnection(config);
      pcRef.current = pc;
      pc.ontrack = (ev) => {
        const stream = ev.streams?.[0];
        if (stream && videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      };
      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          socket.emit('live:ice', { liveId, toUserId: data.fromUserId, candidate: ev.candidate });
        }
      };
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('live:answer', { liveId, toUserId: data.fromUserId, sdp: answer });
    };

    const onIce = async (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
      if (pcRef.current && data.fromUserId === live.user._id) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (_) {}
      }
    };

    socket.on('live:comment', onComment);
    socket.on('live:viewer_count', onCount);
    socket.on('live:ended', onEnded);
    socket.on('live:offer', onOffer);
    socket.on('live:ice', onIce);

    return () => {
      socket.emit('live:leave', liveId);
      socket.off('live:comment', onComment);
      socket.off('live:viewer_count', onCount);
      socket.off('live:ended', onEnded);
      socket.off('live:offer', onOffer);
      socket.off('live:ice', onIce);
      pcRef.current?.close();
    };
  }, [socket, liveId, live, router]);

  const sendComment = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    try {
      await api(`/api/live/${liveId}/koment`, { method: 'POST', body: { text } });
    } catch (_) {}
  };

  if (loading || !live) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Duke ngarkuar live...
      </div>
    );
  }

  const isHost = user?.id === live.user._id;

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      <video ref={videoRef} className="flex-1 object-cover w-full" playsInline autoPlay />
      <div className="absolute top-0 left-0 right-0 p-4 safe-area-pt flex items-center gap-3">
        <Link href="/live" className="text-white text-xl">←</Link>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--danger)] text-white text-[13px] font-bold">
          LIVE · {viewerCount}
        </div>
        <span className="text-white font-semibold truncate">{live.user.username}</span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 max-h-[40dvh] flex flex-col bg-gradient-to-t from-black/90 via-black/60 to-transparent">
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {comments.map((c) => (
            <p key={c._id} className="text-white text-[13px]">
              <span className="font-bold mr-1">{c.user?.username}</span>
              {c.text}
            </p>
          ))}
        </div>
        {!isHost && (
          <div className="p-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void sendComment(); }}
              placeholder="Shkruaj koment..."
              className="flex-1 px-4 py-2.5 rounded-full bg-white/15 text-white text-[14px]"
            />
            <button type="button" onClick={sendComment} className="px-4 py-2.5 rounded-full bg-[var(--ig-blue)] text-white font-semibold text-[14px]">
              Dërgo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
