import { OAuthProvider } from '@/components/OAuthProvider';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OAuthProvider>
      <div className="auth-page-bg min-h-screen flex flex-col items-center justify-center px-4 py-10 sm:py-12">
        <div className="w-full max-w-[400px] flex flex-col items-center">
          {children}
        </div>
        <footer className="mt-8 text-center text-[11px] text-[var(--text-muted)]">
          <a href="/privatesi" className="hover:underline mx-2">Privatësia</a>
          <a href="/kushtet" className="hover:underline mx-2">Kushtet</a>
          <a href="/cookies" className="hover:underline mx-2">Cookies</a>
        </footer>
      </div>
    </OAuthProvider>
  );
}
