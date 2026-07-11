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
  while (queue.length > 0) {
    const candidate = queue.shift();
    if (!candidate) continue;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      /* kandidat i vjetër – injoro */
    }
  }
}
