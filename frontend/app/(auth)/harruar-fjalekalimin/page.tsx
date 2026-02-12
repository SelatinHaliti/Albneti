'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AppLogo } from '@/components/AppLogo';
import { api } from '@/utils/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api('/api/auth/harruar-fjalekalimin', { method: 'POST', body: { email } });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim.');
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
          className="mb-4"
        >
          <AppLogo size={56} />
        </motion.div>
        <h1 className="text-lg font-semibold text-[var(--text)] mb-1">
          Harruat fjalëkalimin?
        </h1>
        <p className="text-sm text-[var(--text-muted)] max-w-[280px]">
          Vendosni email-in tuaj dhe do të dërgojmë një link për ta rifreskuar.
        </p>
      </div>

      {sent ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-4 px-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 text-sm border border-green-200 dark:border-green-800"
        >
          Nëse ekziston llogaria, do të merrni një email me udhëzime.
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <p className="text-xs text-[var(--danger)] bg-[var(--primary-soft)] px-3 py-2.5 rounded-lg">
              {error}
            </p>
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
            placeholder="Email"
            required
            autoComplete="email"
          />
          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? 'Duke dërguar...' : 'Dërgo linkun'}
          </button>
        </form>
      )}

      <div className="mt-8 pt-6 border-t border-[var(--border)] text-center">
        <Link href="/kycu" className="auth-link text-sm">
          Kthehu te kyçja
        </Link>
      </div>
    </motion.div>
  );
}
