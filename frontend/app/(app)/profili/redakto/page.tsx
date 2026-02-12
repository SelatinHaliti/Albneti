'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { apiUpload } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';

type ApiUser = {
  id: string;
  username: string;
  email?: string;
  fullName?: string;
  avatar?: string;
  bio?: string;
  website?: string;
  location?: string;
  isPrivate?: boolean;
  isVerified?: boolean;
  role?: string;
};

export default function EditProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [website, setWebsite] = useState(user?.website ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [isPrivate, setIsPrivate] = useState(!!user?.isPrivate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) {
      router.replace('/kycu');
      return;
    }
    setFullName(user.fullName ?? '');
    setBio(user.bio ?? '');
    setWebsite(user.website ?? '');
    setLocation(user.location ?? '');
    setIsPrivate(!!user.isPrivate);
  }, [user, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAvatarPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('fullName', fullName.trim());
      formData.append('bio', bio.trim());
      formData.append('website', website.trim());
      formData.append('location', location.trim());
      formData.append('isPrivate', String(isPrivate));
      const file = fileInputRef.current?.files?.[0];
      if (file) formData.append('media', file);

      const res = await apiUpload<{ success: boolean; user: ApiUser }>(
        '/api/users/profili',
        formData,
        'PUT'
      );

      if (res.user) {
        updateUser({
          id: res.user.id,
          username: res.user.username,
          email: res.user.email,
          fullName: res.user.fullName,
          avatar: res.user.avatar,
          bio: res.user.bio,
          website: res.user.website,
          location: res.user.location,
          isPrivate: res.user.isPrivate,
          isVerified: res.user.isVerified,
          role: res.user.role,
        });
      }
      setSuccess(true);
      setAvatarPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => {
        router.push(`/profili/${user?.username}`);
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim gjatë ruajtjes.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const displayAvatar = avatarPreview || user.avatar || '';

  return (
    <div className="max-w-[470px] mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/profili/${user.username}`} className="text-[var(--text)] text-xl" aria-label="Kthehu">
          ←
        </Link>
        <h1 className="text-lg font-semibold text-[var(--text)]">Redakto profilin</h1>
      </div>

      <motion.form
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {error && (
          <div className="p-3 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-sm">
            Ndryshimet u ruajtën. Duke u kthyer te profili...
          </div>
        )}

        <div className="flex items-center gap-6">
          <div className="relative">
            <img
              src={displayAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
              alt=""
              className="w-24 h-24 rounded-full object-cover bg-[var(--border)] ring-2 ring-[var(--border)]"
            />
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm font-semibold text-[var(--primary)] hover:underline"
            >
              Ndrysho foton e profilit
            </button>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">JPEG, PNG, GIF ose WebP</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Emri i plotë</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={50}
            placeholder="Emri i plotë"
            className="w-full px-4 py-2.5 text-sm border border-[var(--border)] rounded-xl bg-[var(--bg)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{fullName.length}/50</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={150}
            placeholder="Shkruaj diçka për veten..."
            className="w-full px-4 py-2.5 text-sm border border-[var(--border)] rounded-xl bg-[var(--bg)] text-[var(--text)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{bio.length}/150</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Faqja e internetit</label>
          <input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            maxLength={200}
            placeholder="https://..."
            className="w-full px-4 py-2.5 text-sm border border-[var(--border)] rounded-xl bg-[var(--bg)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Vendndodhja</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={100}
            placeholder="Qyteti, Shteti"
            className="w-full px-4 py-2.5 text-sm border border-[var(--border)] rounded-xl bg-[var(--bg)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--bg)]">
          <div>
            <p className="text-sm font-medium text-[var(--text)]">Profili privat</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Vetëm ndjekësit e miratuar shikojnë postimet</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPrivate}
            onClick={() => setIsPrivate((v) => !v)}
            className={`relative w-11 h-6 rounded-full transition-colors ${isPrivate ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isPrivate ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? 'Duke ruajtur...' : 'Ruaj ndryshimet'}
        </button>
      </motion.form>
    </div>
  );
}
