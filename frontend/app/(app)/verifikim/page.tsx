'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { api } from '@/utils/api';
import { useAuthStore } from '@/store/useAuthStore';
import { useToastStore } from '@/store/useToastStore';
import { VerifiedBadge, VerifiedBadgeGold } from '@/components/VerifiedBadge';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

type Plan = {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  savings?: string;
  benefits: string[];
};

type SubStatus = {
  isVerified: boolean;
  subscription: { plan: string; status: string; expiresAt?: string };
  plans: Plan[];
};

export default function VerifikimPage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const toast = useToastStore((s) => s.success);
  const toastError = useToastStore((s) => s.error);
  const [status, setStatus] = useState<SubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useDocumentTitle('Verifikim');

  useEffect(() => {
    api<SubStatus>('/api/verification/status')
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (planId: string) => {
    setSubscribing(planId);
    try {
      const res = await api<{ success: boolean; message: string; isVerified: boolean }>(
        '/api/verification/subscribe',
        { method: 'POST', body: { plan: planId } }
      );
      toast(res.message || 'U verifikua!');
      updateUser({ isVerified: true, verifiedPlan: planId });
      const fresh = await api<SubStatus>('/api/verification/status');
      setStatus(fresh);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Gabim gjatë abonimit.');
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    try {
      await api('/api/verification/cancel', { method: 'POST' });
      toast('Abonimi u anulua.');
      updateUser({ isVerified: false, verifiedPlan: undefined });
      const fresh = await api<SubStatus>('/api/verification/status');
      setStatus(fresh);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Gabim.');
    }
  };

  const plans = status?.plans || [];
  const isActive = status?.isVerified;

  return (
    <div className="mobile-page max-w-[520px] mx-auto py-6 sm:py-8 overflow-x-hidden">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/profili/${user?.username}`} className="ig-touch text-[var(--text)] -ml-2" aria-label="Mbrapsht">←</Link>
        <h1 className="text-[20px] font-semibold text-[var(--text)]">AlbNet Verifikuar</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="liquid-glass-ultra rounded-3xl p-6 sm:p-8 mb-6 text-center relative overflow-hidden"
      >
        <div className="liquid-shine" aria-hidden />
        <div className="relative z-10">
          <div className="flex justify-center mb-4">
            {isActive ? <VerifiedBadgeGold size={48} /> : <VerifiedBadge size={48} />}
          </div>
          <h2 className="text-[22px] font-bold text-[var(--text)] mb-2">
            {isActive ? 'Je i verifikuar!' : 'Verifiko llogarinë tënde'}
          </h2>
          <p className="text-[14px] text-[var(--text-muted)] leading-relaxed max-w-[340px] mx-auto">
            {isActive
              ? 'Badge-i yt blu shfaqet kudo. Krijuesit e verifikuar marrin prioritet në feed dhe promovim në komunitet.'
              : 'Si Instagram Meta Verified – merr badge blu, mbrojtje identiteti dhe përparësi në algoritëm.'}
          </p>
          {isActive && status?.subscription?.expiresAt && (
            <p className="text-[12px] text-[var(--text-muted)] mt-3">
              Aktiv deri më {new Date(status.subscription.expiresAt).toLocaleDateString('sq-AL')}
            </p>
          )}
        </div>
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 liquid-glass rounded-2xl animate-shimmer" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`liquid-glass-card rounded-2xl p-5 border ${
                plan.id === 'yearly' ? 'border-[var(--ig-blue)]/40 ring-1 ring-[var(--ig-blue)]/20' : 'border-[var(--border)]'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-[17px] font-bold text-[var(--text)] flex items-center gap-2">
                    {plan.name}
                    {plan.id === 'yearly' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--ig-blue)] text-white">POPULLOR</span>}
                  </h3>
                  <p className="text-[28px] font-bold text-[var(--text)] mt-1">
                    €{plan.price}
                    <span className="text-[14px] font-medium text-[var(--text-muted)]">/{plan.period}</span>
                  </p>
                  {plan.savings && (
                    <p className="text-[12px] text-[var(--success)] font-semibold">Kursen {plan.savings}</p>
                  )}
                </div>
                {plan.id === 'yearly' ? <VerifiedBadgeGold size={28} /> : <VerifiedBadge size={28} />}
              </div>
              <ul className="space-y-2 mb-5">
                {plan.benefits.map((b) => (
                  <li key={b} className="text-[13px] text-[var(--text-muted)] flex items-start gap-2">
                    <span className="text-[var(--ig-blue)] mt-0.5">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
              {!isActive ? (
                <button
                  type="button"
                  disabled={!!subscribing}
                  onClick={() => handleSubscribe(plan.id)}
                  className="w-full py-3 rounded-xl font-semibold text-[14px] text-white bg-[var(--ig-blue)] hover:bg-[var(--ig-blue-hover)] transition-colors disabled:opacity-50"
                >
                  {subscribing === plan.id ? 'Duke aktivizuar...' : `Abonohu – €${plan.price}/${plan.period}`}
                </button>
              ) : status?.subscription?.plan === plan.id ? (
                <div className="text-center text-[13px] font-semibold text-[var(--success)] py-2">Plani aktiv</div>
              ) : null}
            </motion.div>
          ))}

          {isActive && (
            <button
              type="button"
              onClick={handleCancel}
              className="w-full py-3 rounded-xl text-[14px] font-medium text-[var(--danger)] border border-[var(--border)] hover:bg-[var(--primary-soft)] transition-colors"
            >
              Anulo abonimin
            </button>
          )}

          <p className="text-[11px] text-center text-[var(--text-muted)] px-4">
            Pagesa simulohet për MVP. Së shpejti: Stripe &amp; Apple Pay për abonime reale.
          </p>
        </div>
      )}
    </div>
  );
}
