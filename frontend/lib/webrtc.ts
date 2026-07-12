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

export async function acquireLocalMedia(
  mode: 'audio' | 'video',
  facing: FacingMode = 'user'
): Promise<MediaStream> {
  const videoConstraints =
    mode === 'video'
      ? {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      : false;

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: videoConstraints,
    });
  } catch (err) {
    if (mode !== 'video') throw err;
    return navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  }
}

/** Ndryshon kamerën para/pas (si Instagram) */
export async function switchCamera(
  stream: MediaStream,
  currentFacing: FacingMode
): Promise<{ stream: MediaStream; facing: FacingMode }> {
  const nextFacing: FacingMode = currentFacing === 'user' ? 'environment' : 'user';
  const oldVideo = stream.getVideoTracks()[0];

  let newVideoStream: MediaStream | null = null;

  const attempts: MediaTrackConstraints[] = [
    { facingMode: { exact: nextFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
    { facingMode: { ideal: nextFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
  ];

  for (const video of attempts) {
    try {
      newVideoStream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      break;
    } catch {
      /* provo më pas */
    }
  }

  if (!newVideoStream) {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((d) => d.kind === 'videoinput');
    const currentId = oldVideo?.getSettings?.()?.deviceId;
    const other = cameras.find((c) => c.deviceId && c.deviceId !== currentId);
    if (!other?.deviceId) {
      throw new Error('Nuk u gjet kamerë tjetër në këtë pajisje.');
    }
    newVideoStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: other.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  }

  const newTrack = newVideoStream.getVideoTracks()[0];
  if (!newTrack) throw new Error('Kamera e re nuk u aktivizua.');

  if (oldVideo) {
    stream.removeTrack(oldVideo);
    oldVideo.stop();
  }
  stream.addTrack(newTrack);
  newVideoStream.getTracks().forEach((t) => {
    if (t !== newTrack) t.stop();
  });

  return { stream, facing: nextFacing };
}

export async function hasMultipleCameras(): Promise<boolean> {
  try {
    if (!navigator.mediaDevices?.enumerateDevices) return false;
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'videoinput').length > 1;
  } catch {
    return true;
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
