/**
 * Ringtone për thirrje hyrëse/dalëse – ndalet menjëherë kur pranohet ose refuzohet.
 */

type RingMode = 'incoming' | 'outgoing';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let oscillators: OscillatorNode[] = [];
let patternInterval: ReturnType<typeof setInterval> | null = null;
let patternTimeouts: ReturnType<typeof setTimeout>[] = [];
let vibrateInterval: ReturnType<typeof setInterval> | null = null;
let currentMode: RingMode | null = null;
let generation = 0;

function ensureContext(): AudioContext | null {
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function clearOscillators() {
  for (const osc of oscillators) {
    try {
      osc.onended = null;
      osc.stop();
      osc.disconnect();
    } catch {
      /* ignore */
    }
  }
  oscillators = [];
}

function clearTimers() {
  if (patternInterval) {
    clearInterval(patternInterval);
    patternInterval = null;
  }
  for (const t of patternTimeouts) clearTimeout(t);
  patternTimeouts = [];
  if (vibrateInterval) {
    clearInterval(vibrateInterval);
    vibrateInterval = null;
  }
  try {
    navigator.vibrate?.(0);
  } catch {
    /* ignore */
  }
}

/** Ndalon menjëherë çdo tingull/vibrim thirrjeje */
export function stopCallRingtone(): void {
  generation += 1;
  currentMode = null;
  clearTimers();
  clearOscillators();

  if (masterGain && audioCtx && audioCtx.state !== 'closed') {
    try {
      const t = audioCtx.currentTime;
      masterGain.gain.cancelScheduledValues(t);
      masterGain.gain.setValueAtTime(masterGain.gain.value, t);
      masterGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    } catch {
      /* ignore */
    }
  }

  const ctxToClose = audioCtx;
  masterGain = null;
  audioCtx = null;

  if (ctxToClose && ctxToClose.state !== 'closed') {
    setTimeout(() => {
      void ctxToClose.close().catch(() => {});
    }, 80);
  }
}

function scheduleTimeout(fn: () => void, ms: number, gen: number) {
  const id = setTimeout(() => {
    patternTimeouts = patternTimeouts.filter((x) => x !== id);
    if (gen !== generation || !currentMode) return;
    fn();
  }, ms);
  patternTimeouts.push(id);
}

function playDualTone(ctx: AudioContext, gain: GainNode, f1: number, f2: number, durationSec: number) {
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
  o1.onended = () => {
    try {
      o1.disconnect();
    } catch {
      /* ignore */
    }
  };
  o2.onended = () => {
    try {
      o2.disconnect();
    } catch {
      /* ignore */
    }
  };
  oscillators.push(o1, o2);
}

function startVibration() {
  try {
    if (!navigator.vibrate) return;
    navigator.vibrate([400, 200, 400, 2000]);
    vibrateInterval = setInterval(() => {
      if (!currentMode) return;
      navigator.vibrate([400, 200, 400, 2000]);
    }, 3200);
  } catch {
    /* ignore */
  }
}

/** Thirrje hyrëse – ring-ring si telefon */
export function startIncomingRingtone(): void {
  stopCallRingtone();
  const gen = generation;
  const ctx = ensureContext();
  if (!ctx) return;

  currentMode = 'incoming';
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.14;
  masterGain.connect(ctx.destination);
  startVibration();

  const ringBurst = () => {
    if (gen !== generation || currentMode !== 'incoming' || !masterGain) return;
    playDualTone(ctx, masterGain, 440, 480, 0.35);
    scheduleTimeout(() => {
      if (gen !== generation || currentMode !== 'incoming' || !masterGain) return;
      playDualTone(ctx, masterGain, 440, 480, 0.35);
    }, 450, gen);
  };

  ringBurst();
  patternInterval = setInterval(ringBurst, 2800);
}

/** Thirrje dalëse – tingull i butë derisa përgjigjet */
export function startOutgoingRingtone(): void {
  stopCallRingtone();
  const gen = generation;
  const ctx = ensureContext();
  if (!ctx) return;

  currentMode = 'outgoing';
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.06;
  masterGain.connect(ctx.destination);

  const beep = () => {
    if (gen !== generation || currentMode !== 'outgoing' || !masterGain) return;
    playDualTone(ctx, masterGain, 350, 400, 0.2);
  };

  beep();
  patternInterval = setInterval(beep, 2200);
}

export function isCallRingtonePlaying(): boolean {
  return currentMode !== null;
}
