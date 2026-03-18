'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';

type CallMode = 'audio' | 'video';

type CommonProps = {
  socket: Socket;
  selfUserId: string;
  otherUserId: string;
  conversationId: string;
  otherUsername?: string;
  onClose: () => void;
};

type OutgoingProps = CommonProps & {
  direction: 'outgoing';
  mode: CallMode;
};

type IncomingProps = CommonProps & {
  direction: 'incoming';
  mode: CallMode;
  offerSdp: RTCSessionDescriptionInit;
};

export function CallModal(props: OutgoingProps | IncomingProps) {
  const {
    socket,
    selfUserId,
    otherUserId,
    conversationId,
    otherUsername,
    onClose,
  } = props;

  const direction = props.direction;
  const mode = props.mode;

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<'idle' | 'ringing' | 'connecting' | 'connected' | 'ended' | 'error'>(
    direction === 'outgoing' ? 'connecting' : 'ringing'
  );
  const [error, setError] = useState<string>('');
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  const showVideo = mode === 'video';
  const title = useMemo(() => {
    const name = otherUsername ? `@${otherUsername}` : 'Përdoruesi';
    if (status === 'ringing') return `Thirrje nga ${name}`;
    if (status === 'connecting') return `Duke lidhur me ${name}...`;
    if (status === 'connected') return `Në thirrje me ${name}`;
    if (status === 'ended') return 'Thirrja u mbyll';
    if (status === 'error') return 'Gabim thirrje';
    return 'Thirrje';
  }, [otherUsername, status]);

  const cleanup = async (emitEnd = false, reason?: string) => {
    try {
      if (emitEnd) socket.emit('call:end', { toUserId: otherUserId, conversationId, reason });
    } catch (_) {}

    try {
      pcRef.current?.getSenders()?.forEach((s) => s.track?.stop());
    } catch (_) {}
    try {
      pcRef.current?.close();
    } catch (_) {}
    pcRef.current = null;

    try {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch (_) {}
    localStreamRef.current = null;

    remoteStreamRef.current = null;
  };

  const ensurePeer = () => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
    });
    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      socket.emit('call:ice', { toUserId: otherUserId, conversationId, candidate: ev.candidate });
    };
    pc.ontrack = (ev) => {
      const stream = ev.streams?.[0];
      if (!stream) return;
      remoteStreamRef.current = stream;
      const remoteEl = document.getElementById('call-remote') as HTMLVideoElement | HTMLAudioElement | null;
      if (remoteEl) {
        remoteEl.srcObject = stream;
      }
      setStatus('connected');
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setStatus('ended');
      }
    };
    pcRef.current = pc;
    return pc;
  };

  const startLocalMedia = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: showVideo,
    });
    localStreamRef.current = stream;
    const localEl = document.getElementById('call-local') as HTMLVideoElement | null;
    if (localEl) {
      localEl.srcObject = stream;
    }
    return stream;
  };

  const placeOffer = async () => {
    const pc = ensurePeer();
    const stream = await startLocalMedia();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit('call:offer', {
      toUserId: otherUserId,
      conversationId,
      mode,
      sdp: offer,
    });
    setStatus('connecting');
  };

  const acceptIncoming = async (offerSdp: RTCSessionDescriptionInit) => {
    const pc = ensurePeer();
    const stream = await startLocalMedia();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('call:answer', { toUserId: otherUserId, conversationId, sdp: answer });
    setStatus('connecting');
  };

  useEffect(() => {
    const onAnswer = async (payload: { fromUserId: string; conversationId?: string; sdp: RTCSessionDescriptionInit }) => {
      if (payload.fromUserId !== otherUserId) return;
      if (payload.conversationId && payload.conversationId !== conversationId) return;
      try {
        const pc = ensurePeer();
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        setStatus('connected');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Gabim në answer.');
        setStatus('error');
      }
    };
    const onIce = async (payload: { fromUserId: string; conversationId?: string; candidate: RTCIceCandidateInit }) => {
      if (payload.fromUserId !== otherUserId) return;
      if (payload.conversationId && payload.conversationId !== conversationId) return;
      try {
        const pc = ensurePeer();
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } catch (_) {}
    };
    const onEnd = (payload: { fromUserId: string; conversationId?: string; reason?: string }) => {
      if (payload.fromUserId !== otherUserId) return;
      if (payload.conversationId && payload.conversationId !== conversationId) return;
      setStatus('ended');
      cleanup(false);
    };

    socket.on('call:answer', onAnswer);
    socket.on('call:ice', onIce);
    socket.on('call:end', onEnd);
    return () => {
      socket.off('call:answer', onAnswer);
      socket.off('call:ice', onIce);
      socket.off('call:end', onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, otherUserId, conversationId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (direction === 'outgoing') await placeOffer();
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Nuk u nis thirrja.');
        setStatus('error');
      }
    })();
    return () => {
      mounted = false;
      cleanup(true, 'closed');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onHangup = async () => {
    setStatus('ended');
    await cleanup(true, 'hangup');
    onClose();
  };

  const onAccept = async () => {
    if (direction !== 'incoming') return;
    try {
      await acceptIncoming(props.offerSdp);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nuk u pranua thirrja.');
      setStatus('error');
    }
  };

  const onDecline = async () => {
    setStatus('ended');
    await cleanup(true, 'declined');
    onClose();
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = muted));
    setMuted((m) => !m);
  };

  const toggleCam = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => (t.enabled = camOff));
    setCamOff((v) => !v);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-[var(--shadow-lg)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <p className="text-[15px] font-semibold text-[var(--text)]">{title}</p>
          {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
        </div>

        <div className="p-5 space-y-4">
          {showVideo ? (
            <div className="grid grid-cols-2 gap-3">
              <video id="call-local" autoPlay playsInline muted className="w-full aspect-video rounded-xl bg-black" />
              <video id="call-remote" autoPlay playsInline className="w-full aspect-video rounded-xl bg-black" />
            </div>
          ) : (
            <audio id="call-remote" autoPlay />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-[14px] font-semibold text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
            >
              {muted ? 'Aktivo zërin' : 'Hesht'}
            </button>
            {showVideo && (
              <button
                type="button"
                onClick={toggleCam}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-[14px] font-semibold text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
              >
                {camOff ? 'Aktivo kamerën' : 'Fik kamerën'}
              </button>
            )}
          </div>

          {direction === 'incoming' && status === 'ringing' ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onDecline}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-[14px] font-semibold text-[var(--text)] hover:bg-[var(--bg)] transition-colors"
              >
                Refuzo
              </button>
              <button
                type="button"
                onClick={onAccept}
                className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] text-white text-[14px] font-semibold hover:opacity-90 transition-opacity"
              >
                Prano
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onHangup}
              className="w-full py-2.5 rounded-xl bg-[var(--danger)] text-white text-[14px] font-semibold hover:opacity-90 transition-opacity"
            >
              Mbyll thirrjen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

