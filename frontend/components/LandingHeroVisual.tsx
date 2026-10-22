'use client';

import { motion } from 'framer-motion';
import { EagleMark } from '@/components/EagleMark';

/**
 * Full-bleed atmospheric plane for the landing hero.
 * Visual anchor: heraldic eagle + mountain light — no floating badges/cards.
 */
export function LandingHeroVisual() {
  return (
    <div className="landing-atmosphere" aria-hidden>
      <div className="landing-atmosphere__mesh" />
      <div className="landing-atmosphere__grain" />

      <motion.div
        className="landing-atmosphere__eagle"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
      >
        <EagleMark fluid shield="rgba(14,17,22,0.55)" className="block h-auto w-full" />
      </motion.div>

      <motion.div
        className="landing-atmosphere__orb landing-atmosphere__orb--a"
        animate={{ y: [0, -18, 0], x: [0, 10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="landing-atmosphere__orb landing-atmosphere__orb--b"
        animate={{ y: [0, 22, 0], x: [0, -14, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
