/** ICE/STUN/TURN për thirrje audio/video – funksionon edhe midis rrjeteve të ndryshme */
import { api } from '@/utils/api';

const ICE_CACHE_MS = 45 * 60 * 1000;
let iceServersCache: RTCIceServer[] | null = null;
let iceServersCacheAt = 0;

function getFallbackIceServers(): RTCIceServer[] {
  const customTurn = process.env.NEXT_PUBLIC_TURN_URL;
  const customUser = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const customCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ];

  if (customTurn && customUser && customCred) {
    const urls = customTurn.includes(',')
      ? customTurn.split(',').map((u) => u.trim())
      : customTurn;
    servers.push({ urls, username: customUser, credential: customCred });
  }

  servers.push({
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turns:openrelay.metered.ca:443',
      'turn:global.relay.metered.ca:80',
      'turn:global.relay.metered.ca:443',
      'turns:global.relay.metered.ca:443',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  });

  return servers;
}

/** Merr ICE servers nga backend (Metered.ca) ose fallback lokal */
export async function resolveIceServers(): Promise<RTCIceServer[]> {
  if (iceServersCache && Date.now() - iceServersCacheAt < ICE_CACHE_MS) {
    return iceServersCache;
  }

  try {
    const res = await api<{ iceServers: RTCIceServer[]; source?: string }>('/api/calls/ice-servers');
    if (res.iceServers?.length) {
      iceServersCache = res.iceServers;
      iceServersCacheAt = Date.now();
      return iceServersCache;
    }
  } catch {
    /* përdor fallback nëse API dështon */
  }

  iceServersCache = getFallbackIceServers();
  iceServersCacheAt = Date.now();
  return iceServersCache;
}

/** @deprecated Përdor resolveIceServers() për thirrje */
export function getIceServers(): RTCIceServer[] {
  return iceServersCache ?? getFallbackIceServers();
}

export async function getPeerConnectionConfig(): Promise<RTCConfiguration> {
  return {
    iceServers: await resolveIceServers(),
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };
}

export type FacingMode = 'user' | 'environment';

/** Telefon/tablet me kamera para/pas */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const mobileUa = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  const touchTablet =
    typeof window !== 'undefined' &&
    navigator.maxTouchPoints > 1 &&
    window.innerWidth < 1024;
  return mobileUa || touchTablet;
}

export function facingFromTrack(track?: MediaStreamTrack | null): FacingMode | null {
  if (!track?.getSettings) return null;
  const fm = track.getSettings().facingMode;
  if (fm === 'user' || fm === 'environment') return fm;
  return null;
}

export async function acquireLocalMedia(
  mode: 'audio' | 'video',
  facing: FacingMode = 'user'
): Promise<MediaStream> {
  const videoConstraints =
    mode === 'video'
      ? {
          facingMode: facing,
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 30 },
        }
      : false;

  const audioConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints,
      video: videoConstraints,
    });
  } catch (err) {
    if (mode !== 'video') throw err;
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
    } catch {
      return navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
    }
  }
}

/** Ndryshon kamerën para/pas (si Instagram) – optimizuar për iOS/Android */
export async function switchCamera(
  stream: MediaStream,
  currentFacing: FacingMode
): Promise<{ stream: MediaStream; facing: FacingMode }> {
  const nextFacing: FacingMode = currentFacing === 'user' ? 'environment' : 'user';
  const oldVideo = stream.getVideoTracks()[0];
  const wasEnabled = oldVideo?.enabled ?? true;

  const mobileVideoAttempts: MediaStreamConstraints[] = [
    { video: { facingMode: nextFacing, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
    { video: { facingMode: { ideal: nextFacing }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
    { video: { facingMode: nextFacing, width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
    { video: { facingMode: { ideal: nextFacing } }, audio: false },
    { video: { facingMode: { exact: nextFacing } }, audio: false },
  ];

  let newTrack: MediaStreamTrack | null = null;
  let tempStream: MediaStream | null = null;

  for (const constraints of mobileVideoAttempts) {
    try {
      tempStream = await navigator.mediaDevices.getUserMedia(constraints);
      newTrack = tempStream.getVideoTracks()[0] ?? null;
      if (newTrack) break;
      stopMediaStream(tempStream);
      tempStream = null;
    } catch {
      stopMediaStream(tempStream);
      tempStream = null;
    }
  }

  if (!newTrack) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === 'videoinput' && d.deviceId);
      const currentId = oldVideo?.getSettings?.()?.deviceId;
      const other = cameras.find((c) => c.deviceId && c.deviceId !== currentId);
      if (other?.deviceId) {
        tempStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: other.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        newTrack = tempStream.getVideoTracks()[0] ?? null;
      }
    } catch {
      /* fallback poshtë */
    }
  }

  if (!newTrack) {
    stopMediaStream(tempStream);
    throw new Error('Nuk u gjet kamerë tjetër në këtë pajisje.');
  }

  newTrack.enabled = wasEnabled;

  if (oldVideo) {
    stream.removeTrack(oldVideo);
    oldVideo.stop();
  }
  stream.addTrack(newTrack);

  if (tempStream) {
    tempStream.getTracks().forEach((t) => {
      if (t !== newTrack) t.stop();
    });
  }

  const detected = facingFromTrack(newTrack);
  return { stream, facing: detected ?? nextFacing };
}

export async function hasMultipleCameras(stream?: MediaStream | null): Promise<boolean> {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return isMobileDevice();
    }

    const supported = navigator.mediaDevices.getSupportedConstraints?.();
    if (isMobileDevice() && supported?.facingMode) {
      return true;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((d) => d.kind === 'videoinput');
    if (cameras.length > 1) return true;

    if (stream?.getVideoTracks().length) {
      const settings = stream.getVideoTracks()[0]?.getSettings?.();
      if (settings?.facingMode) return true;
    }

    return isMobileDevice();
  } catch {
    return isMobileDevice();
  }
}

export async function flushIceQueue(
  pc: RTCPeerConnection,
  queue: RTCIceCandidateInit[]
): Promise<void> {
  const pending = [...queue];
  queue.length = 0;
  for (const candidate of pending) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      /* kandidat i vjetër – injoro */
    }
  }
}

/** Shton ose zëvendëson track-et lokale pa gabimin "sender already exists" */
export function attachLocalTracks(pc: RTCPeerConnection, stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    const existing = pc.getSenders().find((s) => s.track?.kind === track.kind);
    if (existing) {
      void existing.replaceTrack(track);
    } else {
      pc.addTrack(track, stream);
    }
  }
}

export function stopMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  stream.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch {
      /* ignore */
    }
  });
}

export function closePeerConnection(pc: RTCPeerConnection | null): void {
  if (!pc) return;
  try {
    pc.getSenders().forEach((s) => {
      try {
        s.track?.stop();
      } catch {
        /* ignore */
      }
    });
    pc.close();
  } catch {
    /* ignore */
  }
}

export async function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 4000): Promise<void> {
  if (pc.iceGatheringState === 'complete') return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    const onChange = () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timer);
        pc.removeEventListener('icegatheringstatechange', onChange);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', onChange);
  });
}

export function clearIceServersCache(): void {
  iceServersCache = null;
  iceServersCacheAt = 0;
}
