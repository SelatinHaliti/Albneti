'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AppLogo } from '@/components/AppLogo';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[30%] -left-[15%] w-[60%] h-[60%] rounded-full bg-[var(--primary)] opacity-[0.04] dark:opacity-[0.06] blur-[100px]" />
        <div className="absolute -bottom-[20%] -right-[15%] w-[50%] h-[50%] rounded-full bg-[var(--primary)] opacity-[0.03] dark:opacity-[0.05] blur-[100px]" />
        <div className="absolute top-[20%] right-[10%] w-[25%] h-[25%] rounded-full bg-[var(--primary)] opacity-[0.02] dark:opacity-[0.03] blur-[80px]" />
      </div>

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center w-full max-w-[420px] px-6"
      >
        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
          className="w-full rounded-[24px] border border-[var(--border)] bg-[var(--bg-card)]/90 dark:bg-[var(--bg-elevated)]/90 backdrop-blur-xl shadow-[var(--shadow-lg)] p-8 sm:p-10"
        >
          {/* Logo + Title */}
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, duration: 0.5, type: 'spring', stiffness: 200 }}
            >
              <AppLogo size={88} />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="mt-5 text-[30px] sm:text-[34px] font-extrabold tracking-tight text-[var(--text)]"
            >
              ALBNET
            </motion.h1>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 48 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="mt-2.5 h-[3px] rounded-full bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent"
            />
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="mt-6 text-[15px] text-[var(--text-muted)] text-center leading-relaxed"
          >
            Ndani momentet me miq dhe familjen.
            <br />
            <span className="text-[13px] text-[var(--text-secondary)]">Platforma sociale shqiptare.</span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="mt-8 flex flex-col gap-3"
          >
            <Link href="/kycu" className="block w-full">
              <motion.button
                whileHover={{ scale: 1.015, boxShadow: '0 8px 24px var(--primary-glow)' }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-[14px] text-[15px] font-semibold text-white bg-[var(--primary)] shadow-md shadow-[var(--primary)]/20 transition-all"
              >
                Kyçu
              </motion.button>
            </Link>
            <Link href="/regjistrohu" className="block w-full">
              <motion.button
                whileHover={{ scale: 1.015, backgroundColor: 'var(--primary-soft)' }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3.5 rounded-[14px] text-[15px] font-semibold text-[var(--primary)] border-[1.5px] border-[var(--primary)]/30 bg-transparent transition-all"
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
          className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[13px] text-[var(--text-secondary)]"
        >
          {['Postime', 'Story', 'Mesazhe', 'Eksploro'].map((label, i) => (
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
