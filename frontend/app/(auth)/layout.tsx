import Link from 'next/link';
import { OAuthProvider } from '@/components/OAuthProvider';
import { AppLogo } from '@/components/AppLogo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OAuthProvider>
      <div className="auth-page-bg min-h-screen flex flex-col items-center justify-center px-4 py-10 sm:py-12">
        <Link
          href="/"
          className="relative z-[1] mb-6 flex items-center gap-2.5 group"
          aria-label="AlbNet – faqja kryesore"
        >
          <AppLogo size={36} variant="plain" />
          <span className="albnet-wordmark text-[22px] group-hover:opacity-80 transition-opacity">
            ALB<span className="text-[var(--albanian-red)]">NET</span>
          </span>
        </Link>
        <div className="w-full max-w-[400px] flex flex-col items-center relative z-[1]">
          {children}
        </div>
        <footer className="relative z-[1] mt-8 text-center text-[11px] text-[var(--text-muted)]">
          <Link href="/privatesi" className="hover:underline mx-2">Privatësia</Link>
          <Link href="/kushtet" className="hover:underline mx-2">Kushtet</Link>
          <Link href="/cookies" className="hover:underline mx-2">Cookies</Link>
        </footer>
      </div>
    </OAuthProvider>
  );
}
