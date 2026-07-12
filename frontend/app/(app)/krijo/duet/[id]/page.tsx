'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, apiUpload } from '@/utils/api';

export default function CreateDuetPage() {
  const params = useParams();
  const router = useRouter();
  const reelId = params?.id as string;
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Zgjidhni videon tuaj për duet.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('caption', caption);
      await apiUpload(`/api/posts/${reelId}/duet`, formData);
      router.push('/reels');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-page max-w-[470px] mx-auto py-5 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/reels" className="text-xl">←</Link>
        <h1 className="text-[20px] font-semibold">Krijo Duet</h1>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}

        <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />
        {preview ? (
          <div className="relative aspect-[9/16] max-h-[400px] rounded-2xl overflow-hidden bg-black">
            <video src={preview} className="w-full h-full object-contain" controls playsInline />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 text-white text-[12px]">
              Ndrysho
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-[9/16] max-h-[360px] border-2 border-dashed border-[var(--border)] rounded-2xl flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]"
          >
            <span className="text-3xl">🎬</span>
            <span className="text-[14px] font-medium">Ngarko videon tënde</span>
          </button>
        )}

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption (opsional)"
          rows={2}
          maxLength={2200}
          className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] resize-none"
        />

        <button
          type="submit"
          disabled={loading || !file}
          className="w-full py-3.5 rounded-xl bg-[var(--ig-blue)] text-white font-semibold disabled:opacity-50"
        >
          {loading ? 'Duke publikuar...' : 'Publiko Duet'}
        </button>
      </form>
    </div>
  );
}
