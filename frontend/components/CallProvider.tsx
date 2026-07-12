'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocket } from '@/components/SocketProvider';
import { useToastStore } from '@/store/useToastStore';
import { CallModal } from '@/components/CallModal';
import { acquireLocalMedia, resolveIceServers } from '@/lib/webrtc';
import {
  stopCallRingtone,
  syncCallRingPhase,
  type CallRingPhase,
} from '@/lib/callRingtone';

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
  stopRing: () => void;
};

const CallContext = createContext<CallContextType>({
  activeCall: null,
  startCall: async () => {},
  endCall: () => {},
  stopRing: () => {},
});

export function useCall() {
  return useContext(CallContext);
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
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { socket } = useSocket();
  const toastError = useToastStore((s) => s.error);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [ringPhase, setRingPhase] = useState<CallRingPhase>('idle');
  const activeCallRef = useRef<ActiveCall | null>(null);
  const signalingBridgeRef = useRef<ReturnType<typeof createSignalingBridge> | null>(null);
  const callSocketRef = useRef(socket);
  const callEndedEmittedRef = useRef(false);

  activeCallRef.current = activeCall;

  useEffect(() => {
    if (socket) callSocketRef.current = socket;
  }, [socket]);

  const stopRing = useCallback(() => {
    setRingPhase('active');
    stopCallRingtone();
  }, []);

  const silenceRing = useCallback(() => {
    setRingPhase('active');
    stopCallRingtone();
  }, []);

  const endCall = useCallback(() => {
    setRingPhase('idle');
    stopCallRingtone();
    signalingBridgeRef.current?.reset();
    signalingBridgeRef.current = null;
    callEndedEmittedRef.current = false;
    setActiveCall((current) => {
      if (current?.direction === 'outgoing' && current.localStream) {
        current.localStream.getTracks().forEach((t) => t.stop());
      }
      return null;
    });
  }, []);

  const emitCallEnd = useCallback((reason: string) => {
    if (callEndedEmittedRef.current) return;
    const current = activeCallRef.current;
    const s = callSocketRef.current;
    if (!current || !s?.connected) return;
    callEndedEmittedRef.current = true;
    s.emit('call:end', {
      toUserId: current.otherUserId,
      conversationId: current.conversationId,
      reason,
    });
  }, []);

  // Një burim i vetëm i së vërtetës për ringringun
  useEffect(() => {
    syncCallRingPhase(ringPhase);
    return () => {
      if (ringPhase !== 'idle') stopCallRingtone();
    };
  }, [ringPhase]);

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

      setRingPhase('idle');
      stopCallRingtone();
      signalingBridgeRef.current?.reset();
      signalingBridgeRef.current = createSignalingBridge();
      callEndedEmittedRef.current = false;

      try {
        const localStream = await acquireLocalMedia(opts.mode);
        void resolveIceServers();
        setActiveCall({
          direction: 'outgoing',
          conversationId: opts.conversationId,
          otherUserId: opts.otherUserId,
          otherUsername: opts.otherUsername,
          mode: opts.mode,
          localStream,
        });
        setRingPhase('outgoing');
      } catch (e) {
        setRingPhase('idle');
        stopCallRingtone();
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
    [socket, user, toastError]
  );

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

      stopCallRingtone();
      signalingBridgeRef.current?.reset();
      signalingBridgeRef.current = createSignalingBridge();
      callEndedEmittedRef.current = false;
      void resolveIceServers();
      setActiveCall({
        direction: 'incoming',
        conversationId: payload.conversationId,
        otherUserId: payload.fromUserId,
        otherUsername: payload.fromUsername,
        mode: payload.mode,
        offerSdp: payload.sdp,
      });
      setRingPhase('incoming');
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
      setRingPhase('active');
      stopCallRingtone();
      signalingBridgeRef.current?.pushAnswer(payload.sdp);
    };

    const onCalleeRinging = (payload: { fromUserId: string; conversationId?: string }) => {
      if (!matchesActiveCall(payload.fromUserId, payload.conversationId)) return;
      setRingPhase('active');
      stopCallRingtone();
    };

    const onBusy = (payload: { fromUserId: string; conversationId?: string }) => {
      if (!matchesActiveCall(payload.fromUserId, payload.conversationId)) return;
      setRingPhase('idle');
      stopCallRingtone();
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

    const onOffline = (payload: { fromUserId: string; conversationId?: string }) => {
      if (!matchesActiveCall(payload.fromUserId, payload.conversationId)) return;
      setRingPhase('idle');
      stopCallRingtone();
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
      setRingPhase('idle');
      stopCallRingtone();
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
    socket.on('call:ringing', onCalleeRinging);
    socket.on('call:busy', onBusy);
    socket.on('call:offline', onOffline);
    socket.on('call:error', onCallError);

    return () => {
      socket.off('call:offer', onOffer);
      socket.off('call:ice', onIce);
      socket.off('call:answer', onAnswer);
      socket.off('call:ringing', onCalleeRinging);
      socket.off('call:busy', onBusy);
      socket.off('call:offline', onOffline);
      socket.off('call:error', onCallError);
      setRingPhase('idle');
      stopCallRingtone();
    };
  }, [socket, user, toastError]);

  const handleAcceptNavigate = useCallback(() => {
    setRingPhase('active');
    stopCallRingtone();
    const convId = activeCallRef.current?.conversationId;
    if (!convId) return;
    const target = `/mesazhe/${convId}`;
    if (pathname !== target) {
      router.push(target);
    }
  }, [pathname, router]);

  const callSocket = socket || callSocketRef.current;

  return (
    <CallContext.Provider value={{ activeCall, startCall, endCall, stopRing }}>
      {children}
      {activeCall && user && signalingBridgeRef.current && callSocket && activeCall.direction === 'incoming' && activeCall.offerSdp && (
        <CallModal
          socket={callSocket}
          selfUserId={user.id}
          otherUserId={activeCall.otherUserId}
          conversationId={activeCall.conversationId}
          otherUsername={activeCall.otherUsername}
          direction="incoming"
          mode={activeCall.mode}
          offerSdp={activeCall.offerSdp}
          signalingBridge={signalingBridgeRef.current}
          onClose={endCall}
          onStopRing={silenceRing}
          onConnected={handleAcceptNavigate}
          onEmitCallEnd={emitCallEnd}
        />
      )}
      {activeCall && user && signalingBridgeRef.current && callSocket && activeCall.direction === 'outgoing' && activeCall.localStream && (
        <CallModal
          socket={callSocket}
          selfUserId={user.id}
          otherUserId={activeCall.otherUserId}
          conversationId={activeCall.conversationId}
          otherUsername={activeCall.otherUsername}
          direction="outgoing"
          mode={activeCall.mode}
          localStream={activeCall.localStream}
          signalingBridge={signalingBridgeRef.current}
          onClose={endCall}
          onStopRing={silenceRing}
          onConnected={handleAcceptNavigate}
          onEmitCallEnd={emitCallEnd}
        />
      )}
    </CallContext.Provider>
  );
}
