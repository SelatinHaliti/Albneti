'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocket } from '@/components/SocketProvider';
import { useToastStore } from '@/store/useToastStore';
import { CallModal } from '@/components/CallModal';
import { acquireLocalMedia } from '@/lib/webrtc';

export type CallMode = 'audio' | 'video';

export type ActiveCall =
  | {
      direction: 'outgoing';
      conversationId: string;
      otherUserId: string;
      otherUsername?: string;
      mode: CallMode;
      localStream: MediaStream;
    }
  | {
      direction: 'incoming';
      conversationId: string;
      otherUserId: string;
      otherUsername?: string;
      mode: CallMode;
      offerSdp: RTCSessionDescriptionInit;
    };

export type CallSignalingBridge = {
  iceCandidates: RTCIceCandidateInit[];
  pendingAnswer: RTCSessionDescriptionInit | null;
  onIce: (handler: (candidate: RTCIceCandidateInit) => void) => () => void;
  onAnswer: (handler: (sdp: RTCSessionDescriptionInit) => void) => () => void;
  reset: () => void;
  pushIce: (candidate: RTCIceCandidateInit) => void;
  pushAnswer: (sdp: RTCSessionDescriptionInit) => void;
};

type CallContextType = {
  activeCall: ActiveCall | null;
  startCall: (opts: {
    conversationId: string;
    otherUserId: string;
    otherUsername?: string;
    mode: CallMode;
  }) => Promise<void>;
  endCall: () => void;
};

const CallContext = createContext<CallContextType>({
  activeCall: null,
  startCall: async () => {},
  endCall: () => {},
});

export function useCall() {
  return useContext(CallContext);
}

function playRingtone(stopRef: React.MutableRefObject<(() => void) | null>) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 440;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    const interval = setInterval(() => {
      osc.frequency.value = osc.frequency.value === 440 ? 480 : 440;
    }, 600);
    stopRef.current = () => {
      clearInterval(interval);
      try {
        osc.stop();
        ctx.close();
      } catch {
        /* ignore */
      }
      stopRef.current = null;
    };
  } catch {
    /* audio nuk lejohet */
  }
}

function createSignalingBridge(): CallSignalingBridge {
  const iceCandidates: RTCIceCandidateInit[] = [];
  let pendingAnswer: RTCSessionDescriptionInit | null = null;
  const iceHandlers = new Set<(candidate: RTCIceCandidateInit) => void>();
  const answerHandlers = new Set<(sdp: RTCSessionDescriptionInit) => void>();

  return {
    get iceCandidates() {
      return iceCandidates;
    },
    get pendingAnswer() {
      return pendingAnswer;
    },
    onIce(handler) {
      iceHandlers.add(handler);
      return () => iceHandlers.delete(handler);
    },
    onAnswer(handler) {
      answerHandlers.add(handler);
      if (pendingAnswer) handler(pendingAnswer);
      return () => answerHandlers.delete(handler);
    },
    reset() {
      iceCandidates.length = 0;
      pendingAnswer = null;
      iceHandlers.clear();
      answerHandlers.clear();
    },
    pushIce(candidate) {
      iceCandidates.push(candidate);
      iceHandlers.forEach((h) => h(candidate));
    },
    pushAnswer(sdp) {
      pendingAnswer = sdp;
      answerHandlers.forEach((h) => h(sdp));
    },
  };
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { socket } = useSocket();
  const toastError = useToastStore((s) => s.error);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const activeCallRef = useRef<ActiveCall | null>(null);
  const ringStopRef = useRef<(() => void) | null>(null);
  const signalingBridgeRef = useRef<ReturnType<typeof createSignalingBridge> | null>(null);

  activeCallRef.current = activeCall;

  const stopRing = useCallback(() => {
    ringStopRef.current?.();
    ringStopRef.current = null;
  }, []);

  const endCall = useCallback(() => {
    stopRing();
    signalingBridgeRef.current?.reset();
    signalingBridgeRef.current = null;
    setActiveCall((current) => {
      if (current?.direction === 'outgoing' && current.localStream) {
        current.localStream.getTracks().forEach((t) => t.stop());
      }
      return null;
    });
  }, [stopRing]);

  const startCall = useCallback(
    async (opts: {
      conversationId: string;
      otherUserId: string;
      otherUsername?: string;
      mode: CallMode;
    }) => {
      if (!socket?.connected || !user) {
        toastError('Nuk je i lidhur me serverin. Rifresko faqen.');
        return;
      }
      if (activeCallRef.current) {
        toastError('Je tashmë në një thirrje.');
        return;
      }

      stopRing();
      signalingBridgeRef.current?.reset();
      signalingBridgeRef.current = createSignalingBridge();

      try {
        const localStream = await acquireLocalMedia(opts.mode);
        setActiveCall({
          direction: 'outgoing',
          conversationId: opts.conversationId,
          otherUserId: opts.otherUserId,
          otherUsername: opts.otherUsername,
          mode: opts.mode,
          localStream,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')) {
          toastError('Lejo mikrofonin/kamerën në browser për të thirrur.');
        } else {
          toastError('Nuk u nis thirrja. Kontrollo pajisjet audio/video.');
        }
        signalingBridgeRef.current?.reset();
        signalingBridgeRef.current = null;
      }
    },
    [socket, user, stopRing, toastError]
  );

  // Global call signaling – offer, end, busy, ICE/answer buffering
  useEffect(() => {
    if (!socket || !user) return;

    const matchesActiveCall = (
      fromUserId: string,
      conversationId?: string
    ): ActiveCall | null => {
      const call = activeCallRef.current;
      if (!call) return null;
      if (String(fromUserId) !== String(call.otherUserId)) return null;
      if (conversationId && conversationId !== call.conversationId) return null;
      return call;
    };

    const onOffer = (payload: {
      fromUserId: string;
      fromUsername?: string;
      conversationId?: string;
      mode: CallMode;
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (!payload.conversationId || !payload.fromUserId) return;
      if (String(payload.fromUserId) === String(user.id)) return;
      if (activeCallRef.current) {
        socket.emit('call:busy', { toUserId: payload.fromUserId, conversationId: payload.conversationId });
        return;
      }

      stopRing();
      signalingBridgeRef.current?.reset();
      signalingBridgeRef.current = createSignalingBridge();
      playRingtone(ringStopRef);
      setActiveCall({
        direction: 'incoming',
        conversationId: payload.conversationId,
        otherUserId: payload.fromUserId,
        otherUsername: payload.fromUsername,
        mode: payload.mode,
        offerSdp: payload.sdp,
      });
    };

    const onIce = (payload: {
      fromUserId: string;
      conversationId?: string;
      candidate: RTCIceCandidateInit;
    }) => {
      if (!matchesActiveCall(payload.fromUserId, payload.conversationId)) return;
      signalingBridgeRef.current?.pushIce(payload.candidate);
    };

    const onAnswer = (payload: {
      fromUserId: string;
      conversationId?: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (!matchesActiveCall(payload.fromUserId, payload.conversationId)) return;
      signalingBridgeRef.current?.pushAnswer(payload.sdp);
    };

    const onEnd = (payload: { fromUserId: string; conversationId?: string; reason?: string }) => {
      setActiveCall((current) => {
        if (!current) return null;
        if (String(payload.fromUserId) !== String(current.otherUserId)) return current;
        if (payload.conversationId && payload.conversationId !== current.conversationId) return current;
        stopRing();
        signalingBridgeRef.current?.reset();
        signalingBridgeRef.current = null;
        if (current.direction === 'outgoing' && current.localStream) {
          current.localStream.getTracks().forEach((t) => t.stop());
        }
        if (payload.reason === 'declined') {
          toastError('Thirrja u refuzua.');
        } else if (payload.reason === 'no_answer' || payload.reason === 'disconnect') {
          toastError('Thirrja u mbyll.');
        }
        return null;
      });
    };

    const onBusy = () => {
      stopRing();
      signalingBridgeRef.current?.reset();
      signalingBridgeRef.current = null;
      setActiveCall((current) => {
        if (current?.direction === 'outgoing' && current.localStream) {
          current.localStream.getTracks().forEach((t) => t.stop());
        }
        return null;
      });
      toastError('Përdoruesi është i zënë ose offline.');
    };

    const onOffline = () => {
      stopRing();
      signalingBridgeRef.current?.reset();
      signalingBridgeRef.current = null;
      setActiveCall((current) => {
        if (current?.direction === 'outgoing' && current.localStream) {
          current.localStream.getTracks().forEach((t) => t.stop());
        }
        return null;
      });
      toastError('Përdoruesi nuk është online.');
    };

    const onCallError = (payload?: { message?: string }) => {
      stopRing();
      signalingBridgeRef.current?.reset();
      signalingBridgeRef.current = null;
      setActiveCall((current) => {
        if (current?.direction === 'outgoing' && current.localStream) {
          current.localStream.getTracks().forEach((t) => t.stop());
        }
        return null;
      });
      if (payload?.message) toastError(payload.message);
    };

    socket.on('call:offer', onOffer);
    socket.on('call:ice', onIce);
    socket.on('call:answer', onAnswer);
    socket.on('call:end', onEnd);
    socket.on('call:reject', onEnd);
    socket.on('call:busy', onBusy);
    socket.on('call:offline', onOffline);
    socket.on('call:error', onCallError);

    return () => {
      socket.off('call:offer', onOffer);
      socket.off('call:ice', onIce);
      socket.off('call:answer', onAnswer);
      socket.off('call:end', onEnd);
      socket.off('call:reject', onEnd);
      socket.off('call:busy', onBusy);
      socket.off('call:offline', onOffline);
      socket.off('call:error', onCallError);
      stopRing();
    };
  }, [socket, user, stopRing, toastError]);

  const handleAcceptNavigate = useCallback(() => {
    if (activeCall?.conversationId) {
      router.push(`/mesazhe/${activeCall.conversationId}`);
    }
  }, [activeCall, router]);

  return (
    <CallContext.Provider value={{ activeCall, startCall, endCall }}>
      {children}
      {activeCall && socket && user && signalingBridgeRef.current && (
        <CallModal
          socket={socket}
          selfUserId={user.id}
          otherUserId={activeCall.otherUserId}
          conversationId={activeCall.conversationId}
          otherUsername={activeCall.otherUsername}
          direction={activeCall.direction}
          mode={activeCall.mode}
          offerSdp={activeCall.direction === 'incoming' ? activeCall.offerSdp : undefined}
          localStream={activeCall.direction === 'outgoing' ? activeCall.localStream : undefined}
          signalingBridge={signalingBridgeRef.current}
          onClose={endCall}
          onConnected={handleAcceptNavigate}
        />
      )}
    </CallContext.Provider>
  );
}
