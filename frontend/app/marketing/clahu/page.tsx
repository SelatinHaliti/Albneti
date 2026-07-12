'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppLogo } from '@/components/AppLogo';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Lidhja e çabonimit nuk është e vlefshme.');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/marketing/unsubscribe?token=${encodeURIComponent(token)}`, {
          method: 'GET',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Gabim');
        setStatus('ok');
        setMessage(data.message || 'U çabonuat me sukses.');
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Gabim gjatë çabonimit.');
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px] text-center">
        <div className="flex justify-center mb-6">
          <AppLogo size={48} />
        </div>
        <h1 className="text-[22px] font-bold text-[var(--text)] mb-2">AlbNet Ads</h1>
        {status === 'loading' && (
          <p className="text-[var(--text-muted)]">Duke përpunuar çabonimin...</p>
        )}
        {status === 'ok' && (
          <>
            <p className="text-[15px] text-[var(--success)] font-semibold mb-2">✓ {message}</p>
            <p className="text-[13px] text-[var(--text-muted)] mb-6">
              Nuk do të merrni më emailet javore marketing. Mund t&apos;i aktivizoni përsëri nga cilësimet e profilit.
            </p>
          </>
        )}
        {status === 'error' && (
          <p className="text-[15px] text-[var(--danger)] mb-6">{message}</p>
        )}
        <Link
          href="/feed"
          className="inline-block px-6 py-3 rounded-xl bg-[var(--ig-blue)] text-white font-semibold text-[14px]"
        >
          Kthehu në AlbNet
        </Link>
      </div>
    </div>
  );
}

export default function MarketingUnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Duke ngarkuar...</div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}
