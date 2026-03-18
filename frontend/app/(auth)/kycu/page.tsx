'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { AppLogo } from '@/components/AppLogo';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/utils/api';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [reasonMessage, setReasonMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'session' || reason === 'forbidden' || reason === 'verify') {
      logout();
      if (reason === 'session') setReasonMessage('Sesioni ka skaduar. Kyçuni përsëri.');
      else setReasonMessage('Nuk keni leje për këtë veprim. Kyçuni përsëri.');
      if (reason === 'verify') setReasonMessage('Regjistrimi u krye. Verifikoni email-in para se të kyçeni.');
    }
  }, [searchParams, logout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const data = await api<{ user: unknown; token: string }>('/api/auth/kycu', {
        method: 'POST',
        body: { email, password },
      });
      setAuth(data.user as Parameters<typeof setAuth>[0], data.token);
      router.push('/feed');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim gjatë kyçjes.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    if (!email.trim()) {
      setError('Shkruani email-in për të dërguar verifikimin.');
      return;
    }
    setResendLoading(true);
    try {
      const data = await api<{ success: boolean; message?: string }>('/api/auth/ridergo-verifikimin', {
        method: 'POST',
        body: { email },
      });
      setInfo(data.message || 'Nëse ekziston llogaria, do të merrni një email verifikimi.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nuk u arrit të dërgohet email-i i verifikimit.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <motion.div
      className="auth-card w-full px-8 py-10 sm:px-10 sm:py-12"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex flex-col items-center text-center mb-8">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="mb-4"
        >
          <AppLogo size={64} />
        </motion.div>
        <motion.p
          variants={item}
          className="text-[var(--text-muted)] text-sm max-w-[260px]"
        >
          Kyçuni për të vazhduar në AlbNet
        </motion.p>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        className="space-y-3"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {reasonMessage && (
          <motion.div
            variants={item}
            className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 px-3 py-2.5 rounded-lg border border-amber-200 dark:border-amber-800"
          >
            {reasonMessage}
          </motion.div>
        )}
        {error && (
          <motion.p
            variants={item}
            className="text-xs text-[var(--danger)] bg-[var(--primary-soft)] px-3 py-2.5 rounded-lg"
          >
            {error}
          </motion.p>
        )}
        {info && (
          <motion.div
            variants={item}
            className="text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300 px-3 py-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800"
          >
            {info}
          </motion.div>
        )}
        <motion.div variants={item}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            placeholder="Email"
            required
            autoComplete="email"
          />
        </motion.div>
        <motion.div variants={item}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            placeholder="Fjalëkalimi"
            required
            autoComplete="current-password"
          />
        </motion.div>
        <motion.div variants={item} className="pt-1">
          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Duke u kyçur...' : 'Kyçu'}
          </button>
        </motion.div>

        <motion.div variants={item} className="pt-1">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            className="w-full text-sm py-3 rounded-xl border border-[var(--border)] text-[var(--text)] hover:bg-white/40 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            {resendLoading ? 'Duke dërguar...' : 'Dërgo sërish email-in e verifikimit'}
          </button>
        </motion.div>
      </motion.form>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 pt-6 border-t border-[var(--border)] space-y-3 text-center"
      >
        <p className="text-sm text-[var(--text-muted)]">
          Nuk keni llogari?{' '}
          <Link href="/regjistrohu" className="auth-link">
            Regjistrohuni
          </Link>
        </p>
        <p>
          <Link
            href="/harruar-fjalekalimin"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Harruat fjalëkalimin?
          </Link>
        </p>
      </motion.div>
    </motion.div>
  );
}
