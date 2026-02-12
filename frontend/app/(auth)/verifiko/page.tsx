'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';

function VerifyForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleVerify = async () => {
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
      setAuth(data.user as Parameters<typeof setAuth>[0], data.token);
      setSuccess(true);
      setTimeout(() => router.push('/feed'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Linku është i pavlefshëm ose ka skaduar.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <p className="text-center text-[var(--danger)] py-4">
        Linku i verifikimit mungon. Kontrolloni email-in tuaj.
      </p>
    );
  }

  if (success) {
    return (
      <p className="text-center text-green-600 dark:text-green-400 py-4">
        Llogaria u verifikua. Duke ju ridrejtuar...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-[var(--danger)] bg-[var(--primary-soft)] p-3 rounded-lg">{error}</p>
      )}
      <button
        type="button"
        onClick={handleVerify}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 disabled:opacity-50"
      >
        {loading ? 'Duke verifikuar...' : 'Verifiko llogarinë'}
      </button>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft p-8 border border-gray-100 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-center mb-2">Verifiko email-in</h1>
        <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-6">
          Kliko butonin më poshtë për të verifikuar llogarinë tënde.
        </p>
        <Suspense fallback={<p className="text-center text-gray-500">Duke ngarkuar...</p>}>
          <VerifyForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/kycu" className="text-primary-500 hover:underline">Kthehu te kyçja</Link>
        </p>
      </div>
    </motion.div>
  );
}
