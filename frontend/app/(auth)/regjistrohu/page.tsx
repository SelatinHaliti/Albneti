'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AppLogo } from '@/components/AppLogo';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/utils/api';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
};
const item = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api<{ user: unknown; token: string }>('/api/auth/regjistrohu', {
        method: 'POST',
        body: { username, email, fullName, password },
      });
      setAuth(data.user as Parameters<typeof setAuth>[0], data.token);
      router.push('/feed');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim gjatë regjistrimit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="auth-card w-full px-8 py-10 sm:px-10 sm:py-12"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex flex-col items-center text-center mb-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="mb-3"
        >
          <AppLogo size={56} />
        </motion.div>
        <motion.p
          variants={item}
          className="text-[var(--text-muted)] text-sm max-w-[280px]"
        >
          Regjistrohuni për të parë fotot dhe videot e miqve tuaj.
        </motion.p>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        className="space-y-2.5"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {error && (
          <motion.p
            variants={item}
            className="text-xs text-[var(--danger)] bg-[var(--primary-soft)] px-3 py-2.5 rounded-lg"
          >
            {error}
          </motion.p>
        )}
        <motion.div variants={item}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="auth-input"
            placeholder="Emri i përdoruesit"
            minLength={3}
            required
            autoComplete="username"
          />
        </motion.div>
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
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="auth-input"
            placeholder="Emri i plotë (opsional)"
            autoComplete="name"
          />
        </motion.div>
        <motion.div variants={item}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
            placeholder="Fjalëkalimi (min. 6 karaktere)"
            minLength={6}
            required
            autoComplete="new-password"
          />
        </motion.div>
        <motion.div variants={item} className="pt-1">
          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Duke u regjistruar...' : 'Regjistrohu'}
          </button>
        </motion.div>
      </motion.form>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 pt-6 border-t border-[var(--border)] text-center"
      >
        <p className="text-sm text-[var(--text-muted)]">
          Keni llogari?{' '}
          <Link href="/kycu" className="auth-link">
            Kyçu
          </Link>
        </p>
      </motion.div>
    </motion.div>
  );
}
