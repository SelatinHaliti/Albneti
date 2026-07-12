'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api, apiUpload } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useAuthReady } from '@/hooks/useAuthReady';

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
  const { ready, isAuthenticated } = useAuthReady();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const logout = useAuthStore((s) => s.logout);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [website, setWebsite] = useState(user?.website ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [isPrivate, setIsPrivate] = useState(!!user?.isPrivate);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUsername, setDeleteUsername] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [marketingLoading, setMarketingLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated || !user) {
      router.replace('/kycu');
      return;
    }
    setFullName(user.fullName ?? '');
    setBio(user.bio ?? '');
    setWebsite(user.website ?? '');
    setLocation(user.location ?? '');
    setIsPrivate(!!user.isPrivate);
    void api<{ marketingEmailsOptIn: boolean }>('/api/users/me/marketing')
      .then((r) => setMarketingOptIn(r.marketingEmailsOptIn))
      .catch(() => {});
  }, [ready, isAuthenticated, user, router]);

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

  const handleDeleteAccount = async () => {
    if (deleteUsername.trim() !== user.username) {
      setError('Shkruani saktë emrin e përdoruesit.');
      return;
    }
    if (!confirm('Kjo veprim fshin përgjithmonë llogarinë, postimet dhe mesazhet. Vazhdoni?')) return;
    setDeleteLoading(true);
    setError('');
    try {
      await api('/api/users/me', {
        method: 'DELETE',
        body: { confirmUsername: deleteUsername.trim(), password: deletePassword || undefined },
      });
      logout();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fshirja e llogarisë dështoi.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const displayAvatar = avatarPreview || user.avatar || '';

  return (
    <div className="mobile-page max-w-[470px] mx-auto py-6 overflow-x-hidden">
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

        <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--bg)]">
          <div>
            <p className="text-sm font-medium text-[var(--text)]">AlbNet Ads (email javore)</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Lajme, trending dhe tips marketing 1x në javë</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={marketingOptIn}
            disabled={marketingLoading}
            onClick={async () => {
              setMarketingLoading(true);
              try {
                const next = !marketingOptIn;
                const res = await api<{ marketingEmailsOptIn: boolean }>('/api/users/me/marketing', {
                  method: 'PUT',
                  body: { optIn: next },
                });
                setMarketingOptIn(res.marketingEmailsOptIn);
              } catch (_) {
                setError('Nuk u përditësuan preferencat e email-it.');
              } finally {
                setMarketingLoading(false);
              }
            }}
            className={`relative w-11 h-6 rounded-full transition-colors ${marketingOptIn ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'} disabled:opacity-50`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${marketingOptIn ? 'translate-x-5' : 'translate-x-0'}`}
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

        <Link
          href="/profili/miq-te-ngushte"
          className="block w-full py-3 rounded-xl text-sm font-semibold text-center text-[var(--text)] border border-[var(--border)] hover:bg-[var(--primary-soft)] transition-colors"
        >
          Miq të ngushtë (Close Friends)
        </Link>

        <button
          type="button"
          onClick={async () => {
            if (!user) return;
            try {
              const token = localStorage.getItem('token');
              const res = await fetch('/api/users/me/eksport', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              if (!res.ok) throw new Error('Eksporti dështoi');
              const data = await res.json();
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `albneti-data-${user.username}.json`;
              a.click();
              URL.revokeObjectURL(url);
            } catch (_) {
              setError('Nuk u eksportuan të dhënat.');
            }
          }}
          className="w-full py-3 rounded-xl text-sm font-semibold text-[var(--text)] border border-[var(--border)] hover:bg-[var(--primary-soft)] transition-colors"
        >
          Eksporto të dhënat (GDPR)
        </button>

        <button
          type="button"
          onClick={() => { logout(); router.push('/'); }}
          className="w-full py-3 rounded-xl text-sm font-semibold text-[var(--danger)] border border-[var(--border)] hover:bg-[var(--primary-soft)] transition-colors"
        >
          Dil nga llogaria
        </button>

        <div className="pt-4 mt-2 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)] mb-3">Zona e rrezikshme</p>
          {!deleteOpen ? (
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[var(--danger)] hover:opacity-90 transition-opacity"
            >
              Fshi llogarinë përgjithmonë
            </button>
          ) : (
            <div className="space-y-3 p-4 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/5">
              <p className="text-[13px] text-[var(--text)]">
                Shkruani <strong>@{user.username}</strong> dhe fjalëkalimin për të konfirmuar fshirjen.
              </p>
              <input
                type="text"
                value={deleteUsername}
                onChange={(e) => setDeleteUsername(e.target.value)}
                placeholder={user.username}
                className="w-full px-4 py-2.5 text-sm border border-[var(--border)] rounded-xl bg-[var(--bg)]"
              />
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Fjalëkalimi (nëse ke)"
                className="w-full px-4 py-2.5 text-sm border border-[var(--border)] rounded-xl bg-[var(--bg)]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setDeleteOpen(false); setDeleteUsername(''); setDeletePassword(''); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-[var(--border)]"
                >
                  Anulo
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--danger)] disabled:opacity-50"
                >
                  {deleteLoading ? 'Duke fshirë...' : 'Fshi përgjithmonë'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.form>
    </div>
  );
}
