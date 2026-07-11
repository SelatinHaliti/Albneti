'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import {
  getIceServers,
  flushIceQueue,
  attachLocalTracks,
  stopMediaStream,
  closePeerConnection,
} from '@/lib/webrtc';

type CallMode = 'audio' | 'video';

type CommonProps = {
  socket: Socket;
  selfUserId: string;
  otherUserId: string;
  conversationId: string;
  otherUsername?: string;
  onClose: () => void;
  onConnected?: () => void;
};

type OutgoingProps = CommonProps & {
  direction: 'outgoing';
  mode: CallMode;
  offerSdp?: undefined;
};

type IncomingProps = CommonProps & {
  direction: 'incoming';
  mode: CallMode;
  offerSdp: RTCSessionDescriptionInit;
};

const RING_TIMEOUT_MS = 45000;

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function CallModal(props: OutgoingProps | IncomingProps) {
  const { socket, otherUserId, conversationId, otherUsername, onClose, onConnected } = props;
  const direction = props.direction;
  const mode = props.mode;
  const incomingOffer = direction === 'incoming' ? props.offerSdp : null;

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteReadyRef = useRef(false);
  const endedRef = useRef(false);
  const offerSentRef = useRef(false);
  const acceptStartedRef = useRef(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const [status, setStatus] = useState<'ringing' | 'connecting' | 'connected' | 'ended' | 'error'>(
    direction === 'outgoing' ? 'connecting' : 'ringing'
  );
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [hasRemote, setHasRemote] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [accepting, setAccepting] = useState(false);
  const connectedRef = useRef(false);

  const showVideo = mode === 'video';

  useEffect(() => {
    connectedRef.current = hasRemote || status === 'connected';
  }, [hasRemote, status]);

  const title = useMemo(() => {
    const name = otherUsername ? `@${otherUsername}` : 'Përdoruesi';
    if (status === 'ringing') {
      return direction === 'incoming'
        ? `Thirrje ${mode === 'video' ? 'video' : 'audio'} nga ${name}`
        : `Duke thirrur ${name}...`;
    }
    if (status === 'connecting') return `Duke u lidhur me ${name}...`;
    if (status === 'connected') return mode === 'video' ? name : `Në thirrje me ${name}`;
    if (status === 'ended') return 'Thirrja u mbyll';
    if (status === 'error') return 'Gabim thirrje';
    return 'Thirrje';
  }, [otherUsername, status, direction, mode]);

  const emitSignal = useCallback(
    (event: string, payload: Record<string, unknown> = {}) => {
      if (endedRef.current) return;
      socket.emit(event, { toUserId: otherUserId, conversationId, ...payload });
    },
    [socket, otherUserId, conversationId]
  );

  const cleanupLocal = useCallback(() => {
    closePeerConnection(pcRef.current);
    pcRef.current = null;
    stopMediaStream(localStreamRef.current);
    localStreamRef.current = null;
    iceQueueRef.current = [];
    remoteReadyRef.current = false;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  }, []);

  const finishCall = useCallback(
    (reason: string, emitEvent?: 'end' | 'reject' | 'none') => {
      if (endedRef.current) return;
      endedRef.current = true;

      if (emitEvent === 'end') emitSignal('call:end', { reason });
      if (emitEvent === 'reject') emitSignal('call:reject', { reason });

      cleanupLocal();
      setStatus('ended');
      onClose();
    },
    [cleanupLocal, emitSignal, onClose]
  );

  const createPeer = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({ iceServers: getIceServers() });

    pc.onicecandidate = (ev) => {
      if (!ev.candidate || endedRef.current) return;
      emitSignal('call:ice', { candidate: ev.candidate });
    };

    pc.ontrack = (ev) => {
      const stream = ev.streams?.[0];
      if (!stream) return;
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        void remoteVideoRef.current.play().catch(() => {});
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        void remoteAudioRef.current.play().catch(() => {});
      }
      setHasRemote(true);
      setStatus('connected');
      onConnected?.();
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') setStatus('connected');
      if (state === 'failed') {
        setError('Lidhja dështoi. Kontrollo internetin dhe provo përsëri.');
        setStatus('error');
      }
      if (state === 'disconnected') {
        setError('Lidhja u ndërpre.');
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' && !endedRef.current) {
        setError('Nuk u arrit lidhja audio/video. Provo përsëri.');
        setStatus('error');
      }
    };

    pcRef.current = pc;
    return pc;
  }, [emitSignal, onConnected]);

  const getLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: showVideo
        ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        : false,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      void localVideoRef.current.play().catch(() => {});
    }
    return stream;
  }, [showVideo]);

  const queueOrAddIce = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      const pc = pcRef.current;
      if (!pc || endedRef.current) return;
      if (!remoteReadyRef.current || !pc.remoteDescription) {
        iceQueueRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        iceQueueRef.current.push(candidate);
      }
    },
    []
  );

  const startOutgoingCall = useCallback(async () => {
    if (offerSentRef.current || endedRef.current) return;
    offerSentRef.current = true;

    const pc = createPeer();
    const stream = await getLocalStream();
    attachLocalTracks(pc, stream);

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: showVideo,
    });
    await pc.setLocalDescription(offer);
    emitSignal('call:offer', { mode, sdp: offer });
    setStatus('connecting');
  }, [createPeer, getLocalStream, showVideo, emitSignal, mode]);

  const acceptCall = useCallback(async () => {
    if (!incomingOffer || acceptStartedRef.current || endedRef.current) return;
    acceptStartedRef.current = true;

    emitSignal('call:ringing', {});

    const pc = createPeer();
    const stream = await getLocalStream();
    attachLocalTracks(pc, stream);

    await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
    remoteReadyRef.current = true;
    await flushIceQueue(pc, iceQueueRef.current);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    emitSignal('call:answer', { sdp: answer });
    setStatus('connecting');
  }, [incomingOffer, createPeer, getLocalStream, emitSignal]);

  // Socket listeners
  useEffect(() => {
    const onAnswer = async (payload: {
      fromUserId: string;
      conversationId?: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (endedRef.current) return;
      if (String(payload.fromUserId) !== String(otherUserId)) return;
      if (payload.conversationId && payload.conversationId !== conversationId) return;

      const pc = pcRef.current;
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        remoteReadyRef.current = true;
        await flushIceQueue(pc, iceQueueRef.current);
        setStatus('connecting');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Gabim në përgjigje.');
        setStatus('error');
      }
    };

    const onIce = async (payload: {
      fromUserId: string;
      conversationId?: string;
      candidate: RTCIceCandidateInit;
    }) => {
      if (String(payload.fromUserId) !== String(otherUserId)) return;
      if (payload.conversationId && payload.conversationId !== conversationId) return;
      await queueOrAddIce(payload.candidate);
    };

    const onRemoteEnd = (payload: { fromUserId: string; conversationId?: string; reason?: string }) => {
      if (String(payload.fromUserId) !== String(otherUserId)) return;
      if (payload.conversationId && payload.conversationId !== conversationId) return;
      finishCall(payload.reason || 'remote_end', 'none');
    };

    const onRinging = () => {
      if (direction === 'outgoing') setStatus('connecting');
    };

    socket.on('call:answer', onAnswer);
    socket.on('call:ice', onIce);
    socket.on('call:end', onRemoteEnd);
    socket.on('call:reject', onRemoteEnd);
    socket.on('call:ringing', onRinging);

    return () => {
      socket.off('call:answer', onAnswer);
      socket.off('call:ice', onIce);
      socket.off('call:end', onRemoteEnd);
      socket.off('call:reject', onRemoteEnd);
      socket.off('call:ringing', onRinging);
    };
  }, [socket, otherUserId, conversationId, direction, queueOrAddIce, finishCall]);

  // Outgoing: nis thirrjen një herë
  useEffect(() => {
    if (direction !== 'outgoing') return;

    startOutgoingCall().catch((e) => {
      if (endedRef.current) return;
      const msg = e instanceof Error ? e.message : 'Nuk u nis thirrja.';
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setError('Lejo mikrofonin/kamerën në browser.');
      } else {
        setError(msg);
      }
      setStatus('error');
    });

    const ringTimer = setTimeout(() => {
      if (!endedRef.current && !connectedRef.current) {
        setError('Nuk u përgjigj. Provo përsëri më vonë.');
        finishCall('no_answer', 'end');
      }
    }, RING_TIMEOUT_MS);

    return () => {
      clearTimeout(ringTimer);
      cleanupLocal();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kohëzgjatja thirrjes
  useEffect(() => {
    if (status !== 'connected') return;
    const t = setInterval(() => setDurationSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  const onHangup = () => finishCall('hangup', 'end');
  const onDecline = () => finishCall('declined', 'reject');

  const onAccept = () => {
    acceptCall().catch((e) => {
      acceptStartedRef.current = false;
      const msg = e instanceof Error ? e.message : 'Nuk u pranua thirrja.';
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setError('Lejo mikrofonin/kamerën për të pranuar.');
      } else {
        setError(msg);
      }
      setStatus('error');
    });
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  };

  const toggleCam = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !camOff;
    stream.getVideoTracks().forEach((t) => (t.enabled = !next));
    setCamOff(next);
  };

  const showWaitingOverlay = !hasRemote && status !== 'connected';

  return (
    <div className="call-overlay fixed inset-0 z-[200] bg-black flex flex-col safe-area-pt safe-area-pb">
      {showVideo ? (
        <div className="relative flex-1 min-h-0 bg-black">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover bg-zinc-900"
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`absolute top-4 right-4 w-[28vw] max-w-[120px] aspect-[3/4] rounded-2xl object-cover border-2 border-white/30 shadow-lg z-10 transition-opacity ${
              camOff ? 'opacity-30' : 'opacity-100'
            }`}
          />
          {showWaitingOverlay && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 px-6 text-center z-20 bg-black/40">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-3xl mb-4 animate-pulse">
                📹
              </div>
              <p className="text-lg font-semibold">{title}</p>
              {error && <p className="text-sm text-red-300 mt-2 max-w-[280px]">{error}</p>}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-white px-6 text-center">
          <audio ref={remoteAudioRef} autoPlay playsInline />
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--ig-blue)]/40 to-purple-600/40 flex items-center justify-center text-4xl mb-6 animate-pulse ring-4 ring-white/10">
            {otherUsername ? otherUsername.charAt(0).toUpperCase() : '📞'}
          </div>
          <p className="text-xl font-semibold">{title}</p>
          {status === 'connected' && (
            <p className="text-green-400 text-sm font-medium mt-2">{formatDuration(durationSec)}</p>
          )}
          <p className="text-white/60 text-sm mt-2">
            {status === 'ringing' && direction === 'incoming' && 'Thirrje hyrëse...'}
            {status === 'connecting' && 'Duke u lidhur...'}
            {status === 'connected' && !hasRemote && 'Duke pritur audio...'}
          </p>
          {error && <p className="text-sm text-red-300 mt-3 max-w-[280px]">{error}</p>}
        </div>
      )}

      {status === 'connected' && showVideo && (
        <div className="absolute top-6 left-0 right-0 text-center z-20 pointer-events-none">
          <span className="inline-block px-3 py-1 rounded-full bg-black/50 text-white text-sm font-medium">
            {formatDuration(durationSec)}
          </span>
        </div>
      )}

      <div className="call-controls flex-shrink-0 px-6 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {direction === 'incoming' && status === 'ringing' ? (
          <div className="flex flex-col items-center gap-6">
            <p className="text-white/70 text-sm">Rrëshqit për të përgjigjur</p>
            <div className="flex items-center justify-center gap-10">
              <button
                type="button"
                onClick={onDecline}
                className="w-[72px] h-[72px] rounded-full bg-red-500 text-white flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform"
                aria-label="Refuzo"
              >
                <span className="text-2xl">✕</span>
                <span className="text-[10px] mt-0.5 font-medium">Refuzo</span>
              </button>
              <button
                type="button"
                onClick={onAccept}
                disabled={accepting}
                className="w-[72px] h-[72px] rounded-full bg-green-500 text-white flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-60"
                aria-label="Prano"
              >
                <span className="text-2xl">✓</span>
                <span className="text-[10px] mt-0.5 font-medium">Prano</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-5 flex-wrap">
            <button
              type="button"
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex flex-col items-center justify-center text-lg ${
                muted ? 'bg-white text-black' : 'bg-white/20 text-white'
              }`}
              aria-label={muted ? 'Aktivo zërin' : 'Hesht'}
            >
              {muted ? '🔇' : '🎤'}
            </button>
            {showVideo && (
              <button
                type="button"
                onClick={toggleCam}
                className={`w-14 h-14 rounded-full flex flex-col items-center justify-center text-lg ${
                  camOff ? 'bg-white text-black' : 'bg-white/20 text-white'
                }`}
                aria-label={camOff ? 'Aktivo kamerën' : 'Fik kamerën'}
              >
                {camOff ? '📷' : '📹'}
              </button>
            )}
            <button
              type="button"
              onClick={onHangup}
              className="w-[72px] h-[72px] rounded-full bg-red-500 text-white flex flex-col items-center justify-center shadow-lg active:scale-95 transition-transform"
              aria-label="Mbyll"
            >
              <span className="text-2xl">✕</span>
              <span className="text-[10px] mt-0.5 font-medium">Mbyll</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
