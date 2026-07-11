'use client';

import { motion } from 'framer-motion';
import { AppLogo } from '@/components/AppLogo';

const STORIES = [
  { name: 'Ti', isYours: true },
  { name: 'Arben', color: '#e41e26' },
  { name: 'Drita', color: '#1a1a1a' },
  { name: 'Luan', color: '#c9a227' },
  { name: 'Elira', color: '#ed4956' },
];

const POSTS = [
  {
    user: 'drita_shqip',
    place: 'Tiranë, Shqipëri',
    caption: 'Perëndimi mbi Tiranë 🇦🇱',
    likes: '1.2K',
    gradient: 'linear-gradient(160deg, #e41e26 0%, #ff6b6b 40%, #1a1a1a 100%)',
  },
  {
    user: 'diaspora_ch',
    place: 'Zürich, Diaspora',
    caption: 'Mall për atdheun çdo ditë 🦅',
    likes: '856',
    gradient: 'linear-gradient(160deg, #1a1a1a 0%, #4a4a4a 50%, #e41e26 100%)',
  },
];

const FLOATS = [
  { icon: '🌍', label: 'Chat Global', sub: 'Live tani', top: '8%', right: '-8%', delay: 0.2 },
  { icon: '🔥', label: '#Shqipëri', sub: 'Trending', top: '42%', left: '-12%', delay: 0.4 },
  { icon: '🎬', label: 'Reels', sub: 'Shiko', bottom: '18%', right: '-10%', delay: 0.6 },
];

export function LandingHeroVisual() {
  return (
    <div className="landing-hero-wrap">
      {/* Floating badges */}
      {FLOATS.map((f) => (
        <motion.div
          key={f.label}
          className="landing-float-card hidden md:flex"
          style={{ top: f.top, bottom: f.bottom, left: f.left, right: f.right }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: f.delay, duration: 0.5 }}
        >
          <span className="text-lg">{f.icon}</span>
          <div>
            <p className="text-[11px] font-bold text-[var(--text)]">{f.label}</p>
            <p className="text-[9px] text-[var(--text-muted)]">{f.sub}</p>
          </div>
        </motion.div>
      ))}

      {/* Phone mockup */}
      <motion.div
        className="landing-phone"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="landing-phone-notch" />
        <div className="landing-phone-header">
          <span className="font-bold text-[13px] tracking-tight">ALBNET</span>
          <div className="flex gap-3 text-[var(--text-muted)]">
            <span>♡</span>
            <span>✈</span>
          </div>
        </div>

        {/* Stories */}
        <div className="landing-stories-row">
          {STORIES.map((s) => (
            <div key={s.name} className="landing-story-item">
              <div className={`landing-story-ring ${s.isYours ? 'yours' : ''}`}>
                <div className="landing-story-avatar" style={!s.isYours ? { background: s.color } : undefined}>
                  {s.isYours ? <AppLogo size={28} /> : s.name[0]}
                </div>
              </div>
              <span className="text-[8px] text-[var(--text-muted)] truncate w-10 text-center">
                {s.name}
              </span>
            </div>
          ))}
        </div>

        {/* Posts */}
        <div className="landing-feed">
          {POSTS.map((post) => (
            <div key={post.user} className="landing-post">
              <div className="landing-post-head">
                <div className="landing-post-avatar">{post.user[0].toUpperCase()}</div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-[var(--text)] truncate">{post.user}</p>
                  <p className="text-[8px] text-[var(--text-muted)] truncate">{post.place}</p>
                </div>
              </div>
              <div className="landing-post-media" style={{ background: post.gradient }} />
              <div className="landing-post-actions">
                <span>♡</span><span>💬</span><span>↗</span>
                <span className="ml-auto text-[8px] text-[var(--text-muted)]">{post.likes}</span>
              </div>
              <p className="text-[9px] text-[var(--text)] px-2 pb-2 leading-snug">
                <span className="font-semibold">{post.user}</span> {post.caption}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="landing-stats"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {[
          { n: '50K+', l: 'Shqiptarë' },
          { n: 'Live', l: 'Chat Global' },
          { n: '50+', l: 'Vende' },
        ].map((s) => (
          <div key={s.l} className="landing-stat">
            <span className="text-[15px] font-bold text-[var(--albanian-red)]">{s.n}</span>
            <span className="text-[10px] text-[var(--text-muted)]">{s.l}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
