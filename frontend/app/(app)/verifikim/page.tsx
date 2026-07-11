'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
  stripeEnabled?: boolean;
  testMode?: boolean;
};

const STEPS = [
  { n: 1, label: 'Zgjidh planin' },
  { n: 2, label: 'Paguaj me Stripe' },
  { n: 3, label: 'Badge aktiv' },
];

function VerifikimContent() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const toast = useToastStore((s) => s.success);
  const toastError = useToastStore((s) => s.error);
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<SubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useDocumentTitle('Verifikim');

  const refreshStatus = useCallback(async () => {
    const fresh = await api<SubStatus>('/api/verification/status');
    setStatus(fresh);
    if (fresh.isVerified) {
      updateUser({ isVerified: true, verifiedPlan: fresh.subscription?.plan });
    }
    return fresh;
  }, [updateUser]);

  useEffect(() => {
    refreshStatus()
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, [refreshStatus]);

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      const sid = searchParams.get('session_id');
      router.replace(sid ? `/verifikim/sukses?session_id=${sid}` : '/verifikim');
      return;
    }
    if (searchParams.get('cancelled') === '1') {
      toastError('Pagesa u anulua. Mund të provosh përsëri kur të duash.');
      window.history.replaceState({}, '', '/verifikim');
    }
  }, [searchParams, router, toastError]);

  const handleSubscribe = async (planId: string) => {
    setSubscribing(planId);
    try {
      const res = await api<{
        success: boolean;
        message?: string;
        url?: string;
        simulated?: boolean;
        isVerified?: boolean;
        testMode?: boolean;
      }>('/api/verification/create-checkout', { method: 'POST', body: { plan: planId } });

      if (res.url) {
        setRedirecting(true);
        sessionStorage.setItem('albnet_checkout_plan', planId);
        window.location.href = res.url;
        return;
      }

      toast(res.message || 'U verifikua!');
      updateUser({ isVerified: true, verifiedPlan: planId });
      await refreshStatus();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Gabim gjatë abonimit.');
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Anuloni abonimin? Badge verifikimi do të hiqet.')) return;
    try {
      await api('/api/verification/cancel', { method: 'POST' });
      toast('Abonimi u anulua.');
      updateUser({ isVerified: false, verifiedPlan: undefined });
      await refreshStatus();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Gabim.');
    }
  };

  const plans = status?.plans || [];
  const isActive = status?.isVerified;
  const stripeOn = status?.stripeEnabled;
  const testMode = status?.testMode;
  const currentStep = isActive ? 3 : stripeOn ? 1 : 1;

  return (
    <>
      {redirecting && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white px-6 text-center">
          <div className="w-14 h-14 rounded-full border-4 border-white border-t-transparent animate-spin mb-4" />
          <p className="text-lg font-semibold">Duke hapur Stripe...</p>
          <p className="text-sm text-white/70 mt-2">Pas pagesës kthehesh automatikisht në AlbNet</p>
        </div>
      )}

      <div className="mobile-page verify-page max-w-[520px] mx-auto py-4 sm:py-8 overflow-x-hidden">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 px-1">
          <Link href={`/profili/${user?.username}`} className="ig-touch text-[var(--text)] -ml-1 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Mbrapsht">←</Link>
          <h1 className="text-[18px] sm:text-[20px] font-semibold text-[var(--text)] truncate">AlbNet Verifikuar</h1>
        </div>

        {!isActive && (
          <div className="flex items-center justify-between mb-5 px-1 gap-1">
            {STEPS.map((s) => (
              <div key={s.n} className="flex-1 text-center">
                <div
                  className={`w-7 h-7 mx-auto rounded-full text-[11px] font-bold flex items-center justify-center mb-1 ${
                    currentStep >= s.n ? 'bg-[var(--ig-blue)] text-white' : 'bg-[var(--border)] text-[var(--text-muted)]'
                  }`}
                >
                  {s.n}
                </div>
                <p className="text-[9px] sm:text-[10px] text-[var(--text-muted)] leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="liquid-glass-ultra rounded-2xl sm:rounded-3xl p-5 sm:p-8 mb-4 sm:mb-6 text-center relative overflow-hidden"
        >
          <div className="liquid-shine" aria-hidden />
          <div className="relative z-10">
            <div className="flex justify-center mb-3 sm:mb-4">
              {isActive ? <VerifiedBadgeGold size={44} /> : <VerifiedBadge size={44} />}
            </div>
            <h2 className="text-[20px] sm:text-[22px] font-bold text-[var(--text)] mb-2">
              {isActive ? 'Je i verifikuar!' : 'Verifiko llogarinë tënde'}
            </h2>
            <p className="text-[13px] sm:text-[14px] text-[var(--text-muted)] leading-relaxed max-w-[340px] mx-auto px-1">
              {isActive
                ? 'Badge-i yt blu shfaqet kudo. Krijuesit e verifikuar marrin prioritet në feed dhe promovim në komunitet.'
                : 'Si Instagram Meta Verified – zgjidh planin, paguaj me kartë (Stripe), dhe kthehu i verifikuar automatikisht.'}
            </p>
            {isActive && status?.subscription?.expiresAt && (
              <p className="text-[11px] sm:text-[12px] text-[var(--text-muted)] mt-3">
                Aktiv deri më {new Date(status.subscription.expiresAt).toLocaleDateString('sq-AL')}
              </p>
            )}
          </div>
        </motion.div>

        {loading ? (
          <div className="space-y-3 sm:space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-36 sm:h-40 liquid-glass rounded-2xl animate-shimmer" />
            ))}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {!stripeOn && !isActive && (
              <div className="liquid-glass-card rounded-xl p-4 border border-amber-500/30 bg-amber-500/5 text-[12px] text-[var(--text-muted)]">
                ⚠️ Stripe nuk është aktiv në server. Vendos <code className="text-[11px]">STRIPE_SECRET_KEY</code> në Render, pastaj Redeploy.
              </div>
            )}

            {plans.map((plan) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`verify-plan-card liquid-glass-card rounded-2xl p-4 sm:p-5 border ${
                  plan.id === 'yearly' ? 'border-[var(--ig-blue)]/40 ring-1 ring-[var(--ig-blue)]/20' : 'border-[var(--border)]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] sm:text-[17px] font-bold text-[var(--text)] flex flex-wrap items-center gap-1.5 sm:gap-2">
                      {plan.name}
                      {plan.id === 'yearly' && (
                        <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--ig-blue)] text-white shrink-0">POPULLOR</span>
                      )}
                    </h3>
                    <p className="text-[24px] sm:text-[28px] font-bold text-[var(--text)] mt-1">
                      €{plan.price}
                      <span className="text-[13px] sm:text-[14px] font-medium text-[var(--text-muted)]">/{plan.period}</span>
                    </p>
                    {plan.savings && (
                      <p className="text-[11px] sm:text-[12px] text-[var(--success)] font-semibold">Kursen {plan.savings}</p>
                    )}
                  </div>
                  <div className="shrink-0 pt-1">
                    {plan.id === 'yearly' ? <VerifiedBadgeGold size={24} /> : <VerifiedBadge size={24} />}
                  </div>
                </div>
                <ul className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-5">
                  {plan.benefits.map((b) => (
                    <li key={b} className="text-[12px] sm:text-[13px] text-[var(--text-muted)] flex items-start gap-2">
                      <span className="text-[var(--ig-blue)] mt-0.5 shrink-0">✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                {!isActive ? (
                  <button
                    type="button"
                    disabled={!!subscribing || redirecting}
                    onClick={() => handleSubscribe(plan.id)}
                    className="verify-cta-btn w-full py-3.5 sm:py-3 rounded-xl font-semibold text-[14px] text-white bg-[var(--ig-blue)] hover:bg-[var(--ig-blue-hover)] transition-colors disabled:opacity-50 min-h-[48px]"
                  >
                    {subscribing === plan.id
                      ? 'Duke hapur Stripe...'
                      : stripeOn
                        ? `Verifikohu – €${plan.price}/${plan.period}`
                        : `Abonohu (dev) – €${plan.price}/${plan.period}`}
                  </button>
                ) : status?.subscription?.plan === plan.id ? (
                  <div className="text-center text-[13px] font-semibold text-[var(--success)] py-2">✓ Plani aktiv</div>
                ) : null}
              </motion.div>
            ))}

            {isActive && (
              <button
                type="button"
                onClick={handleCancel}
                className="w-full py-3.5 sm:py-3 rounded-xl text-[14px] font-medium text-[var(--danger)] border border-[var(--border)] hover:bg-[var(--primary-soft)] transition-colors min-h-[48px]"
              >
                Anulo abonimin
              </button>
            )}

            <div className="verify-footer-note text-[10px] sm:text-[11px] text-center text-[var(--text-muted)] px-2 sm:px-4 space-y-1 pb-2">
              {stripeOn ? (
                <>
                  <p>🔒 Pagesë e sigurt me Stripe{testMode ? ' (test)' : ''}. Kthehesh automatikisht në AlbNet pas pagesës.</p>
                  {testMode && (
                    <p className="opacity-90 font-medium">Kartë test: 4242 4242 4242 4242 · skadencë e ardhshme · CVC 123</p>
                  )}
                </>
              ) : (
                <p>Pa Stripe në Render, verifikimi aktivizohet menjëherë (vetëm dev).</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function VerifikimPage() {
  return (
    <Suspense fallback={<div className="mobile-page py-16 text-center text-[var(--text-muted)]">Duke ngarkuar...</div>}>
      <VerifikimContent />
    </Suspense>
  );
}
