'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { getIceServers, flushIceQueue } from '@/lib/webrtc';

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

export function CallModal(props: OutgoingProps | IncomingProps) {
  const { socket, otherUserId, conversationId, otherUsername, onClose, onConnected } = props;
  const direction = props.direction;
  const mode = props.mode;

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteReadyRef = useRef(false);
  const signalSentRef = useRef(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const [status, setStatus] = useState<'ringing' | 'connecting' | 'connected' | 'ended' | 'error'>(
    direction === 'outgoing' ? 'connecting' : 'ringing'
  );
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

  const showVideo = mode === 'video';
  const title = useMemo(() => {
    const name = otherUsername ? `@${otherUsername}` : 'Përdoruesi';
    if (status === 'ringing') return direction === 'incoming' ? `Thirrje ${mode === 'video' ? 'video' : 'audio'}` : `Duke thirrur ${name}...`;
    if (status === 'connecting') return `Duke u lidhur me ${name}...`;
    if (status === 'connected') return mode === 'video' ? name : `Në thirrje me ${name}`;
    if (status === 'ended') return 'Thirrja u mbyll';
    return 'Thirrje';
  }, [otherUsername, status, direction, mode]);

  const cleanupLocal = () => {
    try {
      pcRef.current?.getSenders()?.forEach((s) => s.track?.stop());
    } catch {
      /* ignore */
    }
    try {
      pcRef.current?.close();
    } catch {
      /* ignore */
    }
    pcRef.current = null;
    iceQueueRef.current = [];
    remoteReadyRef.current = false;

    try {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      /* ignore */
    }
    localStreamRef.current = null;
  };

  const emitSignal = (event: string, payload: Record<string, unknown>) => {
    socket.emit(event, { toUserId: otherUserId, conversationId, ...payload });
  };

  const ensurePeer = () => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: getIceServers() });

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      emitSignal('call:ice', { candidate: ev.candidate });
    };

    pc.ontrack = (ev) => {
      const stream = ev.streams?.[0];
      if (!stream) return;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream;
      setStatus('connected');
      onConnected?.();
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') setStatus('connected');
      if (state === 'failed') {
        setError('Lidhja dështoi. Provoni përsëri.');
        setStatus('error');
      }
      if (state === 'disconnected' || state === 'closed') {
        setStatus('ended');
      }
    };

    pcRef.current = pc;
    return pc;
  };

  const queueOrAddIce = async (candidate: RTCIceCandidateInit) => {
    const pc = ensurePeer();
    if (!remoteReadyRef.current || !pc.remoteDescription) {
      iceQueueRef.current.push(candidate);
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      iceQueueRef.current.push(candidate);
    }
  };

  const startLocalMedia = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: showVideo ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
    });
    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    return stream;
  };

  const placeOffer = async () => {
    const pc = ensurePeer();
    const stream = await startLocalMedia();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: showVideo });
    await pc.setLocalDescription(offer);
    emitSignal('call:offer', { mode, sdp: offer });
    setStatus('connecting');
  };

  const acceptIncoming = async (offerSdp: RTCSessionDescriptionInit) => {
    const pc = ensurePeer();
    const stream = await startLocalMedia();
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
    remoteReadyRef.current = true;
    await flushIceQueue(pc, iceQueueRef.current);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    emitSignal('call:answer', { sdp: answer });
    setStatus('connecting');
  };

  useEffect(() => {
    const onAnswer = async (payload: { fromUserId: string; conversationId?: string; sdp: RTCSessionDescriptionInit }) => {
      if (String(payload.fromUserId) !== String(otherUserId)) return;
      if (payload.conversationId && payload.conversationId !== conversationId) return;
      try {
        const pc = ensurePeer();
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        remoteReadyRef.current = true;
        await flushIceQueue(pc, iceQueueRef.current);
        setStatus('connecting');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Gabim në përgjigje.');
        setStatus('error');
      }
    };

    const onIce = async (payload: { fromUserId: string; conversationId?: string; candidate: RTCIceCandidateInit }) => {
      if (String(payload.fromUserId) !== String(otherUserId)) return;
      if (payload.conversationId && payload.conversationId !== conversationId) return;
      await queueOrAddIce(payload.candidate);
    };

    const onEnd = (payload: { fromUserId: string; conversationId?: string }) => {
      if (String(payload.fromUserId) !== String(otherUserId)) return;
      if (payload.conversationId && payload.conversationId !== conversationId) return;
      setStatus('ended');
      cleanupLocal();
      onClose();
    };

    const onReject = onEnd;
    const onRinging = () => setStatus('connecting');

    socket.on('call:answer', onAnswer);
    socket.on('call:ice', onIce);
    socket.on('call:end', onEnd);
    socket.on('call:reject', onReject);
    socket.on('call:ringing', onRinging);

    return () => {
      socket.off('call:answer', onAnswer);
      socket.off('call:ice', onIce);
      socket.off('call:end', onEnd);
      socket.off('call:reject', onReject);
      socket.off('call:ringing', onRinging);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, otherUserId, conversationId]);

  useEffect(() => {
    let cancelled = false;
    if (direction === 'outgoing') {
      (async () => {
        try {
          await placeOffer();
        } catch (e) {
          if (cancelled) return;
          const msg = e instanceof Error ? e.message : 'Nuk u nis thirrja.';
          if (msg.includes('Permission') || msg.includes('NotAllowed')) {
            setError('Lejo mikrofonin/kamerën në browser për të folur.');
          } else {
            setError(msg);
          }
          setStatus('error');
        }
      })();
    }
    return () => {
      cancelled = true;
      cleanupLocal();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hangup = (reason: string, emit = true) => {
    if (emit && !signalSentRef.current) {
      signalSentRef.current = true;
      emitSignal('call:end', { reason });
    }
    setStatus('ended');
    cleanupLocal();
    onClose();
  };

  const onAccept = async () => {
    if (direction !== 'incoming' || !props.offerSdp) return;
    try {
      emitSignal('call:ringing', {});
      await acceptIncoming(props.offerSdp);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Nuk u pranua thirrja.';
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setError('Lejo mikrofonin/kamerën për të pranuar thirrjen.');
      } else {
        setError(msg);
      }
      setStatus('error');
    }
  };

  const onDecline = () => {
    if (!signalSentRef.current) {
      signalSentRef.current = true;
      emitSignal('call:reject', { reason: 'declined' });
    }
    hangup('declined', false);
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

  return (
    <div className="call-overlay fixed inset-0 z-[200] bg-black flex flex-col safe-area-pt safe-area-pb">
      {showVideo ? (
        <div className="relative flex-1 min-h-0 bg-black">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute top-4 right-4 w-[28vw] max-w-[120px] aspect-[3/4] rounded-2xl object-cover border-2 border-white/30 shadow-lg z-10"
          />
          {!remoteVideoRef.current?.srcObject && status !== 'connected' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 px-6 text-center">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-3xl mb-4">
                {mode === 'video' ? '📹' : '📞'}
              </div>
              <p className="text-lg font-semibold">{title}</p>
              {error && <p className="text-sm text-red-300 mt-2">{error}</p>}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-white px-6 text-center">
          <audio ref={remoteAudioRef} autoPlay playsInline />
          <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center text-4xl mb-6 animate-pulse">
            📞
          </div>
          <p className="text-xl font-semibold">{title}</p>
          <p className="text-white/60 text-sm mt-2">
            {status === 'ringing' && direction === 'incoming' ? 'Thirrje hyrëse...' : status === 'connecting' ? 'Duke u lidhur...' : ''}
          </p>
          {error && <p className="text-sm text-red-300 mt-3">{error}</p>}
        </div>
      )}

      <div className="call-controls flex-shrink-0 px-6 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {direction === 'incoming' && status === 'ringing' ? (
          <div className="flex items-center justify-center gap-8">
            <button
              type="button"
              onClick={onDecline}
              className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center text-2xl shadow-lg"
              aria-label="Refuzo"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center text-2xl shadow-lg"
              aria-label="Prano"
            >
              ✓
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              type="button"
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-xl ${muted ? 'bg-white text-black' : 'bg-white/20 text-white'}`}
              aria-label={muted ? 'Aktivo zërin' : 'Hesht'}
            >
              {muted ? '🔇' : '🎤'}
            </button>
            {showVideo && (
              <button
                type="button"
                onClick={toggleCam}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-xl ${camOff ? 'bg-white text-black' : 'bg-white/20 text-white'}`}
                aria-label={camOff ? 'Aktivo kamerën' : 'Fik kamerën'}
              >
                {camOff ? '📷' : '📹'}
              </button>
            )}
            <button
              type="button"
              onClick={() => hangup('hangup')}
              className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center text-2xl shadow-lg"
              aria-label="Mbyll"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
