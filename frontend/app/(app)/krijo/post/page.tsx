'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { apiUpload } from '@/utils/api';
import { MusicPicker } from '@/components/MusicPicker';

type LibraryTrack = { url: string; title: string; artist: string } | null;

export default function CreatePostPage() {
  const router = useRouter();
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [type, setType] = useState<'image' | 'video'>('image');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicTitle, setMusicTitle] = useState('');
  const [musicArtist, setMusicArtist] = useState('');
  const [selectedLibraryTrack, setSelectedLibraryTrack] = useState<LibraryTrack>(null);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
    if (selected[0].type.startsWith('video')) setType('video');
  };

  const handleMusicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setMusicFile(f || null);
    setSelectedLibraryTrack(null);
    if (f && !musicTitle) setMusicTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleSelectFromLibrary = (track: { url: string; title: string; artist: string }) => {
    setSelectedLibraryTrack(track);
    setMusicFile(null);
    setMusicTitle('');
    setMusicArtist('');
    setShowMusicPicker(false);
  };

  const clearMusic = () => {
    setMusicFile(null);
    setMusicTitle('');
    setMusicArtist('');
    setSelectedLibraryTrack(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setError('Zgjidhni të paktën një foto ose video.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('caption', caption);
      formData.append('hashtags', hashtags);
      formData.append('type', type);
      files.forEach((f) => formData.append('media', f));
      if (selectedLibraryTrack) {
        formData.append('music', JSON.stringify(selectedLibraryTrack));
      } else if (musicFile) {
        formData.append('music', musicFile);
        formData.append('musicTitle', musicTitle.trim() || 'Muzikë');
        formData.append('musicArtist', musicArtist.trim());
      }
      await apiUpload('/api/posts', formData);
      router.push('/feed');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim gjatë publikimit.');
    } finally {
      setLoading(false);
    }
  };

  const hasMusic = selectedLibraryTrack || musicFile;

  return (
    <div className="max-w-[470px] mx-auto px-4 py-5 sm:py-6">
      {showMusicPicker && (
        <MusicPicker
          onSelect={handleSelectFromLibrary}
          onClose={() => setShowMusicPicker(false)}
        />
      )}

      <div className="flex items-center gap-3 mb-5">
        <Link href="/feed" className="ig-touch text-[var(--text)] -ml-2 rounded-full hover:bg-[var(--bg)] transition-colors" aria-label="Mbrapsht">
          <span className="text-2xl leading-none">←</span>
        </Link>
        <h1 className="text-[20px] font-semibold text-[var(--text)]">Postim i ri</h1>
      </div>
      <motion.form
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="auth-card p-6 sm:p-8 space-y-5"
      >
        {error && (
          <p className="text-[13px] text-[var(--danger)] bg-red-50 dark:bg-red-950/30 px-4 py-3 rounded-[10px]">{error}</p>
        )}
        <div>
          <label className="block text-[14px] font-medium text-[var(--text)] mb-2">Foto / Video</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-10 border-2 border-dashed border-[var(--border)] rounded-[12px] text-[var(--text-muted)] text-[14px] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary-soft)]/30 transition-all bg-[var(--bg)]"
          >
            Kliko për të zgjedhur foto ose video
          </button>
          {previews.length > 0 && (
            <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {previews.map((url, i) => (
                <div key={i} className="relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-[var(--border)]">
                  {files[i]?.type.startsWith('video') ? (
                    <video src={url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Muzikë – si Instagram */}
        <div className="border-t border-[var(--border)] pt-5">
          <p className="text-[14px] font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
            <span className="text-[var(--primary)]" aria-hidden>♪</span>
            Shto muzikë (opsional)
          </p>
          {hasMusic ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
              <span className="text-[var(--primary)] text-lg">♪</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text)] truncate">
                  {selectedLibraryTrack?.title || musicTitle || 'Muzikë'}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {selectedLibraryTrack?.artist || musicArtist || '—'}
                </p>
              </div>
              <button type="button" onClick={clearMusic} className="text-sm text-[var(--text-muted)] hover:text-[var(--danger)]">
                Hiq
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowMusicPicker(true)}
                className="w-full py-3 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm font-medium hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition-colors mb-2"
              >
                Zgjidh nga biblioteka
              </button>
              <input
                ref={musicInputRef}
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/aac,audio/x-m4a,.mp3,.wav,.ogg,.m4a"
                className="hidden"
                onChange={handleMusicChange}
              />
              <button
                type="button"
                onClick={() => musicInputRef.current?.click()}
                className="w-full py-2.5 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)] text-sm hover:border-[var(--text-secondary)] transition-colors"
              >
                Ngarko skedarin tënd (MP3, WAV, M4A...)
              </button>
            </>
          )}
          {musicFile && !selectedLibraryTrack && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                type="text"
                value={musicTitle}
                onChange={(e) => setMusicTitle(e.target.value)}
                className="auth-input py-2 text-sm"
                placeholder="Emri i këngës"
              />
              <input
                type="text"
                value={musicArtist}
                onChange={(e) => setMusicArtist(e.target.value)}
                className="auth-input py-2 text-sm"
                placeholder="Artisti"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-[14px] font-medium text-[var(--text)] mb-2">Caption</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            maxLength={2200}
            className="auth-input resize-none"
            placeholder="Shto një caption..."
          />
        </div>
        <div>
          <label className="block text-[14px] font-medium text-[var(--text)] mb-2">Hashtag (të ndara me presje)</label>
          <input
            type="text"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            className="auth-input"
            placeholder="albnet, shqiperi, ..."
          />
        </div>
        <div>
          <label className="block text-[14px] font-medium text-[var(--text)] mb-2">Lloji</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'image' | 'video')}
            className="auth-input"
          >
            <option value="image">Foto</option>
            <option value="video">Video</option>
          </select>
        </div>
        <button type="submit" disabled={loading} className="auth-btn py-3.5 text-[15px]">
          {loading ? 'Duke publikuar...' : 'Publiko'}
        </button>
      </motion.form>
    </div>
  );
}
