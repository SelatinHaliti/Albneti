/**
 * Biblioteka muzikore – iTunes + fallback lokal (edhe në Render).
 */
import { TRACKS, CATEGORIES } from '../data/musicLibrary.js';
import { fetchItunesTracks } from '../services/musicProviders.js';

function filterLocalTracks({ q, category }) {
  let list = [...TRACKS];
  if (category && category !== 'all') {
    list = list.filter((t) => (t.category || '').toLowerCase() === category);
  }
  if (q) {
    const needle = q.toLowerCase();
    list = list.filter(
      (t) =>
        (t.title || '').toLowerCase().includes(needle) ||
        (t.artist || '').toLowerCase().includes(needle)
    );
  }
  return list.map((t) => ({ ...t, source: 'local', preview: false }));
}

function dedupeByUrl(tracks) {
  const seen = new Set();
  return tracks.filter((t) => {
    if (!t.url || seen.has(t.url)) return false;
    seen.add(t.url);
    return true;
  });
}

export const getLibrary = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const category = (req.query.category || 'shqip').trim().toLowerCase();
    const limit = 50;

    let tracks = await fetchItunesTracks({
      q,
      category: category || 'shqip',
      limit,
    });

    if (tracks.length < 8) {
      tracks.push(...filterLocalTracks({ q, category }));
    }

    tracks = dedupeByUrl(tracks).slice(0, limit);

    res.json({
      tracks,
      categories: CATEGORIES,
      providers: { itunes: true, local: true },
    });
  } catch (err) {
    console.error('[music]', err);
    res.json({
      tracks: filterLocalTracks({
        q: (req.query.q || '').trim(),
        category: (req.query.category || 'shqip').trim().toLowerCase(),
      }),
      categories: CATEGORIES,
      providers: { itunes: false, local: true },
    });
  }
};
