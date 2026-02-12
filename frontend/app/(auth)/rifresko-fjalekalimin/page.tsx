'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { api } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Fjalëkalimet nuk përputhen.');
      return;
    }
    if (password.length < 6) {
      setError('Fjalëkalimi duhet të ketë të paktën 6 karaktere.');
      return;
    }
    if (!token) {
      setError('Linku është i pavlefshëm.');
      return;
    }
    setLoading(true);
    try {
      const data = await api<{ user: unknown; token: string }>('/api/auth/rifresko-fjalekalimin', {
        method: 'POST',
        body: { token, newPassword: password },
      });
      setAuth(data.user as Parameters<typeof setAuth>[0], data.token);
      setSuccess(true);
      setTimeout(() => router.push('/feed'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <p className="text-center text-[var(--danger)] py-4">
        Linku është i pavlefshëm. Kërkoeni përsëri një link për rifreskim.
      </p>
    );
  }

  if (success) {
    return (
      <p className="text-center text-green-600 dark:text-green-400 py-4">
        Fjalëkalimi u ndryshua. Duke ju ridrejtuar...
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-[var(--danger)] bg-[var(--primary-soft)] p-3 rounded-lg">{error}</p>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fjalëkalimi i ri</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
          minLength={6}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Konfirmo fjalëkalimin</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
          minLength={6}
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50"
      >
        {loading ? 'Duke ruajtur...' : 'Ndrysho fjalëkalimin'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-8 border border-gray-100 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-center mb-2">Vendosni fjalëkalimin e ri</h1>
        <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-6">
          Zgjidhni një fjalëkalim të ri për llogarinë tuaj.
        </p>
        <Suspense fallback={<p className="text-center text-gray-500">Duke ngarkuar...</p>}>
          <ResetForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/kycu" className="text-primary-500 hover:underline">Kthehu te kyçja</Link>
        </p>
      </div>
    </motion.div>
  );
}
