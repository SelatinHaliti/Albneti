'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AppLogo } from '@/components/AppLogo';
import { LandingHeroVisual } from '@/components/LandingHeroVisual';

const FEATURES = [
  {
    title: 'Momentet tuaja',
    body: 'Postime, story dhe reels në një hapësirë të ndërtuar për shqiptarët.',
  },
  {
    title: 'Lidhje pa kufi',
    body: 'Mesazhe, live dhe chat global që mbajnë diasporën dhe atdheun afër.',
  },
  {
    title: 'Komuniteti ynë',
    body: 'Ngjarje, krijues dhe zbulime që nisin nga Tiranë, Prishtinë e deri në botë.',
  },
];

export default function HomePage() {
  return (
    <div className="landing-root">
      {/* ── Hero: one composition ── */}
      <section className="landing-hero">
        <LandingHeroVisual />

        <div className="landing-hero__veil" />

        <motion.header
          className="landing-hero__brand"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <AppLogo size={56} variant="plain" />
          <h1 className="landing-wordmark">
            ALB<span>NET</span>
          </h1>
          <p className="landing-headline">
            Rrjeti ku shqiptarët ndajnë jetën.
          </p>
          <p className="landing-sub">
            Lidhu me miqtë, diasporën dhe krijuesit në një platformë të ndërtuar në shqip.
          </p>
          <div className="landing-cta">
            <Link href="/kycu" className="landing-cta__primary">
              Kyçu
            </Link>
            <Link href="/regjistrohu" className="landing-cta__secondary">
              Regjistrohu
            </Link>
          </div>
        </motion.header>
      </section>

      {/* ── One job: what AlbNet is for ── */}
      <section className="landing-section">
        <motion.div
          className="landing-section__inner"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55 }}
        >
          <p className="landing-kicker">Pse AlbNet</p>
          <h2 className="landing-section__title">Një hapësirë. Një komb. Kudo.</h2>
          <p className="landing-section__lead">
            Nga atdheu te diaspora — e njëjta gjuhë, e njëjta energji, e njëjta rrjetë.
          </p>
          <ul className="landing-feature-list">
            {FEATURES.map((f) => (
              <li key={f.title} className="landing-feature">
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </li>
            ))}
          </ul>
        </motion.div>
      </section>

      {/* ── Download ── */}
      <section className="landing-section landing-section--muted">
        <motion.div
          className="landing-section__inner landing-download"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="landing-section__title">Merr AlbNet me vete</h2>
          <p className="landing-section__lead">
            Web, iOS, Android, Mac dhe Windows — i njëjti profil kudo.
          </p>
          <Link href="/shkarko" className="landing-cta__primary landing-cta__inline">
            Shkarko aplikacionin
          </Link>
        </motion.div>
      </section>

      <footer className="landing-footer">
        <span className="landing-footer__mark">ALBNET</span>
        <nav className="landing-footer__links">
          <Link href="/privatesi">Privatësia</Link>
          <Link href="/kushtet">Kushtet</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/chat-global">Chat Global</Link>
        </nav>
      </footer>
    </div>
  );
}
