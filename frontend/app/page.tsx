'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AppLogo } from '@/components/AppLogo';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] relative overflow-hidden">
      {/* Background – gradient i butë */}
      <div
        className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08]"
        style={{
          background: 'radial-gradient(ellipse 90% 70% at 50% 10%, var(--primary), transparent 60%), radial-gradient(ellipse 70% 60% at 90% 90%, var(--primary), transparent 50%)',
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,var(--bg)_65%)]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center w-full max-w-[400px] px-8"
      >
        {/* Kartë e lehtë qendrore */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45, ease: 'easeOut' }}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]/80 dark:bg-[var(--bg-card)]/90 shadow-xl shadow-black/5 dark:shadow-black/20 p-8 sm:p-10"
        >
          {/* Logo + ALBNET */}
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <AppLogo size={80} />
            </motion.div>
            <h1 className="mt-5 text-[28px] sm:text-[32px] font-bold tracking-tight text-[var(--text)]">
              ALBNET
            </h1>
            <div className="mt-2 w-12 h-0.5 rounded-full bg-[var(--primary)]/40" />
          </div>

          <p className="mt-6 text-[15px] text-[var(--text-muted)] text-center leading-relaxed">
            Ndani momentet me miq dhe familjen.
            <br />
            <span className="text-[14px] text-[var(--text-secondary)]">Platforma sociale shqiptare.</span>
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link href="/kycu" className="block w-full">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-xl text-[15px] font-semibold text-white bg-[var(--primary)] shadow-md shadow-[var(--primary)]/30 hover:brightness-110 active:brightness-90 transition-all"
              >
                Kyçu
              </motion.button>
            </Link>
            <Link href="/regjistrohu" className="block w-full">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-xl text-[15px] font-semibold text-[var(--primary)] border-2 border-[var(--primary)] bg-transparent hover:bg-[var(--primary-soft)] transition-colors"
              >
                Regjistrohu
              </motion.button>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] text-[var(--text-secondary)]"
        >
          <span>Postime</span>
          <span className="text-[var(--border)]">·</span>
          <span>Story</span>
          <span className="text-[var(--border)]">·</span>
          <span>Mesazhe</span>
          <span className="text-[var(--border)]">·</span>
          <span>Eksploro</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
