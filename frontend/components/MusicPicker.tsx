'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '@/utils/api';

export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  url: string;
  category?: string;
  duration?: number;
};

const DEFAULT_CATEGORIES = [
  { id: 'all', label: 'Të gjitha' },
  { id: 'pop', label: 'Pop' },
  { id: 'hiphop', label: 'Hip-Hop' },
  { id: 'rock', label: 'Rock' },
  { id: 'elektro', label: 'Elektro' },
  { id: 'rnb', label: 'R&B' },
  { id: 'folk', label: 'Folk' },
  { id: 'ambient', label: 'Ambient' },
];

type MusicPickerProps = {
  onSelect: (track: { url: string; title: string; artist: string }) => void;
  onClose: () => void;
};

export function MusicPicker({ onSelect, onClose }: MusicPickerProps) {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [categories] = useState<{ id: string; label: string }[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchTracks = useCallback(async () => {
    setError(null);
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (category && category !== 'all') params.set('category', category);
    const query = params.toString();
    try {
      const data = await api<{ tracks: MusicTrack[]; categories?: { id: string; label: string }[] }>(
        query ? `/api/music?${query}` : '/api/music'
      );
      setTracks(Array.isArray(data.tracks) ? data.tracks : []);
    } catch (e) {
      setTracks([]);
      setError(e instanceof Error ? e.message : 'Nuk u ngarkuan këngët. Provoni përsëri.');
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  const stopPreview = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
  };

  const playPreview = (track: MusicTrack) => {
    if (playingId === track.id) {
      stopPreview();
      return;
    }
    stopPreview();
    const audio = new Audio(track.url);
    audioRef.current = audio;
    setPlayingId(track.id);
    audio.play().catch(() => setPlayingId(null));
    audio.onended = () => setPlayingId(null);
  };

  const handleSelect = (track: MusicTrack) => {
    stopPreview();
    onSelect({ url: track.url, title: track.title, artist: track.artist });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]">
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3 bg-[var(--bg-card)]">
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-[var(--text)]"
          aria-label="Mbyll"
        >
          <span className="text-xl">←</span>
        </button>
        <h2 className="text-lg font-semibold text-[var(--text)] flex-1">Zgjidh muzikë</h2>
      </div>

      <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-card)]">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Kërko këngë ose artist..."
          className="auth-input w-full"
        />
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                category === cat.id
                  ? 'bg-[var(--text)] text-[var(--bg-card)]'
                  : 'bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--primary)] rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <p className="text-[var(--text-muted)] text-sm mb-4">{error}</p>
            <button
              type="button"
              onClick={fetchTracks}
              className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium"
            >
              Provoni përsëri
            </button>
          </div>
        ) : tracks.length === 0 ? (
          <p className="text-center text-[var(--text-muted)] py-12 text-sm">Nuk u gjet asnjë këngë.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {tracks.map((track) => (
              <li key={track.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg)]">
                <button
                  type="button"
                  onClick={() => playPreview(track)}
                  className="w-10 h-10 rounded-full bg-[var(--border)] flex items-center justify-center text-[var(--text)] flex-shrink-0"
                  aria-label={playingId === track.id ? 'Ndalo' : 'Luaj'}
                >
                  {playingId === track.id ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text)] font-medium text-sm truncate">{track.title}</p>
                  <p className="text-[var(--text-muted)] text-xs truncate">{track.artist}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelect(track)}
                  className="text-sm font-semibold text-[var(--primary)]"
                >
                  Zgjidh
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
