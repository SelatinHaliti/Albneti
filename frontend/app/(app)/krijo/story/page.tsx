'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { apiUpload } from '@/utils/api';
import { MusicPicker } from '@/components/MusicPicker';
import { MusicSticker } from '@/components/MusicSticker';

type LibraryTrack = { url: string; title: string; artist: string } | null;

export default function CreateStoryPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [selectedLibraryTrack, setSelectedLibraryTrack] = useState<LibraryTrack>(null);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [audience, setAudience] = useState<'public' | 'close_friends'>('public');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  const hasMusic = !!selectedLibraryTrack;

  const startPreviewMusic = useCallback(() => {
    if (!selectedLibraryTrack?.url) return;
    const audio = previewAudioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play()
      .then(() => setPreviewPlaying(true))
      .catch(() => setPreviewPlaying(false));
    if (previewVideoRef.current) previewVideoRef.current.muted = true;
  }, [selectedLibraryTrack]);

  useEffect(() => {
    if (!selectedLibraryTrack?.url) {
      setPreviewPlaying(false);
      previewAudioRef.current?.pause();
      return;
    }
    const t = setTimeout(startPreviewMusic, 80);
    return () => clearTimeout(t);
  }, [selectedLibraryTrack, startPreviewMusic]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
  };

  const handleMusicSelect = (track: { url: string; title: string; artist: string }) => {
    setSelectedLibraryTrack(track);
    setShowMusicPicker(false);
  };

  const togglePreviewMusic = () => {
    if (!selectedLibraryTrack?.url) return;
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (previewPlaying) {
      audio.pause();
      setPreviewPlaying(false);
    } else {
      startPreviewMusic();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Zgjidhni një foto ose video.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('audience', audience);
      if (selectedLibraryTrack) {
        formData.append('musicData', JSON.stringify(selectedLibraryTrack));
        formData.append('musicUrl', selectedLibraryTrack.url);
        formData.append('musicTitle', selectedLibraryTrack.title);
        formData.append('musicArtist', selectedLibraryTrack.artist);
      }
      const res = await apiUpload<{ story?: { music?: { url?: string } } }>('/api/stories', formData);
      if (selectedLibraryTrack && !res.story?.music?.url) {
        setError('Story u publikua, por muzika nuk u ruajt. Rinisni backend-in ose bëni deploy në Render.');
        return;
      }
      router.push('/feed');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim gjatë publikimit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-page max-w-[470px] mx-auto py-5 sm:py-6 overflow-x-hidden">
      {showMusicPicker && (
        <MusicPicker
          onSelect={handleMusicSelect}
          onClose={() => setShowMusicPicker(false)}
        />
      )}

      <div className="flex items-center gap-3 mb-5">
        <Link href="/feed" className="ig-touch text-[var(--text)] -ml-2" aria-label="Mbrapsht">←</Link>
        <h1 className="text-[20px] font-semibold text-[var(--text)]">Story i ri</h1>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="auth-card p-6 space-y-5"
      >
        {error && (
          <p className="text-[13px] text-[var(--danger)] bg-[var(--primary-soft)] px-3 py-2 rounded-lg">{error}</p>
        )}

        <div>
          <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
          {preview ? (
            <div className="relative aspect-[9/16] max-h-[420px] mx-auto rounded-2xl overflow-hidden bg-black border border-[var(--border)]">
              {file?.type.startsWith('video') ? (
                <video
                  ref={previewVideoRef}
                  src={preview}
                  className="w-full h-full object-contain"
                  muted={hasMusic}
                  playsInline
                  loop
                  autoPlay
                />
              ) : (
                <img src={preview} alt="" className="w-full h-full object-contain" />
              )}
              {selectedLibraryTrack && (
                <>
                  <audio
                    ref={previewAudioRef}
                    src={selectedLibraryTrack.url}
                    loop
                    playsInline
                    preload="auto"
                    onPause={() => setPreviewPlaying(false)}
                  />
                  <div className="absolute bottom-4 left-4 right-4 z-10">
                    <MusicSticker
                      title={selectedLibraryTrack.title}
                      artist={selectedLibraryTrack.artist}
                      playing={previewPlaying}
                      onClick={togglePreviewMusic}
                    />
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 text-white text-[12px] font-medium"
              >
                Ndrysho
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[9/16] max-h-[360px] border-2 border-dashed border-[var(--border)] rounded-2xl flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] hover:border-[var(--albanian-red)] transition-colors"
            >
              <span className="text-4xl">⭕</span>
              <span className="text-[14px] font-medium">Zgjidh foto ose video</span>
              <span className="text-[12px] opacity-70">Zhduket pas 24 orësh</span>
            </button>
          )}
        </div>

        <div className="border-t border-[var(--border)] pt-4">
          <p className="text-[14px] font-semibold mb-3">Kush e shikon?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAudience('public')}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold ${audience === 'public' ? 'bg-[var(--ig-blue)] text-white' : 'border border-[var(--border)]'}`}
            >
              Të gjithë
            </button>
            <button
              type="button"
              onClick={() => setAudience('close_friends')}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold ${audience === 'close_friends' ? 'bg-emerald-500 text-white' : 'border border-[var(--border)]'}`}
            >
              Miq të ngushtë
            </button>
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-4">
          <p className="text-[14px] font-semibold mb-3 flex items-center gap-2">
            <span className="text-[var(--albanian-red)]">♪</span> Muzikë për Story
          </p>
          {hasMusic ? (
            <div className="flex items-center gap-2">
              <MusicSticker
                title={selectedLibraryTrack!.title}
                artist={selectedLibraryTrack!.artist}
                playing={previewPlaying}
                onClick={togglePreviewMusic}
              />
              <button
                type="button"
                onClick={() => { setSelectedLibraryTrack(null); setPreviewPlaying(false); }}
                className="text-[12px] text-[var(--text-muted)] ml-auto hover:text-[var(--danger)]"
              >
                Hiq
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowMusicPicker(true)}
              className="w-full py-3 rounded-xl border border-[var(--border)] text-[14px] font-medium hover:border-[var(--albanian-red)] transition-colors"
            >
              Zgjidh nga biblioteka muzikore
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !file}
          className="auth-btn py-3.5 w-full"
          style={{ background: 'var(--albanian-red)' }}
        >
          {loading ? 'Duke publikuar...' : 'Publiko Story'}
        </button>
      </motion.form>
    </div>
  );
}
