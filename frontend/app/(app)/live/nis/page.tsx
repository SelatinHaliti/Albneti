'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocket } from '@/components/SocketProvider';
import { acquireLocalMedia, getPeerConnectionConfig } from '@/lib/webrtc';

export default function StartLivePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { socket } = useSocket();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerMapRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [title, setTitle] = useState('Transmetim live');
  const [liveId, setLiveId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    if (!socket || !liveId || !streamRef.current) return;

    const sendOfferToViewer = async (viewerId: string) => {
      const stream = streamRef.current;
      if (!stream) return;
      const config = await getPeerConnectionConfig();
      const pc = new RTCPeerConnection(config);
      peerMapRef.current.set(viewerId, pc);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          socket.emit('live:ice', { liveId, toUserId: viewerId, candidate: ev.candidate });
        }
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('live:offer', { liveId, toUserId: viewerId, sdp: offer });
    };

    const onViewerJoined = (data: { liveId: string; viewerId: string }) => {
      if (data.liveId !== liveId) return;
      void sendOfferToViewer(data.viewerId);
    };

    const onAnswer = async (data: { fromUserId: string; sdp: RTCSessionDescriptionInit }) => {
      const pc = peerMapRef.current.get(data.fromUserId);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
    };

    const onIce = async (data: { fromUserId: string; candidate: RTCIceCandidateInit }) => {
      const pc = peerMapRef.current.get(data.fromUserId);
      if (pc) {
        try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (_) {}
      }
    };

    socket.on('live:viewer_joined', onViewerJoined);
    socket.on('live:answer', onAnswer);
    socket.on('live:ice', onIce);
    return () => {
      socket.off('live:viewer_joined', onViewerJoined);
      socket.off('live:answer', onAnswer);
      socket.off('live:ice', onIce);
      peerMapRef.current.forEach((pc) => pc.close());
      peerMapRef.current.clear();
    };
  }, [socket, liveId]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      peerMapRef.current.forEach((pc) => pc.close());
    };
  }, []);

  const startLive = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const stream = await acquireLocalMedia('video', 'user');
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play();
      }
      const res = await api<{ live: { _id: string } }>('/api/live/nis', {
        method: 'POST',
        body: { title: title.trim() || 'Transmetim live' },
      });
      setLiveId(res.live._id);
      socket?.emit('live:join', res.live._id);
    } catch (_) {}
    setStarting(false);
  };

  const endLive = async () => {
    if (!liveId) return;
    try {
      await api(`/api/live/${liveId}/mbyll`, { method: 'POST' });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      router.push('/live');
    } catch (_) {}
  };

  useEffect(() => {
    if (!socket || !liveId) return;
    const onCount = (data: { count?: number }) => setViewerCount(data.count ?? 0);
    socket.on('live:viewer_count', onCount);
    return () => { socket.off('live:viewer_count', onCount); };
  }, [socket, liveId]);

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      <video ref={videoRef} className="flex-1 object-cover w-full" playsInline muted autoPlay />
      <div className="absolute top-0 left-0 right-0 p-4 safe-area-pt flex items-center justify-between">
        {liveId ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--danger)] text-white text-[13px] font-bold">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            LIVE · {viewerCount} shikues
          </div>
        ) : (
          <Link href="/live" className="text-white text-xl">←</Link>
        )}
        {liveId && (
          <button type="button" onClick={endLive} className="px-4 py-2 rounded-lg bg-white/20 text-white font-semibold text-[14px]">
            Përfundo
          </button>
        )}
      </div>
      {!liveId && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titulli i transmetimit"
            className="w-full px-4 py-3 rounded-xl bg-white/15 border border-white/20 text-white mb-4"
          />
          <button
            type="button"
            onClick={startLive}
            disabled={starting}
            className="w-full py-3.5 rounded-xl bg-[var(--danger)] text-white font-bold text-[15px] disabled:opacity-50"
          >
            {starting ? 'Duke nisur...' : 'Nis transmetimin'}
          </button>
        </div>
      )}
      {liveId && user && (
        <p className="absolute bottom-6 left-0 right-0 text-center text-white/70 text-[13px]">
          @{user.username} · Transmetim aktiv
        </p>
      )}
    </div>
  );
}
