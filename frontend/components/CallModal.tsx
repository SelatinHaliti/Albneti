'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import type { CallSignalingBridge } from '@/components/CallProvider';
import {
  getPeerConnectionConfig,
  flushIceQueue,
  attachLocalTracks,
  acquireLocalMedia,
  switchCamera,
  hasMultipleCameras,
  facingFromTrack,
  isMobileDevice,
  stopMediaStream,
  closePeerConnection,
  waitForIceGathering,
} from '@/lib/webrtc';
import { stopCallRingtone } from '@/lib/callRingtone';
import { CallControlButton } from '@/components/CallControls';
import {
  IconCallMic,
  IconCallMicOff,
  IconCallVideo,
  IconCallVideoOff,
  IconCallFlip,
  IconCallEnd,
  IconCallAccept,
  IconCallDecline,
  IconCallPhone,
  IconCallSpinner,
} from '@/components/Icons';

type CallMode = 'audio' | 'video';

type CommonProps = {
  socket: Socket;
  selfUserId: string;
  otherUserId: string;
  conversationId: string;
  otherUsername?: string;
  signalingBridge: CallSignalingBridge;
  onClose: () => void;
  onStopRing: () => void;
  onConnected?: () => void;
};

type OutgoingProps = CommonProps & {
  direction: 'outgoing';
  mode: CallMode;
  localStream: MediaStream;
  offerSdp?: undefined;
};

type IncomingProps = CommonProps & {
  direction: 'incoming';
  mode: CallMode;
  offerSdp: RTCSessionDescriptionInit;
  localStream?: undefined;
};

const RING_TIMEOUT_MS = 45000;

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function CallModal(props: OutgoingProps | IncomingProps) {
  const {
    socket,
    otherUserId,
    conversationId,
    otherUsername,
    signalingBridge,
    onClose,
    onStopRing,
    onConnected,
  } = props;
  const direction = props.direction;
  const mode = props.mode;
  const showVideo = mode === 'video';
  const incomingOffer = direction === 'incoming' ? props.offerSdp : null;
  const preAcquiredStream = direction === 'outgoing' ? props.localStream : null;

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(preAcquiredStream);
  const iceQueueRef = useRef<RTCIceCandidateInit[]>([...signalingBridge.iceCandidates]);
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
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [canFlipCamera, setCanFlipCamera] = useState(showVideo);
  const [flippingCam, setFlippingCam] = useState(false);
  const [hasRemote, setHasRemote] = useState(false);
  const [durationSec, setDurationSec] = useState(0);
  const [accepting, setAccepting] = useState(false);
  const connectedRef = useRef(false);

  useEffect(() => {
    connectedRef.current = hasRemote || status === 'connected';
  }, [hasRemote, status]);

  // Shfaq video lokale nëse stream është marrë para mount
  const refreshCameraFlip = useCallback(async (stream?: MediaStream | null) => {
    if (!showVideo) {
      setCanFlipCamera(false);
      return;
    }
    const canFlip = await hasMultipleCameras(stream ?? localStreamRef.current);
    setCanFlipCamera(canFlip || isMobileDevice());
    const track = (stream ?? localStreamRef.current)?.getVideoTracks()[0];
    const detected = facingFromTrack(track);
    if (detected) setFacingMode(detected);
  }, [showVideo]);

  useEffect(() => {
    if (!showVideo) return;
    void refreshCameraFlip(localStreamRef.current);
  }, [showVideo, refreshCameraFlip]);

  // Shfaq video lokale nëse stream është marrë para mount
  useEffect(() => {
    const stream = localStreamRef.current;
    if (stream && localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      void localVideoRef.current.play().catch(() => {});
      void refreshCameraFlip(stream);
    }
  }, [refreshCameraFlip]);

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
    if (direction === 'incoming' || !preAcquiredStream) {
      stopMediaStream(localStreamRef.current);
    }
    localStreamRef.current = direction === 'outgoing' ? preAcquiredStream : null;
    iceQueueRef.current = [];
    remoteReadyRef.current = false;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (localVideoRef.current && direction === 'incoming') localVideoRef.current.srcObject = null;
  }, [direction, preAcquiredStream]);

  const finishCall = useCallback(
    (reason: string, emitEvent?: 'end' | 'reject' | 'none') => {
      if (endedRef.current) return;
      endedRef.current = true;
      stopCallRingtone();
      onStopRing();

      if (emitEvent === 'end') emitSignal('call:end', { reason });
      if (emitEvent === 'reject') emitSignal('call:reject', { reason });

      cleanupLocal();
      setStatus('ended');
      onClose();
    },
    [cleanupLocal, emitSignal, onClose, onStopRing]
  );

  const attachRemoteStream = useCallback(
    (stream: MediaStream) => {
      stopCallRingtone();
      onStopRing();
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
    },
    [onConnected, onStopRing]
  );

  const createPeer = useCallback(async () => {
    if (pcRef.current) return pcRef.current;

    const config = await getPeerConnectionConfig();
    const pc = new RTCPeerConnection(config);

    pc.onicecandidate = (ev) => {
      if (!ev.candidate || endedRef.current) return;
      emitSignal('call:ice', { candidate: ev.candidate });
    };

    pc.ontrack = (ev) => {
      const stream = ev.streams?.[0];
      if (!stream) return;
      attachRemoteStream(stream);
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') setStatus('connected');
      if (state === 'failed' && !endedRef.current) {
        setError('Lidhja dështoi. Kontrollo internetin dhe provo përsëri.');
        setStatus('error');
      }
      if (state === 'disconnected') {
        setError('Lidhja u ndërpre.');
      }
    };

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      if (iceState === 'connected' || iceState === 'completed') {
        setStatus('connected');
      }
      if (iceState === 'failed' && !endedRef.current) {
        setError('Nuk u arrit lidhja audio/video. Kontrollo rrjetin ose provo përsëri.');
        setStatus('error');
      }
    };

    pcRef.current = pc;
    return pc;
  }, [emitSignal, attachRemoteStream]);

  const getLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await acquireLocalMedia(mode, facingMode);
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      void localVideoRef.current.play().catch(() => {});
    }
    void refreshCameraFlip(stream);
    return stream;
  }, [mode, facingMode, refreshCameraFlip]);

  const queueOrAddIce = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (endedRef.current) return;
    const pc = pcRef.current;
    if (!pc || !remoteReadyRef.current || !pc.remoteDescription) {
      iceQueueRef.current.push(candidate);
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      iceQueueRef.current.push(candidate);
    }
  }, []);

  const applyAnswer = useCallback(
    async (sdp: RTCSessionDescriptionInit) => {
      if (endedRef.current) return;
      const pc = pcRef.current;
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        remoteReadyRef.current = true;
        await flushIceQueue(pc, iceQueueRef.current);
        stopCallRingtone();
        onStopRing();
        setStatus('connecting');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Gabim në përgjigje.');
        setStatus('error');
      }
    },
    [onStopRing]
  );

  const startOutgoingCall = useCallback(async () => {
    if (offerSentRef.current || endedRef.current) return;
    offerSentRef.current = true;

    const pc = await createPeer();
    const stream = await getLocalStream();
    attachLocalTracks(pc, stream);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceGathering(pc);

    const localDesc = pc.localDescription;
    if (!localDesc) throw new Error('Nuk u krijua oferta.');

    emitSignal('call:offer', { mode, sdp: localDesc });
    setStatus('connecting');
  }, [createPeer, getLocalStream, emitSignal, mode]);

  const acceptCall = useCallback(async () => {
    if (!incomingOffer || acceptStartedRef.current || endedRef.current) return;
    acceptStartedRef.current = true;

    stopCallRingtone();
    onStopRing();
    setStatus('connecting');

    emitSignal('call:ringing', {});

    const pc = await createPeer();
    const stream = await getLocalStream();
    attachLocalTracks(pc, stream);

    await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
    remoteReadyRef.current = true;
    await flushIceQueue(pc, iceQueueRef.current);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForIceGathering(pc);

    const localDesc = pc.localDescription;
    if (!localDesc) throw new Error('Nuk u krijua përgjigja.');

    emitSignal('call:answer', { sdp: localDesc });
    setStatus('connecting');
  }, [incomingOffer, createPeer, getLocalStream, emitSignal, onStopRing]);

  // ICE + answer nga signaling bridge (mos humb asnjë kandidat para mount)
  useEffect(() => {
    const unsubIce = signalingBridge.onIce((candidate) => {
      void queueOrAddIce(candidate);
    });

    const unsubAnswer = signalingBridge.onAnswer((sdp) => {
      if (direction === 'outgoing') void applyAnswer(sdp);
    });

    if (signalingBridge.pendingAnswer && direction === 'outgoing') {
      void applyAnswer(signalingBridge.pendingAnswer);
    }

    return () => {
      unsubIce();
      unsubAnswer();
    };
  }, [signalingBridge, direction, queueOrAddIce, applyAnswer]);

  // Socket listeners për end/reject/ringing
  useEffect(() => {
    const onRemoteEnd = (payload: { fromUserId: string; conversationId?: string; reason?: string }) => {
      if (String(payload.fromUserId) !== String(otherUserId)) return;
      if (payload.conversationId && payload.conversationId !== conversationId) return;
      finishCall(payload.reason || 'remote_end', 'none');
    };

    const onRinging = () => {
      if (direction === 'outgoing') {
        stopCallRingtone();
        onStopRing();
        setStatus('connecting');
      }
    };

    socket.on('call:end', onRemoteEnd);
    socket.on('call:reject', onRemoteEnd);
    socket.on('call:ringing', onRinging);

    return () => {
      socket.off('call:end', onRemoteEnd);
      socket.off('call:reject', onRemoteEnd);
      socket.off('call:ringing', onRinging);
    };
  }, [socket, otherUserId, conversationId, direction, finishCall, onStopRing]);

  // Ndal ringringun sapo nuk jemi më në pritje (prano/lidhur/gabim)
  useEffect(() => {
    if (direction === 'incoming' && status !== 'ringing') {
      stopCallRingtone();
      onStopRing();
    }
    if (status === 'connected' || status === 'error' || status === 'ended') {
      stopCallRingtone();
      onStopRing();
    }
  }, [status, direction, onStopRing]);

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
      stopCallRingtone();
      onStopRing();
      if (!endedRef.current) {
        endedRef.current = true;
        socket.emit('call:end', {
          toUserId: otherUserId,
          conversationId,
          reason: 'cancelled',
        });
      }
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

  const onDecline = () => {
    onStopRing();
    stopCallRingtone();
    finishCall('declined', 'reject');
  };
  const onHangup = () => finishCall('hangup', 'end');

  const onAccept = () => {
    if (accepting || acceptStartedRef.current) return;
    onStopRing();
    stopCallRingtone();
    setAccepting(true);
    acceptCall()
      .then(() => setAccepting(false))
      .catch((e) => {
        acceptStartedRef.current = false;
        setAccepting(false);
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

  const flipCamera = async () => {
    const stream = localStreamRef.current;
    const pc = pcRef.current;
    if (!stream || flippingCam) return;
    if (camOff) {
      toggleCam();
      await new Promise((r) => setTimeout(r, 120));
    }
    setFlippingCam(true);
    setError('');
    try {
      const { stream: updated, facing } = await switchCamera(stream, facingMode);
      localStreamRef.current = updated;
      setFacingMode(facing);
      const videoTrack = updated.getVideoTracks()[0];
      if (pc && videoTrack) {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(videoTrack);
        } else {
          pc.addTrack(videoTrack, updated);
        }
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = updated;
        await localVideoRef.current.play().catch(() => {});
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Nuk u ndryshua kamera.';
      setError(msg.includes('kamerë') ? msg : 'Nuk u ndryshua kamera. Provo përsëri.');
    } finally {
      setFlippingCam(false);
    }
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
            className={`absolute top-[max(1rem,env(safe-area-inset-top))] right-4 w-[30vw] max-w-[130px] min-w-[96px] aspect-[3/4] rounded-2xl object-cover border-2 border-white/30 shadow-lg z-10 transition-opacity pointer-events-none ${
              camOff ? 'opacity-30' : 'opacity-100'
            } ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
          {showWaitingOverlay && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 px-6 text-center z-20 bg-black/40">
              <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center mb-4 animate-pulse text-white">
                <IconCallVideo size={36} />
              </div>
              <p className="text-lg font-semibold">{title}</p>
              {error && <p className="text-sm text-red-300 mt-2 max-w-[280px]">{error}</p>}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-white px-6 text-center">
          <audio ref={remoteAudioRef} autoPlay playsInline />
          <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-[var(--ig-blue)]/50 to-indigo-600/40 flex items-center justify-center mb-6 ring-4 ring-white/10 backdrop-blur-sm ${
            status === 'ringing' ? 'animate-pulse' : ''
          }`}>
            {otherUsername ? (
              <span className="text-3xl font-bold text-white">{otherUsername.charAt(0).toUpperCase()}</span>
            ) : (
              <IconCallPhone size={36} />
            )}
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

      <div className="call-controls relative z-30 flex-shrink-0 px-4 sm:px-6 py-6 sm:py-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/90 via-black/55 to-transparent">
        {direction === 'incoming' && status === 'ringing' ? (
          <div className="flex flex-col items-center gap-6">
            <p className="text-white/70 text-sm font-medium tracking-wide">Thirrje hyrëse</p>
            <div className="flex items-center justify-center gap-12 sm:gap-16">
              <CallControlButton
                onClick={onDecline}
                ariaLabel="Refuzo thirrjen"
                label="Refuzo"
                variant="danger"
              >
                <IconCallDecline size={28} />
              </CallControlButton>
              <CallControlButton
                onClick={onAccept}
                ariaLabel="Prano thirrjen"
                label="Prano"
                variant="success"
                disabled={accepting}
              >
                {accepting ? <IconCallSpinner size={24} /> : <IconCallAccept size={28} />}
              </CallControlButton>
            </div>
          </div>
        ) : (
          <div className="call-controls-row">
            <CallControlButton
              onClick={toggleMute}
              ariaLabel={muted ? 'Aktivo zërin' : 'Hesht'}
              label={muted ? 'Heshtur' : 'Mikrofon'}
              variant={muted ? 'glass-active' : 'glass'}
            >
              {muted ? <IconCallMicOff /> : <IconCallMic />}
            </CallControlButton>

            {showVideo && (
              <>
                <CallControlButton
                  onClick={toggleCam}
                  ariaLabel={camOff ? 'Aktivo kamerën' : 'Fik kamerën'}
                  label={camOff ? 'Fikur' : 'Kamera'}
                  variant={camOff ? 'glass-active' : 'glass'}
                >
                  {camOff ? <IconCallVideoOff /> : <IconCallVideo />}
                </CallControlButton>

                {canFlipCamera && (
                  <CallControlButton
                    onClick={() => void flipCamera()}
                    ariaLabel="Kthe kamerën para/pas"
                    label="Kthe"
                    variant="glass"
                    disabled={flippingCam}
                  >
                    {flippingCam ? <IconCallSpinner /> : <IconCallFlip />}
                  </CallControlButton>
                )}
              </>
            )}

            <CallControlButton
              onClick={onHangup}
              ariaLabel="Mbyll thirrjen"
              label="Mbyll"
              variant="danger"
            >
              <IconCallEnd size={28} />
            </CallControlButton>
          </div>
        )}
      </div>
    </div>
  );
}
