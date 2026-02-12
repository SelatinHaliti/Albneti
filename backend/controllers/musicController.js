/**
 * Biblioteka muzikore – të dhënat nga data/musicLibrary.js.
 */
import { TRACKS, CATEGORIES } from '../data/musicLibrary.js';

/**
 * Merr listën e këngëve – kërkim dhe filtrim sipas kategorisë (si Instagram)
 */
export const getLibrary = async (req, res) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();
    const category = (req.query.category || '').trim().toLowerCase();
    let list = [...TRACKS];
    if (category && category !== 'all') {
      list = list.filter((t) => (t.category || '').toLowerCase() === category);
    }
    if (q) {
      list = list.filter(
        (t) =>
          (t.title || '').toLowerCase().includes(q) ||
          (t.artist || '').toLowerCase().includes(q)
      );
    }
    res.json({
      tracks: list,
      categories: CATEGORIES,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};
