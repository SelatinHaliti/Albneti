'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocket } from '@/components/SocketProvider';
import { acquireLocalMedia, getPeerConnectionConfig, switchCamera, hasMultipleCameras } from '@/lib/webrtc';
import { CallControlButton } from '@/components/CallControls';
import { IconCallMic, IconCallMicOff, IconCallFlip, IconCallEnd } from '@/components/Icons';

type LiveComment = {
  _id: string;
  text: string;
  createdAt: string;
  user: { username: string; avatar?: string };
};

function appendComment(prev: LiveComment[], c: LiveComment) {
  if (prev.some((x) => x._id === c._id)) return prev;
  return [...prev.slice(-99), c];
}

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
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [muted, setMuted] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [canFlip, setCanFlip] = useState(false);
  const [flipping, setFlipping] = useState(false);

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
      if (String(data.liveId) !== String(liveId)) return;
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
      setCanFlip(await hasMultipleCameras(stream));
      const res = await api<{ live: { _id: string } }>('/api/live/nis', {
        method: 'POST',
        body: { title: title.trim() || 'Transmetim live' },
      });
      setLiveId(res.live._id);
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

  const toggleMute = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t) => { t.enabled = !next; });
    setMuted(next);
  };

  const flipCamera = async () => {
    const stream = streamRef.current;
    if (!stream || flipping) return;
    setFlipping(true);
    try {
      const { stream: updated, facing } = await switchCamera(stream, facingMode);
      streamRef.current = updated;
      setFacingMode(facing);
      if (videoRef.current) {
        videoRef.current.srcObject = updated;
        await videoRef.current.play().catch(() => {});
      }
      peerMapRef.current.forEach((pc) => {
        const videoTrack = updated.getVideoTracks()[0];
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && videoTrack) void sender.replaceTrack(videoTrack);
      });
    } catch (_) {}
    setFlipping(false);
  };

  useEffect(() => {
    if (!liveId) return;
    (async () => {
      try {
        const res = await api<{ live: { comments?: LiveComment[] } }>(`/api/live/${liveId}`);
        setComments(res.live?.comments || []);
      } catch (_) {}
    })();
  }, [liveId]);

  useEffect(() => {
    if (!socket || !liveId) return;

    const joinRoom = () => socket.emit('live:join', liveId);
    joinRoom();
    socket.on('connect', joinRoom);

    const onCount = (data: { count?: number }) => setViewerCount(data.count ?? 0);
    const onComment = (c: LiveComment) => setComments((prev) => appendComment(prev, c));

    socket.on('live:viewer_count', onCount);
    socket.on('live:comment', onComment);

    return () => {
      socket.off('connect', joinRoom);
      socket.emit('live:leave', liveId);
      socket.off('live:viewer_count', onCount);
      socket.off('live:comment', onComment);
    };
  }, [socket, liveId]);

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col">
      <video
        ref={videoRef}
        className="call-video-native flex-1 object-cover w-full"
        playsInline
        muted
        autoPlay
        disablePictureInPicture
      />
      <div className="absolute top-0 left-0 right-0 p-4 safe-area-pt flex items-center justify-between z-20">
        {liveId ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--albanian-red)] text-white text-[13px] font-bold">
            <span className="w-2 h-2 rounded-full bg-[var(--albanian-gold)] animate-pulse" />
            LIVE · {viewerCount} shikues
          </div>
        ) : (
          <Link href="/live" className="text-white text-xl">←</Link>
        )}
      </div>
      {!liveId && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent z-20">
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
            className="w-full py-3.5 rounded-xl bg-[var(--albanian-red)] text-white font-bold text-[15px] disabled:opacity-50"
          >
            {starting ? 'Duke nisur...' : 'Nis transmetimin'}
          </button>
        </div>
      )}
      {liveId && (
        <>
          <div className="absolute bottom-0 left-0 right-0 max-h-[35dvh] flex flex-col pointer-events-none bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10">
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {comments.map((c) => (
                <p key={c._id} className="text-white text-[13px] drop-shadow-md">
                  <span className="font-bold mr-1">{c.user?.username}</span>
                  {c.text}
                </p>
              ))}
            </div>
            {user && (
              <p className="px-4 pb-24 text-center text-white/70 text-[13px]">
                @{user.username} · Transmetim aktiv
              </p>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 z-30 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/90 to-transparent">
            <div className="call-controls-row justify-center">
              <CallControlButton onClick={toggleMute} ariaLabel={muted ? 'Aktivo zërin' : 'Hesht'} label={muted ? 'Heshtur' : 'Zëri'} variant={muted ? 'glass-active' : 'glass'}>
                {muted ? <IconCallMicOff /> : <IconCallMic />}
              </CallControlButton>
              {canFlip && (
                <CallControlButton onClick={() => void flipCamera()} ariaLabel="Kthe kamerën" label="Kthe" variant="glass" disabled={flipping}>
                  <IconCallFlip />
                </CallControlButton>
              )}
              <CallControlButton onClick={endLive} ariaLabel="Përfundo live" label="Përfundo" variant="danger">
                <IconCallEnd size={26} />
              </CallControlButton>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
