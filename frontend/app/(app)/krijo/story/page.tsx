'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { apiUpload } from '@/utils/api';

export default function CreateStoryPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
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
      await apiUpload('/api/stories', formData);
      router.push('/feed');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/feed" className="text-2xl">←</Link>
        <h1 className="text-xl font-bold dark:text-white">Story i ri</h1>
      </div>
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4"
      >
        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</p>
        )}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 hover:border-primary-500 hover:text-primary-500 transition"
          >
            Zgjidh foto ose video (zhduket pas 24 orësh)
          </button>
          {preview && (
            <div className="mt-4 aspect-[9/16] max-h-80 rounded-xl overflow-hidden bg-gray-100">
              {file?.type.startsWith('video') ? (
                <video src={preview} className="w-full h-full object-cover" controls />
              ) : (
                <img src={preview} alt="" className="w-full h-full object-cover" />
              )}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50"
        >
          {loading ? 'Duke ngarkuar...' : 'Publiko story'}
        </button>
      </motion.form>
    </div>
  );
}
