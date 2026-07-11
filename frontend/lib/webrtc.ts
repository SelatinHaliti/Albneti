/** ICE/STUN/TURN për thirrje audio/video – funksionon edhe midis rrjeteve të ndryshme */
export function getIceServers(): RTCIceServer[] {
  const customTurn = process.env.NEXT_PUBLIC_TURN_URL;
  const customUser = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const customCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  const servers: RTCIceServer[] = [
    {
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
    },
  ];

  if (customTurn && customUser && customCred) {
    servers.push({ urls: customTurn, username: customUser, credential: customCred });
  } else {
    // OpenRelay – falas për testim (ndihmon kur STUN nuk mjafton)
    servers.push({
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turns:openrelay.metered.ca:443',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    });
  }

  return servers;
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

