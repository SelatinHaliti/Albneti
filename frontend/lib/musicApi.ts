/**
 * Muzikë për AlbNet – iTunes (këngë reale) + fallback lokal.
 * Ekzekutohet në Vercel, jo në Render.
 */

export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  url: string;
  category?: string;
  duration?: number;
  image?: string;
  source: 'itunes' | 'jamendo' | 'local';
  preview?: boolean;
};

export const CATEGORIES = [
  { id: 'all', label: 'Të gjitha' },
  { id: 'shqip', label: '🇦🇱 Shqip' },
  { id: 'pop', label: 'Pop' },
  { id: 'hiphop', label: 'Hip-Hop' },
  { id: 'rock', label: 'Rock' },
  { id: 'elektro', label: 'Elektro' },
  { id: 'rnb', label: 'R&B' },
  { id: 'folk', label: 'Folk' },
  { id: 'ambient', label: 'Ambient' },
  { id: 'dance', label: 'Dance' },
  { id: 'chill', label: 'Chill' },
  { id: 'latin', label: 'Latin' },
  { id: 'jazz', label: 'Jazz' },
  { id: 'summer', label: 'Verë' },
  { id: 'trending', label: 'Trending' },
];

const SHQIP_TERMS = [
  'Capital T',
  'Noizy',
  'Dafina Zeqiri',
  'Era Istrefi',
  'Albanian music',
  'Tallava',
  'Kosova',
  'Balkan pop',
];

const CATEGORY_TERMS: Record<string, string[]> = {
  pop: ['pop hits 2024', 'pop music'],
  hiphop: ['hip hop', 'rap'],
  rock: ['rock music'],
  elektro: ['electronic dance', 'edm'],
  rnb: ['rnb soul'],
  folk: ['folk acoustic'],
  ambient: ['ambient chill'],
  dance: ['dance club'],
  chill: ['chill lofi'],
  latin: ['latin reggaeton'],
  jazz: ['jazz'],
  summer: ['summer hits'],
  trending: ['top hits', 'viral songs'],
};

const LOCAL_TRACKS: MusicTrack[] = [
  { id: 'local-1', title: 'Shqipëria ime', artist: 'Folk Studio', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', category: 'shqip', source: 'local' },
  { id: 'local-2', title: 'Tirana Night', artist: 'Capital Beats', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', category: 'shqip', source: 'local' },
  { id: 'local-3', title: 'Diaspora', artist: 'Shqipëtarët', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', category: 'shqip', source: 'local' },
  { id: 'local-4', title: 'Shpresa', artist: 'AlbNet Hits', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', category: 'pop', source: 'local' },
  { id: 'local-5', title: 'Vera', artist: 'AlbNet Sounds', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', category: 'summer', source: 'local' },
  { id: 'local-6', title: 'Puls', artist: 'AlbNet Sounds', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', category: 'elektro', source: 'local' },
];

const cache = new Map<string, { data: MusicTrack[]; expires: number }>();
const CACHE_MS = 10 * 60 * 1000;

function fromCache(key: string): MusicTrack[] | null {
  const hit = cache.get(key);
  if (!hit || Date.now() > hit.expires) return null;
  return hit.data;
}

function toCache(key: string, data: MusicTrack[]) {
  cache.set(key, { data, expires: Date.now() + CACHE_MS });
}

async function fetchItunes(term: string, limit: number): Promise<MusicTrack[]> {
  const params = new URLSearchParams({
    term,
    media: 'music',
    entity: 'song',
    limit: String(limit),
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`https://itunes.apple.com/search?${params}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || [])
      .filter((item: { previewUrl?: string; trackId?: number }) => item.previewUrl && item.trackId)
      .map((item: {
        trackId: number;
        trackName: string;
        artistName: string;
        previewUrl: string;
        artworkUrl100?: string;
      }) => ({
        id: `itunes-${item.trackId}`,
        title: item.trackName,
        artist: item.artistName,
        url: item.previewUrl,
        category: 'pop',
        duration: 30,
        image: item.artworkUrl100?.replace('100x100bb', '300x300bb'),
        source: 'itunes' as const,
        preview: true,
      }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function filterLocal(q: string, category: string): MusicTrack[] {
  let list = [...LOCAL_TRACKS];
  if (category && category !== 'all') {
    list = list.filter((t) => t.category === category);
  }
  if (q) {
    const needle = q.toLowerCase();
    list = list.filter(
      (t) => t.title.toLowerCase().includes(needle) || t.artist.toLowerCase().includes(needle)
    );
  }
  return list;
}

function dedupe(tracks: MusicTrack[]): MusicTrack[] {
  const seen = new Set<string>();
  return tracks.filter((t) => {
    if (!t.url || seen.has(t.url)) return false;
    seen.add(t.url);
    return true;
  });
}

export async function searchMusic(q: string, category: string, limit = 40): Promise<MusicTrack[]> {
  const cacheKey = `${category}:${q}:${limit}`;
  const cached = fromCache(cacheKey);
  if (cached) return cached;

  const terms: string[] = [];
  if (q.trim()) {
    terms.push(q.trim());
  } else if (category === 'shqip' || category === 'all') {
    terms.push(...SHQIP_TERMS.slice(0, 5));
  } else if (CATEGORY_TERMS[category]) {
    terms.push(...CATEGORY_TERMS[category]);
  } else {
    terms.push('top hits');
  }

  const perTerm = Math.max(6, Math.ceil(limit / terms.length));
  const results: MusicTrack[] = [];
  const seen = new Set<string>();

  await Promise.all(
    terms.map(async (term) => {
      const batch = await fetchItunes(term, perTerm);
      for (const track of batch) {
        if (seen.has(track.url)) continue;
        seen.add(track.url);
        results.push({ ...track, category: category === 'all' ? track.category : category });
      }
    })
  );

  if (results.length < 6) {
    results.push(...filterLocal(q, category));
  }

  const final = dedupe(results).slice(0, limit);
  toCache(cacheKey, final);
  return final;
}
