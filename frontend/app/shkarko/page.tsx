'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AppLogo } from '@/components/AppLogo';

type Platform = 'ios' | 'android' | 'mac' | 'windows' | 'other';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const PLATFORMS: Record<Platform, {
  name: string;
  icon: string;
  browser: string;
  steps: { n: number; text: string }[];
  color: string;
}> = {
  ios: {
    name: 'iPhone & iPad',
    icon: '🍎',
    browser: 'Safari',
    color: '#007AFF',
    steps: [
      { n: 1, text: 'Hap albneti.vercel.app në Safari (jo Chrome)' },
      { n: 2, text: 'Prek butonin Share poshtë (katrori me shigjetë lart)' },
      { n: 3, text: 'Zgjidh "Shto në Ekranin Kryesor"' },
      { n: 4, text: 'Prek "Shto" – AlbNet shfaqet si app në telefon' },
    ],
  },
  android: {
    name: 'Android',
    icon: '🤖',
    browser: 'Chrome',
    color: '#3DDC84',
    steps: [
      { n: 1, text: 'Hap albneti.vercel.app në Google Chrome' },
      { n: 2, text: 'Prek butonin "Instalo" më sipër (nëse shfaqet)' },
      { n: 3, text: 'Ose: menu ⋮ → "Instalo aplikacionin" / "Add to Home screen"' },
      { n: 4, text: 'Konfirmo – AlbNet shfaqet në ekranin kryesor' },
    ],
  },
  mac: {
    name: 'Mac',
    icon: '💻',
    browser: 'Safari ose Edge',
    color: '#555555',
    steps: [
      { n: 1, text: 'Hap albneti.vercel.app në Safari ose Edge' },
      { n: 2, text: 'Në Safari: File → Add to Dock' },
      { n: 3, text: 'Në Edge: menu ⋯ → Apps → Install this site as an app' },
      { n: 4, text: 'AlbNet hapet si aplikacion në Mac' },
    ],
  },
  windows: {
    name: 'Windows',
    icon: '🪟',
    browser: 'Microsoft Edge',
    color: '#0078D4',
    steps: [
      { n: 1, text: 'Hap albneti.vercel.app në Microsoft Edge' },
      { n: 2, text: 'Prek menu ⋯ lart djathtas' },
      { n: 3, text: 'Zgjidh Apps → Install this site as an app' },
      { n: 4, text: 'Kliko Install – AlbNet shfaqet si app në Windows' },
    ],
  },
  other: {
    name: 'Çdo pajisje',
    icon: '🌐',
    browser: 'Chrome, Edge ose Safari',
    color: '#e41e26',
    steps: [
      { n: 1, text: 'Hap albneti.vercel.app në shfletuesin tënd' },
      { n: 2, text: 'Kërko opsionin "Instalo aplikacionin" në menu' },
      { n: 3, text: 'Shto në ekranin kryesor ose dock' },
      { n: 4, text: 'Kyçu dhe përdor AlbNet si app' },
    ],
  },
};

const FEATURES = [
  { icon: '📸', label: 'Postime' },
  { icon: '⭕', label: 'Story' },
  { icon: '🎬', label: 'Reels' },
  { icon: '💬', label: 'Mesazhe' },
  { icon: '🌍', label: 'Chat Global' },
  { icon: '🦅', label: 'Diaspora' },
];

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Macintosh|Mac OS/.test(ua)) return 'mac';
  if (/Windows/.test(ua)) return 'windows';
  return 'other';
}

export default function ShkarkoPage() {
  const [platform, setPlatform] = useState<Platform>('other');
  const [selected, setSelected] = useState<Platform>('other');
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);
    setSelected(p);

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferred) {
      setInstalling(true);
      try {
        await deferred.prompt();
        const { outcome } = await deferred.userChoice;
        if (outcome === 'accepted') {
          setInstalled(true);
          setDeferred(null);
        }
      } finally {
        setInstalling(false);
      }
      return;
    }
    const el = document.getElementById('udhezime');
    el?.scrollIntoView({ behavior: 'smooth' });
  }, [deferred]);

  const current = PLATFORMS[selected];
  const canOneClick = Boolean(deferred) && (platform === 'android' || platform === 'windows' || platform === 'mac');

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] ig-nav-bar sticky top-0 z-50 safe-area-pt">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <AppLogo size={32} />
            <span className="font-bold text-[16px]">ALBNET</span>
          </Link>
          <Link href="/kycu" className="text-[13px] font-semibold text-[var(--ig-blue)]">
            Kyçu
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 pb-16">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-5">
            <div className="download-app-icon">
              <AppLogo size={80} />
            </div>
          </div>
          <span className="albanian-badge mb-3 inline-flex">🇦🇱 Falas · Pa App Store</span>
          <h1 className="text-[28px] font-bold text-[var(--text)] leading-tight">
            Instalo AlbNet
          </h1>
          <p className="text-[14px] text-[var(--text-muted)] mt-2 leading-relaxed">
            Rrjeti social shqiptar në telefon, tablet dhe kompjuter – si një app i vërtetë.
          </p>

          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {FEATURES.map((f) => (
              <span key={f.label} className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-elevated)] border border-[var(--border)] px-2.5 py-1 rounded-full">
                {f.icon} {f.label}
              </span>
            ))}
          </div>
        </div>

        {/* Main install CTA */}
        {installed ? (
          <div className="download-success-card mb-8">
            <span className="text-3xl mb-2">✅</span>
            <p className="text-[15px] font-semibold text-[var(--text)]">AlbNet është instaluar!</p>
            <p className="text-[13px] text-[var(--text-muted)] mt-1">Hap aplikacionin nga ekrani kryesor.</p>
            <Link href="/feed" className="download-primary-btn mt-4 inline-block">
              Hap AlbNet
            </Link>
          </div>
        ) : (
          <div className="mb-8 space-y-3">
            <button
              type="button"
              onClick={handleInstall}
              disabled={installing}
              className="download-primary-btn w-full"
            >
              {installing
                ? 'Duke instaluar...'
                : canOneClick
                  ? '📲 Instalo AlbNet tani'
                  : platform === 'ios'
                    ? '📲 Shiko si ta instalosh'
                    : '📲 Instalo AlbNet'}
            </button>
            {canOneClick && (
              <p className="text-[11px] text-center text-[var(--text-muted)]">
                Një klik – pa shkarkim nga dyqani
              </p>
            )}
            {platform === 'ios' && !deferred && (
              <p className="text-[11px] text-center text-[var(--text-muted)]">
                Në iPhone duhet Safari → Shto në Ekranin Kryesor
              </p>
            )}
          </div>
        )}

        {/* Platform picker */}
        <div id="udhezime" className="mb-6">
          <p className="text-[13px] font-semibold text-[var(--text-muted)] mb-3 text-center uppercase tracking-wide">
            Zgjidh pajisjen tënde
          </p>
          <div className="grid grid-cols-4 gap-2">
            {(['ios', 'android', 'mac', 'windows'] as Platform[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setSelected(id)}
                className={`download-platform-tab ${selected === id ? 'active' : ''}`}
              >
                <span className="text-xl">{PLATFORMS[id].icon}</span>
                <span className="text-[10px] font-semibold mt-1 leading-tight">
                  {id === 'ios' ? 'iOS' : id === 'mac' ? 'Mac' : id === 'windows' ? 'Win' : 'Android'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Steps for selected platform */}
        <div className="platform-card mb-8">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[var(--border)]">
            <span className="text-3xl">{current.icon}</span>
            <div>
              <h2 className="text-[17px] font-bold text-[var(--text)]">{current.name}</h2>
              <p className="text-[12px] text-[var(--text-muted)]">Shfletuesi: {current.browser}</p>
            </div>
            {selected === platform && (
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-[var(--albanian-soft)] text-[var(--albanian-red)]">
                Pajisja jote
              </span>
            )}
          </div>

          <ol className="space-y-4">
            {current.steps.map((step) => (
              <li key={step.n} className="download-step">
                <span className="download-step-num" style={{ background: current.color }}>
                  {step.n}
                </span>
                <p className="text-[13px] text-[var(--text)] leading-snug">{step.text}</p>
              </li>
            ))}
          </ol>

          <a
            href="https://albneti.vercel.app"
            className="mt-5 block text-center py-2.5 rounded-lg text-[13px] font-semibold text-white"
            style={{ background: current.color }}
          >
            Hap albneti.vercel.app
          </a>
        </div>

        {/* QR hint for desktop users */}
        {platform === 'mac' || platform === 'windows' || platform === 'other' ? (
          <div className="liquid-glass rounded-2xl p-5 text-center mb-8">
            <p className="text-[14px] font-semibold text-[var(--text)]">📱 Ke telefon?</p>
            <p className="text-[12px] text-[var(--text-muted)] mt-1 leading-relaxed">
              Skano ose shkruaj <strong className="text-[var(--text)]">albneti.vercel.app</strong> në telefonin tënd dhe ndiq hapat për iOS ose Android.
            </p>
          </div>
        ) : null}

        {/* Final CTA */}
        <div className="text-center space-y-3">
          <p className="text-[13px] text-[var(--text-muted)]">Ke llogari tashmë?</p>
          <Link href="/kycu" className="download-secondary-btn inline-block">
            Kyçu në AlbNet
          </Link>
          <p className="text-[11px] text-[var(--text-secondary)] pt-2">
            Nuk kërkon hapësirë të madhe · Përditësime automatike · 100% falas
          </p>
        </div>
      </main>
    </div>
  );
}
