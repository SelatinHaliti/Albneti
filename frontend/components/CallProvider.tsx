'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useSocket } from '@/components/SocketProvider';
import { useToastStore } from '@/store/useToastStore';
import { CallModal } from '@/components/CallModal';

export type CallMode = 'audio' | 'video';

export type ActiveCall =
  | {
      direction: 'outgoing';
      conversationId: string;
      otherUserId: string;
      otherUsername?: string;
      mode: CallMode;
    }
  | {
      direction: 'incoming';
      conversationId: string;
      otherUserId: string;
      otherUsername?: string;
      mode: CallMode;
      offerSdp: RTCSessionDescriptionInit;
    };

type CallContextType = {
  activeCall: ActiveCall | null;
  startCall: (opts: {
    conversationId: string;
    otherUserId: string;
    otherUsername?: string;
    mode: CallMode;
  }) => void;
  endCall: () => void;
};

const CallContext = createContext<CallContextType>({
  activeCall: null,
  startCall: () => {},
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

export function CallProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { socket } = useSocket();
  const toastError = useToastStore((s) => s.error);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const ringStopRef = useRef<(() => void) | null>(null);

  const stopRing = useCallback(() => {
    ringStopRef.current?.();
    ringStopRef.current = null;
  }, []);

  const endCall = useCallback(() => {
    stopRing();
    setActiveCall(null);
  }, [stopRing]);

  const startCall = useCallback(
    (opts: { conversationId: string; otherUserId: string; otherUsername?: string; mode: CallMode }) => {
      if (!socket?.connected || !user) return;
      stopRing();
      setActiveCall({
        direction: 'outgoing',
        conversationId: opts.conversationId,
        otherUserId: opts.otherUserId,
        otherUsername: opts.otherUsername,
        mode: opts.mode,
      });
    },
    [socket, user, stopRing]
  );

  useEffect(() => {
    if (!socket || !user) return;

    const onOffer = (payload: {
      fromUserId: string;
      fromUsername?: string;
      conversationId?: string;
      mode: CallMode;
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (!payload.conversationId || !payload.fromUserId) return;
      if (String(payload.fromUserId) === String(user.id)) return;

      stopRing();
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

    const onEnd = (payload: { fromUserId: string; conversationId?: string }) => {
      setActiveCall((current) => {
        if (!current) return null;
        if (String(payload.fromUserId) !== String(current.otherUserId)) return current;
        if (payload.conversationId && payload.conversationId !== current.conversationId) return current;
        stopRing();
        return null;
      });
    };

    const onBusy = () => {
      stopRing();
      setActiveCall(null);
      toastError('Përdoruesi është i zënë ose offline.');
    };

    const onCallError = () => {
      stopRing();
      setActiveCall(null);
    };

    socket.on('call:offer', onOffer);
    socket.on('call:end', onEnd);
    socket.on('call:reject', onEnd);
    socket.on('call:busy', onBusy);
    socket.on('call:error', onCallError);

    return () => {
      socket.off('call:offer', onOffer);
      socket.off('call:end', onEnd);
      socket.off('call:reject', onEnd);
      socket.off('call:busy', onBusy);
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
      {activeCall && socket && user && (
        <CallModal
          socket={socket}
          selfUserId={user.id}
          otherUserId={activeCall.otherUserId}
          conversationId={activeCall.conversationId}
          otherUsername={activeCall.otherUsername}
          direction={activeCall.direction}
          mode={activeCall.mode}
          offerSdp={activeCall.direction === 'incoming' ? activeCall.offerSdp : undefined}
          onClose={endCall}
          onConnected={handleAcceptNavigate}
        />
      )}
    </CallContext.Provider>
  );
}
