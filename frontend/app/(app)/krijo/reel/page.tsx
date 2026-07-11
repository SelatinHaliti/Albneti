'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { apiUpload } from '@/utils/api';
import { MusicPicker } from '@/components/MusicPicker';
import { MusicSticker } from '@/components/MusicSticker';

type LibraryTrack = { url: string; title: string; artist: string } | null;

export default function CreateReelPage() {
  const router = useRouter();
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedLibraryTrack, setSelectedLibraryTrack] = useState<LibraryTrack>(null);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  const hasMusic = selectedLibraryTrack || musicFile;
  const musicMeta = selectedLibraryTrack || (musicFile ? { title: musicFile.name.replace(/\.[^.]+$/, ''), artist: '', url: '' } : null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('video')) {
      setError('Reels duhet të jenë video (MP4, MOV...).');
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
  };

  const togglePreviewMusic = () => {
    if (!selectedLibraryTrack?.url) return;
    const audio = previewAudioRef.current;
    if (!audio) return;
    if (previewPlaying) {
      audio.pause();
      setPreviewPlaying(false);
    } else {
      audio.currentTime = 0;
      audio.play().then(() => setPreviewPlaying(true)).catch(() => {});
      previewVideoRef.current && (previewVideoRef.current.muted = true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Zgjidhni një video vertikale.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('caption', caption);
      formData.append('hashtags', hashtags);
      formData.append('type', 'reel');
      formData.append('media', file);
      if (selectedLibraryTrack) {
        formData.append('music', JSON.stringify(selectedLibraryTrack));
      } else if (musicFile) {
        formData.append('music', musicFile);
        formData.append('musicTitle', musicFile.name.replace(/\.[^.]+$/, ''));
      }
      await apiUpload('/api/posts', formData);
      router.push('/reels');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim gjatë publikimit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[470px] mx-auto px-4 py-5 sm:py-6">
      {showMusicPicker && (
        <MusicPicker
          onSelect={(t) => { setSelectedLibraryTrack(t); setMusicFile(null); setShowMusicPicker(false); }}
          onClose={() => setShowMusicPicker(false)}
        />
      )}

      <div className="flex items-center gap-3 mb-5">
        <Link href="/feed" className="ig-touch text-[var(--text)] -ml-2" aria-label="Mbrapsht">←</Link>
        <h1 className="text-[20px] font-semibold text-[var(--text)]">Reel i ri</h1>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="auth-card p-6 space-y-5"
      >
        {error && <p className="text-[13px] text-[var(--danger)] bg-[var(--primary-soft)] px-3 py-2 rounded-lg">{error}</p>}

        <div>
          <label className="block text-[14px] font-medium mb-2">Video vertikale</label>
          <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
          {preview ? (
            <div className="relative aspect-[9/16] max-h-[360px] mx-auto rounded-2xl overflow-hidden bg-black">
              <video
                ref={previewVideoRef}
                src={preview}
                className="w-full h-full object-cover"
                muted={!!hasMusic}
                playsInline
                loop
                autoPlay
              />
              {selectedLibraryTrack && (
                <>
                  <audio ref={previewAudioRef} src={selectedLibraryTrack.url} loop onEnded={() => setPreviewPlaying(false)} />
                  <div className="absolute bottom-3 left-3 right-3">
                    <MusicSticker
                      title={selectedLibraryTrack.title}
                      artist={selectedLibraryTrack.artist}
                      playing={previewPlaying}
                      onClick={togglePreviewMusic}
                    />
                  </div>
                </>
              )}
              <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute top-2 right-2 px-3 py-1 rounded-lg bg-black/60 text-white text-[12px]">
                Ndrysho
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[9/16] max-h-[280px] border-2 border-dashed border-[var(--border)] rounded-2xl flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] hover:border-[var(--albanian-red)] transition-colors"
            >
              <span className="text-4xl">🎬</span>
              <span className="text-[14px] font-medium">Zgjidh video për Reel</span>
            </button>
          )}
        </div>

        <div className="border-t border-[var(--border)] pt-4">
          <p className="text-[14px] font-semibold mb-3 flex items-center gap-2">
            <span className="text-[var(--albanian-red)]">♪</span> Muzikë për Reel
          </p>
          {hasMusic && musicMeta ? (
            <div className="flex items-center gap-2">
              <MusicSticker title={musicMeta.title} artist={musicMeta.artist || undefined} />
              <button type="button" onClick={() => { setSelectedLibraryTrack(null); setMusicFile(null); }} className="text-[12px] text-[var(--text-muted)] ml-auto">
                Hiq
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowMusicPicker(true)} className="w-full py-3 rounded-xl border border-[var(--border)] text-[14px] font-medium hover:border-[var(--albanian-red)] transition-colors">
              Zgjidh nga biblioteka muzikore
            </button>
          )}
        </div>

        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} maxLength={2200} className="auth-input resize-none" placeholder="Caption për reel..." />
        <input type="text" value={hashtags} onChange={(e) => setHashtags(e.target.value)} className="auth-input" placeholder="Hashtag: shqiperi, diaspora..." />

        <button type="submit" disabled={loading || !file} className="auth-btn py-3.5" style={{ background: 'var(--albanian-red)' }}>
          {loading ? 'Duke publikuar...' : 'Publiko Reel'}
        </button>
      </motion.form>
    </div>
  );
}
