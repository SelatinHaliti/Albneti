'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AppLogo } from '@/components/AppLogo';
import { LandingHeroVisual } from '@/components/LandingHeroVisual';

const FEATURES = [
  { icon: '📸', label: 'Postime' },
  { icon: '⭕', label: 'Story' },
  { icon: '🎬', label: 'Reels' },
  { icon: '💬', label: 'Mesazhe' },
  { icon: '🌍', label: 'Chat Global' },
  { icon: '🦅', label: 'Diaspora' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[var(--bg)]">
      {/* Left hero – desktop */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 hero-glow" />
        <div
          className="absolute top-1/3 left-1/3 w-72 h-72 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: 'var(--albanian-red)' }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative flex flex-col items-center gap-6 p-10 max-w-[480px]"
        >
          <LandingHeroVisual />
          <div className="text-center mt-2">
            <span className="albanian-badge mb-3 inline-flex">🇦🇱 Platforma #1 Shqiptare</span>
            <p className="text-[20px] font-semibold text-[var(--text)] leading-snug">
              Ku shqiptarët ndajnë momentet, lidhen dhe rriten bashkë.
            </p>
            <p className="text-[14px] text-[var(--text-muted)] mt-2">
              Shqipëri · Kosovë · Maqedoni · Diaspora
            </p>
          </div>
        </motion.div>
      </div>

      {/* Mobile hero – compact */}
      <div className="lg:hidden w-full flex justify-center pt-8 pb-2 px-4">
        <LandingHeroVisual />
      </div>

      {/* Right – login */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-[350px]"
        >
          <div className="border border-[var(--border)] rounded-xl p-10 mb-3 flex flex-col items-center bg-[var(--bg-card)]">
            <AppLogo size={68} />
            <h1 className="mt-5 text-[32px] font-semibold tracking-tight">
              <span className="logo-gradient">ALB</span>
              <span className="text-[var(--text)]">NET</span>
            </h1>
            <p className="mt-4 text-[15px] text-[var(--text-muted)] text-center leading-snug">
              Kyçu për të parë fotot, story-t dhe reels nga komuniteti shqiptar.
            </p>
            <span className="albanian-badge mt-4">🇦🇱 Platforma #1 Shqiptare</span>
          </div>

          <div className="border border-[var(--border)] rounded-xl p-6 mb-3 space-y-2 bg-[var(--bg-card)]">
            <Link href="/kycu" className="block w-full py-2.5 rounded-lg text-[14px] font-semibold text-white text-center transition-colors" style={{ background: 'var(--ig-blue)' }}>
              Kyçu
            </Link>
            <Link href="/regjistrohu" className="block w-full py-2.5 rounded-lg text-[14px] font-semibold text-[var(--ig-blue)] text-center hover:bg-[var(--primary-soft)] transition-colors">
              Regjistrohu
            </Link>
          </div>

          <Link href="/chat-global" className="albanian-card block p-4 mb-3 hover:opacity-90 transition-opacity">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌍</span>
              <div>
                <p className="text-[14px] font-semibold text-[var(--text)]">Chat Global Shqiptar</p>
                <p className="text-[12px] text-[var(--text-muted)]">Bisedo live me shqiptarë kudo në botë</p>
              </div>
            </div>
          </Link>

          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-4">
            {FEATURES.map((f) => (
              <span key={f.label} className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                <span>{f.icon}</span>{f.label}
              </span>
            ))}
          </div>

          <Link href="/shkarko" className="mt-6 block text-center text-[12px] font-semibold text-[var(--ig-blue)] hover:underline">
            📲 Shkarko për iOS, Android, Mac & Windows
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
