/**
 * Furnizues muzike për AlbNet:
 * - Jamendo: 500k+ këngë royalty-free me URL MP3 të plota (kërkon JAMENDO_CLIENT_ID falas)
 * - iTunes Search: këngë reale shqiptare/internacionale, preview 30s (pa API key)
 */
const JAMENDO_BASE = 'https://api.jamendo.com/v3.0';

const CATEGORY_TO_JAMENDO = {
  pop: { tags: 'pop' },
  hiphop: { tags: 'hiphop' },
  rock: { tags: 'rock' },
  elektro: { tags: 'electronic' },
  rnb: { tags: 'rnb' },
  folk: { tags: 'folk' },
  ambient: { tags: 'relaxation' },
  dance: { tags: 'dance' },
  chill: { tags: 'lounge' },
  latin: { tags: 'latin' },
  jazz: { tags: 'jazz' },
  summer: { fuzzytags: 'summer+vacation' },
  trending: { featured: '1', order: 'popularity_week_desc' },
};

const SHQIP_ITUNES_TERMS = [
  'Capital T', 'Noizy', 'Dafina Zeqiri', 'Era Istrefi', 'Albanian music',
  'Tallava', 'Shqip', 'Kosova rap', 'Balkan pop',
];

const cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function cacheSet(key, data) {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

async function fetchJson(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function normalizeTrack({ id, title, artist, url, category, duration, image, source, preview }) {
  return {
    id,
    title,
    artist,
    url,
    category,
    duration: duration || undefined,
    image: image || undefined,
    source,
    preview: !!preview,
  };
}

/** Jamendo – këngë të plota MP3 (royalty-free) */
export async function fetchJamendoTracks({ q, category, limit = 40, clientId }) {
  if (!clientId) return [];

  const cacheKey = `jamendo:${category}:${q}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    client_id: clientId,
    format: 'json',
    limit: String(Math.min(limit, 50)),
    audioformat: 'mp32',
    type: 'single albumtrack',
    include: 'musicinfo',
    groupby: 'artist_id',
  });

  const mapping = CATEGORY_TO_JAMENDO[category];
  if (mapping?.tags) params.set('tags', mapping.tags);
  if (mapping?.fuzzytags) params.set('fuzzytags', mapping.fuzzytags);
  if (mapping?.featured) params.set('featured', mapping.featured);
  if (mapping?.order) params.set('order', mapping.order);
  if (q) params.set('search', q);
  if (!q && !mapping) params.set('order', 'popularity_week_desc');

  const data = await fetchJson(`${JAMENDO_BASE}/tracks/?${params}`);
  if (data?.headers?.status !== 'success' || !Array.isArray(data.results)) {
    if (data?.headers?.error_message) {
      console.warn('[Jamendo]', data.headers.error_message);
    }
    return [];
  }

  const tracks = data.results
    .filter((t) => t.audio && t.audiodownload_allowed !== false)
    .map((t) =>
      normalizeTrack({
        id: `jamendo-${t.id}`,
        title: t.name || 'Pa titull',
        artist: t.artist_name || 'Artist i panjohur',
        url: t.audio,
        category: category || (t.musicinfo?.tags?.genres?.[0] || 'pop'),
        duration: t.duration,
        image: t.album_image || t.image,
        source: 'jamendo',
        preview: false,
      })
    );

  cacheSet(cacheKey, tracks);
  return tracks;
}

const CATEGORY_ITUNES_TERMS = {
  pop: ['pop hits', 'pop music'],
  hiphop: ['hip hop', 'rap music'],
  rock: ['rock music'],
  elektro: ['electronic edm'],
  rnb: ['rnb soul'],
  folk: ['folk acoustic'],
  ambient: ['ambient relaxation'],
  dance: ['dance club'],
  chill: ['chill lofi'],
  latin: ['latin reggaeton'],
  jazz: ['jazz music'],
  summer: ['summer hits'],
  trending: ['top hits viral'],
};

/** iTunes – preview 30s, këngë reale (shumë mirë për 🇦🇱 Shqip) */
export async function fetchItunesTracks({ q, category, limit = 40 }) {
  const cacheKey = `itunes:${category}:${q}:${limit}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const terms = [];
  if (q) {
    terms.push(q);
  } else if (category === 'shqip') {
    terms.push(...SHQIP_ITUNES_TERMS.slice(0, 5));
  } else if (category && category !== 'all' && CATEGORY_ITUNES_TERMS[category]) {
    terms.push(...CATEGORY_ITUNES_TERMS[category]);
  } else if (category === 'all') {
    terms.push(...SHQIP_ITUNES_TERMS.slice(0, 3), 'pop hits');
  } else {
    terms.push(category || 'top hits');
  }

  const perTerm = Math.max(8, Math.ceil(limit / terms.length));
  const seen = new Set();
  const tracks = [];

  for (const term of terms) {
    const params = new URLSearchParams({
      term,
      media: 'music',
      entity: 'song',
      limit: String(perTerm),
      lang: 'en_us',
    });
    try {
      const data = await fetchJson(`https://itunes.apple.com/search?${params}`);
      for (const item of data?.results || []) {
        if (!item.previewUrl || seen.has(item.trackId)) continue;
        seen.add(item.trackId);
        tracks.push(
          normalizeTrack({
            id: `itunes-${item.trackId}`,
            title: item.trackName || 'Pa titull',
            artist: item.artistName || 'Artist i panjohur',
            url: item.previewUrl,
            category: category === 'all' || !category ? 'pop' : category,
            duration: 30,
            image: item.artworkUrl100?.replace('100x100', '300x300'),
            source: 'itunes',
            preview: true,
          })
        );
        if (tracks.length >= limit) break;
      }
    } catch (err) {
      console.warn('[iTunes]', term, err.message);
    }
    if (tracks.length >= limit) break;
  }

  const result = tracks.slice(0, limit);
  cacheSet(cacheKey, result);
  return result;
}
