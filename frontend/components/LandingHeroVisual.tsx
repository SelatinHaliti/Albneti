'use client';

import { motion } from 'framer-motion';

/**
 * Full-bleed atmospheric plane for the landing hero.
 * Visual anchor: heraldic eagle + mountain light — no floating badges/cards.
 */
export function LandingHeroVisual() {
  return (
    <div className="landing-atmosphere" aria-hidden>
      <div className="landing-atmosphere__mesh" />
      <div className="landing-atmosphere__grain" />

      <motion.svg
        className="landing-atmosphere__eagle"
        viewBox="0 0 480 480"
        fill="none"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Shield outline */}
        <motion.path
          d="M240 36L78 152v108c0 108 74 168 162 188 88-20 162-80 162-188V152L240 36z"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />
        {/* Shield fill */}
        <motion.path
          d="M240 52L96 158v96c0 92 64 144 144 162 80-18 144-70 144-162v-96L240 52z"
          fill="rgba(14,17,22,0.55)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.6 }}
        />
        {/* Double-headed eagle – matches AppLogo proportions */}
        <motion.g
          fill="#c8102e"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.7 }}
        >
          <ellipse cx="148" cy="168" rx="28" ry="30" />
          <ellipse cx="332" cy="168" rx="28" ry="30" />
          <path d="M124 160L98 138" stroke="#c8102e" strokeWidth="5" strokeLinecap="round" />
          <path d="M356 160L382 138" stroke="#c8102e" strokeWidth="5" strokeLinecap="round" />
          <path d="M210 196v118h60V196h-60z" />
          <path d="M240 196l-44 54h18l26-28 26 28h18l-44-54z" />
          <path d="M178 210L98 226l52 38 22-24V210z" />
          <path d="M302 210l80 16-52 38-22-24V210z" />
          <path d="M164 228l-36 10 22 18 14-14v-14z" />
          <path d="M316 228l36 10-22 18-14-14v-14z" />
          <path d="M230 310l10 36 10-36h-20z" />
        </motion.g>
      </motion.svg>

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
