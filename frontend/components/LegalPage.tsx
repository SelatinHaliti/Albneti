import Link from 'next/link';
import { AppLogo } from '@/components/AppLogo';

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="border-b border-[var(--border)] bg-[var(--bg-card)] safe-area-pt">
        <div className="max-w-[720px] mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <AppLogo size={28} />
            <span className="albnet-wordmark text-[18px]">ALBNET</span>
          </Link>
          <Link href="/kycu" className="text-[14px] font-semibold text-[var(--ig-blue)]">
            Kyçu
          </Link>
        </div>
      </header>
      <main className="max-w-[720px] mx-auto px-4 py-8 pb-16">
        <h1 className="text-[26px] font-bold mb-2">{title}</h1>
        <p className="text-[13px] text-[var(--text-muted)] mb-8">Përditësuar: {updated}</p>
        <div className="prose-legal space-y-5 text-[15px] leading-relaxed text-[var(--text)]">
          {children}
        </div>
        <footer className="mt-12 pt-6 border-t border-[var(--border)] text-[13px] text-[var(--text-muted)] flex flex-wrap gap-4">
          <Link href="/privatesi" className="hover:underline">Privatësia</Link>
          <Link href="/kushtet" className="hover:underline">Kushtet</Link>
          <Link href="/cookies" className="hover:underline">Cookies</Link>
          <Link href="/" className="hover:underline">Kryefaqja</Link>
        </footer>
      </main>
    </div>
  );
}
