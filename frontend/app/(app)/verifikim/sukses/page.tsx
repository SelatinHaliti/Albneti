'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { api } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { VerifiedBadgeGold } from '@/components/VerifiedBadge';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type ConfirmRes = {
  success: boolean;
  message: string;
  isVerified: boolean;
  subscription?: { plan: string; expiresAt?: string };
};

function SuksesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const updateUser = useAuthStore((s) => s.updateUser);
  const user = useAuthStore((s) => s.user);
  const sessionId = searchParams.get('session_id');
  const [phase, setPhase] = useState<'confirming' | 'success' | 'error'>('confirming');
  const [message, setMessage] = useState('Duke konfirmuar pagesën...');
  const [plan, setPlan] = useState<string | null>(null);
  const triedRef = useRef(false);

  useDocumentTitle('Verifikim u krye');

  useEffect(() => {
    if (!user) {
      router.replace('/kycu?redirect=/verifikim/sukses' + (sessionId ? `?session_id=${sessionId}` : ''));
      return;
    }
    if (!sessionId) {
      router.replace('/verifikim');
      return;
    }
    if (triedRef.current) return;
    triedRef.current = true;

    const confirm = async (attempt = 0): Promise<void> => {
      try {
        const res = await api<ConfirmRes>('/api/verification/confirm-checkout', {
          method: 'POST',
          body: { sessionId },
        });
        setPlan(res.subscription?.plan || null);
        updateUser({ isVerified: true, verifiedPlan: res.subscription?.plan });
        setMessage(res.message || 'Je i verifikuar!');
        setPhase('success');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gabim gjatë konfirmimit.';
        if (attempt < 4 && /ende|prisni|përfundua/i.test(msg)) {
          setMessage(`Duke pritur konfirmimin nga Stripe... (${attempt + 1}/5)`);
          await new Promise((r) => setTimeout(r, 2000));
          return confirm(attempt + 1);
        }
        setMessage(msg);
        setPhase('error');
      }
    };

    confirm();
  }, [sessionId, user, router, updateUser]);

  if (phase === 'confirming') {
    return (
      <div className="mobile-page max-w-[480px] mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full border-4 border-[var(--ig-blue)] border-t-transparent animate-spin" />
        <p className="text-[16px] font-semibold text-[var(--text)]">{message}</p>
        <p className="text-[13px] text-[var(--text-muted)] mt-2">Mos mbyllni këtë faqe...</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="mobile-page max-w-[480px] mx-auto py-12 px-4 text-center">
        <div className="liquid-glass-card rounded-2xl p-6 border border-[var(--border)]">
          <p className="text-[40px] mb-3">⚠️</p>
          <h1 className="text-[18px] font-bold text-[var(--text)] mb-2">Pagesa u krye por konfirmimi vonoi</h1>
          <p className="text-[14px] text-[var(--text-muted)] mb-6">{message}</p>
          <div className="flex flex-col gap-2">
            <Link
              href="/verifikim"
              className="py-3 rounded-xl bg-[var(--ig-blue)] text-white font-semibold text-[14px]"
            >
              Kthehu te Verifikim
            </Link>
            <button
              type="button"
              onClick={() => {
                triedRef.current = false;
                setPhase('confirming');
                setMessage('Duke provuar përsëri...');
              }}
              className="py-3 rounded-xl border border-[var(--border)] text-[var(--text)] font-medium text-[14px]"
            >
              Provo përsëri
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-page max-w-[480px] mx-auto py-8 sm:py-12 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="liquid-glass-ultra rounded-3xl p-8 text-center relative overflow-hidden"
      >
        <div className="liquid-shine" aria-hidden />
        <div className="relative z-10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="flex justify-center mb-5"
          >
            <VerifiedBadgeGold size={64} />
          </motion.div>
          <h1 className="text-[24px] font-bold text-[var(--text)] mb-2">Mirë se erdhe në AlbNet Verifikuar!</h1>
          <p className="text-[14px] text-[var(--text-muted)] leading-relaxed mb-1">{message}</p>
          {plan && (
            <p className="text-[12px] text-[var(--success)] font-semibold mt-2">
              Plani: {plan === 'yearly' ? 'Krijues Pro (vjetor)' : 'Krijues (mujor)'}
            </p>
          )}
          <p className="text-[13px] text-[var(--text-muted)] mt-4">
            Badge-i blu yt është aktiv kudo — feed, komente, profil dhe komunitet.
          </p>
        </div>
      </motion.div>

      <div className="mt-6 space-y-3">
        <Link
          href={`/profili/${user?.username}`}
          className="block w-full py-3.5 rounded-xl bg-[var(--ig-blue)] text-white font-semibold text-[15px] text-center min-h-[48px]"
        >
          Shiko profilin tënd
        </Link>
        <Link
          href="/feed"
          className="block w-full py-3.5 rounded-xl border border-[var(--border)] text-[var(--text)] font-medium text-[15px] text-center min-h-[48px]"
        >
          Kthehu në feed
        </Link>
      </div>
    </div>
  );
}

export default function VerifikimSuksesPage() {
  return (
    <Suspense
      fallback={
        <div className="mobile-page max-w-[480px] mx-auto py-16 text-center">
          <div className="w-12 h-12 mx-auto rounded-full border-4 border-[var(--ig-blue)] border-t-transparent animate-spin" />
        </div>
      }
    >
      <SuksesContent />
    </Suspense>
  );
}
