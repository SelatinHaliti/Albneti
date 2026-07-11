/**
 * Metered.ca TURN – kredenciale dinamike për thirrje WebRTC.
 * Dokumentacion: https://www.metered.ca/docs/turn-rest-api/get-credential
 */

const CACHE_TTL_MS = 50 * 60 * 1000;
let cache = null;

const FALLBACK_STUN = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

export function isMeteredConfigured() {
  return Boolean(process.env.METERED_APP_NAME && process.env.METERED_TURN_API_KEY);
}

async function fetchFromMetered() {
  const appName = process.env.METERED_APP_NAME?.trim();
  const apiKey = process.env.METERED_TURN_API_KEY?.trim();
  const region = process.env.METERED_TURN_REGION?.trim() || 'global';

  if (!appName || !apiKey) return null;

  const url = new URL(`https://${appName}.metered.live/api/v1/turn/credentials`);
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('region', region);

  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Metered API ${res.status}: ${body || res.statusText}`);
  }

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Metered API ktheu përgjigje të zbrazët');
  }
  return data;
}

function getStaticTurnFromEnv() {
  const turnUrl = process.env.TURN_URL || process.env.METERED_TURN_URL;
  const username = process.env.TURN_USERNAME || process.env.METERED_TURN_USERNAME;
  const credential = process.env.TURN_CREDENTIAL || process.env.METERED_TURN_CREDENTIAL;
  if (!turnUrl || !username || !credential) return null;

  const urls = turnUrl.includes(',')
    ? turnUrl.split(',').map((u) => u.trim())
    : turnUrl;

  return [{ urls, username, credential }];
}

/**
 * Kthen ICE servers për RTCPeerConnection.
 * Prioritet: Metered API → TURN statik nga .env → vetëm STUN fallback.
 */
export async function getIceServersForCall() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.servers;
  }

  if (isMeteredConfigured()) {
    try {
      const metered = await fetchFromMetered();
      const servers = [...FALLBACK_STUN, ...metered];
      cache = { servers, at: Date.now() };
      return servers;
    } catch (err) {
      console.error('[Metered TURN]', err.message);
    }
  }

  const staticTurn = getStaticTurnFromEnv();
  if (staticTurn) {
    const servers = [...FALLBACK_STUN, ...staticTurn];
    cache = { servers, at: Date.now() };
    return servers;
  }

  // Fallback publik (testim – jo i besueshëm në prod)
  const servers = [
    ...FALLBACK_STUN,
    {
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
    },
  ];
  cache = { servers, at: Date.now() };
  return servers;
}
