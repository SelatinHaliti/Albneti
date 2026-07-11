'use client';

import Link from 'next/link';
import { AppLogo } from '@/components/AppLogo';

const PLATFORMS = [
  {
    id: 'ios',
    name: 'iPhone & iPad',
    icon: '🍎',
    desc: 'Shkarko nga App Store ose instalo me Expo',
    steps: ['Hap Safari → albneti.vercel.app', 'Prek Share → "Add to Home Screen"', 'Ose shkarko APK/IPA nga EAS Build'],
    action: { label: 'Instalo PWA', href: '/feed' },
    color: '#007AFF',
  },
  {
    id: 'android',
    name: 'Android',
    icon: '🤖',
    desc: 'APK native ose PWA në Chrome',
    steps: ['Hap Chrome → albneti.vercel.app', 'Prek menu → "Install app"', 'Ose shkarko APK nga EAS Build'],
    action: { label: 'Instalo PWA', href: '/feed' },
    color: '#3DDC84',
  },
  {
    id: 'mac',
    name: 'macOS',
    icon: '💻',
    desc: 'Aplikacion desktop për Mac',
    steps: ['Shkarko AlbNet.dmg nga desktop/', 'Ose Safari → Add to Dock (PWA)', 'Ose përdor Electron build'],
    action: { label: 'Shkarko për Mac', href: '#mac' },
    color: '#A2AAAD',
  },
  {
    id: 'windows',
    name: 'Windows',
    icon: '🪟',
    desc: 'Aplikacion .exe për PC',
    steps: ['Shkarko AlbNet Setup.exe', 'Ose Edge → Install this site as an app', 'Login dhe përdor si desktop app'],
    action: { label: 'Shkarko për Windows', href: '#windows' },
    color: '#0078D4',
  },
  {
    id: 'pwa',
    name: 'Web App (PWA)',
    icon: '🌐',
    desc: 'Funksionon kudo – telefon, tablet, desktop',
    steps: ['Hap albneti.vercel.app', 'Instalo si aplikacion', 'Përdor offline me cache bazik'],
    action: { label: 'Hap AlbNet', href: '/feed' },
    color: '#e41e26',
  },
];

const FEATURES = [
  { icon: '📸', title: 'Postime & Story', desc: 'Ndaj momentet me komunitetin shqiptar' },
  { icon: '🎬', title: 'Reels', desc: 'Video vertikale si Instagram' },
  { icon: '🌍', title: 'Chat Global', desc: 'Bisedo live me shqiptarë kudo' },
  { icon: '🦅', title: 'Diaspora', desc: 'Lidhu me atdheun dhe komunitetin' },
  { icon: '💬', title: 'Mesazhe & Thirrje', desc: 'DM, audio dhe video call' },
  { icon: '🔥', title: 'Trending Shqip', desc: 'Hashtag-et më të nxehta në shqip' },
  { icon: '🎵', title: 'Muzikë Shqiptare', desc: 'Muzikë për reels dhe postime' },
  { icon: '🛡️', title: 'Verifikim Kreatorësh', desc: 'Badge për krijues shqiptarë' },
];

export default function ShkarkoPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] ig-nav-bar sticky top-0 z-50 safe-area-pt">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <AppLogo size={32} />
            <span className="font-bold text-[16px]">ALBNET</span>
          </Link>
          <Link href="/kycu" className="text-[13px] font-semibold text-[var(--ig-blue)]">
            Kyçu
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="text-center mb-12">
          <span className="albanian-badge mb-4 inline-flex">🇦🇱 Rrjeti Social #1 Shqiptar</span>
          <h1 className="text-[32px] md:text-[40px] font-bold text-[var(--text)] leading-tight">
            Shkarko AlbNet
          </h1>
          <p className="text-[15px] text-[var(--text-muted)] mt-3 max-w-md mx-auto">
            iOS, Android, Mac, Windows – një platformë, gjithë komuniteti shqiptar.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-14">
          {PLATFORMS.map((p) => (
            <div key={p.id} id={p.id === 'mac' ? 'mac' : p.id === 'windows' ? 'windows' : undefined} className="platform-card">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{p.icon}</span>
                <div>
                  <h2 className="text-[16px] font-bold text-[var(--text)]">{p.name}</h2>
                  <p className="text-[12px] text-[var(--text-muted)]">{p.desc}</p>
                </div>
              </div>
              <ol className="text-[12px] text-[var(--text-muted)] space-y-1.5 mb-4 list-decimal list-inside">
                {p.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              <Link
                href={p.action.href}
                className="block text-center py-2.5 rounded-lg text-[13px] font-semibold text-white"
                style={{ background: p.color }}
              >
                {p.action.label}
              </Link>
            </div>
          ))}
        </div>

        <section className="mb-14">
          <h2 className="text-[20px] font-bold text-[var(--text)] mb-6 text-center">
            Pse AlbNet?
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="feature-tile">
                <span className="text-2xl mb-2">{f.icon}</span>
                <p className="text-[13px] font-semibold text-[var(--text)]">{f.title}</p>
                <p className="text-[11px] text-[var(--text-muted)] mt-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="albanian-card p-6 text-center">
          <p className="text-[14px] font-semibold text-[var(--text)]">
            Ndërto aplikacionin native
          </p>
          <p className="text-[12px] text-[var(--text-muted)] mt-2 mb-4">
            Për zhvillues: <code className="text-[var(--albanian-red)]">cd mobile && npx eas build</code> për iOS/Android.
            <br />
            <code className="text-[var(--albanian-red)]">cd desktop && npm run build</code> për Mac/Windows.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/feed" className="px-5 py-2 rounded-lg text-[13px] font-semibold text-white" style={{ background: 'var(--ig-blue)' }}>
              Fillo tani
            </Link>
            <Link href="/komuniteti" className="px-5 py-2 rounded-lg text-[13px] font-semibold border border-[var(--border)] text-[var(--text)]">
              Eksploro komunitetin
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
