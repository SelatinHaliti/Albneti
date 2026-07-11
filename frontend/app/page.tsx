'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AppLogo } from '@/components/AppLogo';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] relative overflow-hidden">
      {/* Liquid glass background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] left-[10%] w-[50%] h-[50%] rounded-full opacity-[0.06] blur-[120px]" style={{ background: 'var(--ig-gradient)' }} />
        <div className="absolute -bottom-[20%] right-[5%] w-[45%] h-[45%] rounded-full opacity-[0.05] blur-[100px]" style={{ background: 'var(--ig-gradient)' }} />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[30%] h-[30%] rounded-full bg-[var(--primary)] opacity-[0.03] blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center w-full max-w-[400px] px-6"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
          className="w-full liquid-glass-strong rounded-[24px] p-8 sm:p-10"
        >
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: 'spring', stiffness: 200 }}
            >
              <AppLogo size={80} />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="mt-4 text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[var(--text)]"
            >
              ALBNET
            </motion.h1>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 48 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="mt-2 h-[2px] rounded-full"
              style={{ background: 'var(--ig-gradient)' }}
            />
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="mt-5 text-[14px] text-[var(--text-muted)] text-center leading-relaxed"
          >
            Ndani momentet me miq dhe familjen.
            <br />
            <span className="text-[13px] text-[var(--text-secondary)]">Platforma sociale shqiptare.</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="mt-7 flex flex-col gap-2.5"
          >
            <Link href="/kycu" className="block w-full">
              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl text-[14px] font-semibold text-white bg-[var(--primary)] shadow-lg shadow-[var(--primary-glow)] transition-all"
              >
                Kyçu
              </motion.button>
            </Link>
            <Link href="/regjistrohu" className="block w-full">
              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl text-[14px] font-semibold text-[var(--primary)] border border-[var(--primary)]/30 glass-card transition-all"
              >
                Regjistrohu
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[12px] text-[var(--text-secondary)]"
        >
          {['Postime', 'Story', 'Reels', 'Mesazhe'].map((label, i) => (
            <span key={label} className="flex items-center gap-3">
              {i > 0 && <span className="w-1 h-1 rounded-full bg-[var(--text-secondary)]/40" />}
              {label}
            </span>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
