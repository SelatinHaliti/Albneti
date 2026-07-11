'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AppLogo } from '@/components/AppLogo';

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
    <div className="min-h-screen flex bg-[var(--bg)]">
      {/* Left hero – desktop */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(228,30,38,0.06) 0%, rgba(26,26,26,0.04) 50%, rgba(237,73,86,0.05) 100%)' }} />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-20 blur-3xl" style={{ background: 'var(--ig-gradient)' }} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative flex flex-col items-center gap-8 p-12 max-w-[420px]"
        >
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl opacity-30 blur-2xl" style={{ background: 'var(--albanian-gradient)' }} />
            <div className="relative grid grid-cols-2 gap-3 rotate-[-4deg]">
              {[
                'linear-gradient(135deg,#e41e26 0%,#ff6b6b 100%)',
                'linear-gradient(135deg,#1a1a1a 0%,#444 100%)',
                'linear-gradient(135deg,#f09433 0%,#dc2743 100%)',
                'linear-gradient(135deg,#962fbf 0%,#4f5bd5 100%)',
              ].map((bg, i) => (
                <div key={i} className="w-36 h-44 rounded-2xl liquid-glass shadow-xl" style={{ background: bg, opacity: 0.85 }} />
              ))}
            </div>
          </div>
          <div className="text-center">
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

          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-6">
            {FEATURES.map((f) => (
              <span key={f.label} className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1">
                <span>{f.icon}</span>{f.label}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
