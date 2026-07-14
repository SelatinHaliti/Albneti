'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AppLogo } from '@/components/AppLogo';
import { api } from '@/utils/api';
import { useAuthStore, normalizeAuthUser } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';

const ERROR_MESSAGES: Record<string, string> = {
  missing: 'Linku i verifikimit mungon. Kërkoni një email të ri.',
  invalid: 'Linku është i pavlefshëm ose ka skaduar. Kërkoni verifikim të ri.',
  server: 'Gabim në server gjatë verifikimit. Provoni përsëri.',
};

function VerifyForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const accessToken = searchParams.get('accessToken');
  const verified = searchParams.get('verified');
  const errorCode = searchParams.get('error');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const autoStarted = useRef(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const finishVerifiedSession = useCallback(
    (jwt: string, rawUser?: { uid?: string | null; username?: string | null; email?: string | null }) => {
      const normalized =
        normalizeAuthUser({
          id: rawUser?.uid,
          username: rawUser?.username,
          email: rawUser?.email,
          emailVerified: true,
        }) || null;
      if (!normalized) {
        setError('Sesioni u verifikua por përgjigja është e paplotë. Kyçuni manualisht.');
        return false;
      }
      setAuth(normalized, jwt);
      setSuccess(true);
      setTimeout(() => router.push('/feed'), 1200);
      return true;
    },
    [setAuth, router],
  );

  const handleVerify = useCallback(async () => {
    if (!token) {
      setError('Linku i verifikimit mungon.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await api<{ user: unknown; token: string }>('/api/auth/verifiko-email', {
        method: 'POST',
        body: { token },
      });
      const normalized = normalizeAuthUser(data.user);
      if (!normalized) throw new Error('Përgjigja e serverit është e paplotë.');
      setAuth(normalized, data.token);
      setSuccess(true);
      setTimeout(() => router.push('/feed'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Linku është i pavlefshëm ose ka skaduar.');
    } finally {
      setLoading(false);
    }
  }, [token, setAuth, router]);

  useEffect(() => {
    if (errorCode && !error) {
      setError(ERROR_MESSAGES[errorCode] || 'Verifikimi dështoi.');
    }
  }, [errorCode, error]);

  useEffect(() => {
    if (autoStarted.current || success) return;

    if (verified === '1' && accessToken) {
      autoStarted.current = true;
      setLoading(true);
      const ok = finishVerifiedSession(accessToken, {
        uid: searchParams.get('uid'),
        username: searchParams.get('username'),
        email: searchParams.get('email'),
      });
      if (!ok) setLoading(false);
      return;
    }

    if (token) {
      autoStarted.current = true;
      void handleVerify();
    }
  }, [
    verified,
    accessToken,
    token,
    success,
    handleVerify,
    finishVerifiedSession,
    searchParams,
  ]);

  if (success) {
    return (
      <p className="text-center text-green-600 dark:text-green-400 py-4 text-sm">
        Llogaria u verifikua. Duke ju ridrejtuar në AlbNet...
      </p>
    );
  }

  if (!token && !accessToken && !errorCode) {
    return (
      <p className="text-center text-[var(--danger)] py-4 text-sm">
        Linku i verifikimit mungon. Kontrolloni email-in ose{' '}
        <Link href="/prit-verifikimin" className="auth-link">
          kërkoni një të ri
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {loading && (
        <p className="text-center text-sm text-[var(--text-muted)]">Duke verifikuar llogarinë...</p>
      )}
      {error && (
        <p className="text-sm text-[var(--danger)] bg-[var(--primary-soft)] p-3 rounded-lg">{error}</p>
      )}
      {!loading && token && !accessToken && (
        <button type="button" onClick={handleVerify} disabled={loading} className="auth-btn w-full">
          Verifiko llogarinë
        </button>
      )}
      {error && (
        <p className="text-center text-sm">
          <Link href="/prit-verifikimin" className="auth-link">
            Dërgo email verifikimi përsëri
          </Link>
        </p>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <motion.div
      className="auth-card w-full px-8 py-10 sm:px-10 sm:py-12"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex flex-col items-center text-center mb-6">
        <AppLogo size={48} />
        <h1 className="text-xl font-bold mt-4 mb-2">Verifiko email-in</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Klikoni linkun në email — verifikimi bëhet automatikisht.
        </p>
      </div>
      <Suspense fallback={<p className="text-center text-[var(--text-muted)] text-sm">Duke ngarkuar...</p>}>
        <VerifyForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        <Link href="/kycu" className="auth-link">
          Kthehu te kyçja
        </Link>
      </p>
    </motion.div>
  );
}
