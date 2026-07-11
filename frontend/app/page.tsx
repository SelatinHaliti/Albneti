'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AppLogo } from '@/components/AppLogo';

export default function HomePage() {
  return (
    <div className="min-h-screen flex bg-[var(--bg)]">
      {/* Left - hero image area (desktop) */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: 'var(--ig-gradient)' }} />
        <div className="relative flex flex-col items-center gap-6 p-12">
          <div className="grid grid-cols-2 gap-3 rotate-[-6deg]">
            {[1,2,3,4].map((i) => (
              <div key={i} className="w-32 h-40 rounded-2xl liquid-glass shadow-lg" style={{ background: `linear-gradient(135deg, rgba(254,44,85,0.${i+2}) 0%, rgba(188,24,136,0.${i+1}) 100%)` }} />
            ))}
          </div>
          <p className="text-[18px] font-medium text-[var(--text)] text-center max-w-[300px]">
            Ndani momentet, lidhuni me miq dhe eksploroni përmbajtje shqiptare.
          </p>
        </div>
      </div>

      {/* Right - login card */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none lg:hidden">
          <div className="absolute -top-[20%] left-[20%] w-[60%] h-[40%] rounded-full opacity-[0.06] blur-[100px]" style={{ background: 'var(--ig-gradient)' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-[350px]"
        >
          <div className="liquid-glass-strong rounded-xl p-10 mb-3 flex flex-col items-center">
            <AppLogo size={72} />
            <h1 className="mt-4 text-[28px] font-semibold tracking-tight text-[var(--text)]">ALBNET</h1>
            <p className="mt-3 text-[16px] text-[var(--text-muted)] text-center leading-snug">
              Kyçu për të parë fotot dhe videot nga miqtë e tu.
            </p>
          </div>

          <div className="liquid-glass-strong rounded-xl p-6 mb-3 space-y-2">
            <Link href="/kycu" className="block w-full py-2.5 rounded-lg text-[14px] font-semibold text-white bg-[var(--primary)] text-center hover:opacity-90 transition-opacity">
              Kyçu
            </Link>
            <Link href="/regjistrohu" className="block w-full py-2.5 rounded-lg text-[14px] font-semibold text-[var(--primary)] text-center hover:bg-[var(--primary-soft)] transition-colors">
              Regjistrohu
            </Link>
          </div>

          <div className="liquid-glass rounded-xl p-5 flex items-center gap-4">
            <p className="text-[14px] text-[var(--text)] flex-1 text-center">
              Shkarko aplikacionin.
            </p>
            <span className="text-[14px] font-semibold text-[var(--primary)]">Së shpejti</span>
          </div>

          <p className="mt-8 text-center text-[12px] text-[var(--text-secondary)]">
            Postime · Story · Reels · Mesazhe
          </p>
        </motion.div>
      </div>
    </div>
  );
}
