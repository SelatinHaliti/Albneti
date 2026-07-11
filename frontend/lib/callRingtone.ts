/**
 * Ringtone thirrje – HTMLAudio + WebAudio, ndalet menjëherë (pause + suspend + close).
 */

type RingMode = 'incoming' | 'outgoing';

const RING_AUDIO_ID = 'albnet-call-ring-audio';

let session = 0;
let mode: RingMode | null = null;
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let mediaDest: MediaStreamAudioDestinationNode | null = null;
let ringAudioEl: HTMLAudioElement | null = null;
let loopTimer: ReturnType<typeof setInterval> | null = null;
let pendingTimeouts: ReturnType<typeof setTimeout>[] = [];
let vibrateTimer: ReturnType<typeof setInterval> | null = null;
let activeOscillators: OscillatorNode[] = [];

function getRingAudioElement(): HTMLAudioElement {
  if (typeof document === 'undefined') {
    return { pause: () => {}, play: () => Promise.resolve(), } as unknown as HTMLAudioElement;
  }
  let el = document.getElementById(RING_AUDIO_ID) as HTMLAudioElement | null;
  if (!el) {
    el = document.createElement('audio');
    el.id = RING_AUDIO_ID;
    el.setAttribute('playsinline', 'true');
    el.setAttribute('webkit-playsinline', 'true');
    el.setAttribute('data-albnet-call-ring', '1');
    el.loop = false;
    el.volume = 1;
    el.style.display = 'none';
    document.body.appendChild(el);
  }
  ringAudioEl = el;
  return el;
}

function killAllTimeouts() {
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
  for (const t of pendingTimeouts) clearTimeout(t);
  pendingTimeouts = [];
  if (vibrateTimer) {
    clearInterval(vibrateTimer);
    vibrateTimer = null;
  }
}

function killAllOscillators() {
  for (const o of activeOscillators) {
    try {
      o.onended = null;
      o.stop(0);
      o.disconnect();
    } catch {
      /* ignore */
    }
  }
  activeOscillators = [];
}

function killHtmlAudio() {
  if (typeof document === 'undefined') return;
  const elements = document.querySelectorAll<HTMLAudioElement>(
    `audio[data-albnet-call-ring], #${RING_AUDIO_ID}`
  );
  for (const el of Array.from(elements)) {
    try {
      el.pause();
      el.currentTime = 0;
      el.loop = false;
      const stream = el.srcObject as MediaStream | null;
      if (stream) {
        stream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch {
            /* ignore */
          }
        });
      }
      el.srcObject = null;
      el.removeAttribute('src');
      el.load();
    } catch {
      /* ignore */
    }
  }
}

function killAudioContext() {
  if (masterGain && audioCtx && audioCtx.state !== 'closed') {
    try {
      masterGain.gain.cancelScheduledValues(0);
      masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
      masterGain.disconnect();
    } catch {
      /* ignore */
    }
  }
  masterGain = null;
  mediaDest = null;

  if (audioCtx && audioCtx.state !== 'closed') {
    try {
      void audioCtx.suspend();
      void audioCtx.close();
    } catch {
      /* ignore */
    }
  }
  audioCtx = null;
}

/** Ndalon menjëherë – pa vonesë, pa fade */
export function stopCallRingtone(): void {
  session += 1;
  mode = null;
  killAllTimeouts();
  killAllOscillators();
  killHtmlAudio();
  killAudioContext();
  try {
    navigator.vibrate?.(0);
  } catch {
    /* ignore */
  }
}

function schedule(fn: () => void, ms: number, sid: number) {
  const id = setTimeout(() => {
    pendingTimeouts = pendingTimeouts.filter((x) => x !== id);
    if (sid !== session || !mode) return;
    fn();
  }, ms);
  pendingTimeouts.push(id);
}

function playDualTone(
  ctx: AudioContext,
  gain: GainNode,
  f1: number,
  f2: number,
  durationSec: number,
  sid: number
) {
  if (sid !== session || !mode) return;

  const o1 = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  o1.type = 'sine';
  o2.type = 'sine';
  o1.frequency.value = f1;
  o2.frequency.value = f2;
  o1.connect(gain);
  o2.connect(gain);
  const now = ctx.currentTime;
  o1.start(now);
  o2.start(now);
  o1.stop(now + durationSec);
  o2.stop(now + durationSec);
  activeOscillators.push(o1, o2);

  const cleanup = () => {
    activeOscillators = activeOscillators.filter((x) => x !== o1 && x !== o2);
    try {
      o1.disconnect();
      o2.disconnect();
    } catch {
      /* ignore */
    }
  };
  o1.onended = cleanup;
  o2.onended = cleanup;
}

function startVibration(sid: number) {
  try {
    if (!navigator.vibrate) return;
    navigator.vibrate([400, 200, 400, 1800]);
    vibrateTimer = setInterval(() => {
      if (sid !== session || mode !== 'incoming') return;
      navigator.vibrate([400, 200, 400, 1800]);
    }, 3000);
  } catch {
    /* ignore */
  }
}

function bootAudioPipeline(sid: number): AudioContext | null {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    audioCtx = ctx;
    masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    mediaDest = ctx.createMediaStreamDestination();
    masterGain.connect(mediaDest);
    masterGain.connect(ctx.destination);

    const audio = getRingAudioElement();
    audio.srcObject = mediaDest.stream;
    audio.loop = false;
    void audio.play().catch(() => {});

    void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Thirrje hyrëse */
export function startIncomingRingtone(): void {
  if (typeof window === 'undefined') return;
  stopCallRingtone();
  const sid = session;
  mode = 'incoming';

  const ctx = bootAudioPipeline(sid);
  if (!ctx || !masterGain) return;

  masterGain.gain.setValueAtTime(0.15, ctx.currentTime);
  startVibration(sid);

  const burst = () => {
    if (sid !== session || mode !== 'incoming' || !masterGain) return;
    playDualTone(ctx, masterGain, 440, 480, 0.4, sid);
    schedule(() => {
      if (sid !== session || mode !== 'incoming' || !masterGain) return;
      playDualTone(ctx, masterGain, 440, 480, 0.4, sid);
    }, 500, sid);
  };

  burst();
  loopTimer = setInterval(burst, 2600);
}

/** Thirrje dalëse – ringback */
export function startOutgoingRingtone(): void {
  if (typeof window === 'undefined') return;
  stopCallRingtone();
  const sid = session;
  mode = 'outgoing';

  const ctx = bootAudioPipeline(sid);
  if (!ctx || !masterGain) return;

  masterGain.gain.setValueAtTime(0.07, ctx.currentTime);

  const beep = () => {
    if (sid !== session || mode !== 'outgoing' || !masterGain) return;
    playDualTone(ctx, masterGain, 425, 475, 0.25, sid);
  };

  beep();
  loopTimer = setInterval(beep, 2000);
}

export function isCallRingtonePlaying(): boolean {
  return mode !== null;
}

export type CallRingPhase = 'idle' | 'incoming' | 'outgoing' | 'active';

/** Sinkronizon fazën e thirrjes me tingullin */
export function syncCallRingPhase(phase: CallRingPhase): void {
  if (phase === 'incoming') {
    startIncomingRingtone();
    return;
  }
  if (phase === 'outgoing') {
    startOutgoingRingtone();
    return;
  }
  stopCallRingtone();
}
