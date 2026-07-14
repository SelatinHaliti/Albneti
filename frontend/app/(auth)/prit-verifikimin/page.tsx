'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { AppLogo } from '@/components/AppLogo';
import { api } from '@/utils/api';

function PendingContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const showWarn = searchParams.get('warn') === '1';
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendError, setResendError] = useState('');

  const handleResend = async () => {
    if (!email.includes('@')) {
      setResendError('Email mungon. Regjistrohuni përsëri ose kyçuni me email-in tuaj.');
      return;
    }
    setResendError('');
    setResendMsg(null);
    setResendLoading(true);
    try {
      const data = await api<{ message?: string }>('/api/auth/ridergo-verifikimin', {
        method: 'POST',
        body: { email },
      });
      setResendMsg(data.message || 'Email u dërgua. Kontrolloni inbox-in.');
    } catch (err) {
      setResendError(err instanceof Error ? err.message : 'Email-i nuk u dërgua.');
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
      <div className="flex flex-col items-center text-center mb-6">
        <AppLogo size={56} />
        <h1 className="text-xl font-bold mt-4 mb-2">Verifiko email-in tënd</h1>
        <p className="text-sm text-[var(--text-muted)] max-w-[320px]">
          Për siguri, duhet të verifikosh email-in para se të hysh në AlbNet. Pa verifikim, llogaria nuk hapet.
        </p>
      </div>

      {email && (
        <p className="text-center text-sm mb-4 px-3 py-2.5 rounded-lg bg-[var(--primary-soft)] text-[var(--text)]">
          Dërguam link verifikimi te <strong>{email}</strong>
        </p>
      )}

      {showWarn && (
        <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 px-3 py-2.5 rounded-lg mb-4 text-center">
          Email-i mund të mos ketë arritur. Kliko &quot;Dërgo përsëri&quot; më poshtë.
        </p>
      )}

      <div className="space-y-3 text-sm text-[var(--text-muted)] mb-6">
        <p>1. Hap inbox-in (edhe dosjen <strong>Spam</strong>)</p>
        <p>2. Kliko butonin <strong>Verifiko llogarinë</strong> në email</p>
        <p>3. Pas verifikimit, kyçu dhe përdor platformën</p>
      </div>

      {resendError && (
        <p className="text-xs text-[var(--danger)] bg-[var(--primary-soft)] px-3 py-2.5 rounded-lg mb-3">
          {resendError}
        </p>
      )}
      {resendMsg && (
        <p className="text-xs text-green-600 dark:text-green-400 bg-green-500/10 px-3 py-2.5 rounded-lg mb-3">
          {resendMsg}
        </p>
      )}

      <button
        type="button"
        onClick={handleResend}
        disabled={resendLoading || !email}
        className="auth-btn w-full mb-3"
      >
        {resendLoading ? 'Duke dërguar...' : 'Dërgo përsëri email-in'}
      </button>

      <p className="text-center text-sm text-[var(--text-muted)]">
        Tashmë e verifikove?{' '}
        <Link href="/kycu" className="auth-link">
          Kyçu
        </Link>
      </p>
    </motion.div>
  );
}

export default function PendingVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-card w-full px-8 py-10 text-center text-sm text-[var(--text-muted)]">
          Duke ngarkuar...
        </div>
      }
    >
      <PendingContent />
    </Suspense>
  );
}
