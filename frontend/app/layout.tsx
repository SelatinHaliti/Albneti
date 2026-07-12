import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { PWARegister } from '@/components/PWARegister';
import { CookieConsent } from '@/components/CookieConsent';

export const metadata: Metadata = {
  title: 'AlbNet',
  description: 'Rrjeti social shqiptar – postime, story, reels dhe chat global.',
  applicationName: 'AlbNet',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AlbNet',
  },
  formatDetection: { telephone: false },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e41e26' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sq" suppressHydrationWarning>
      <body className="antialiased bg-[var(--bg)] text-[var(--text)]">
        <PWARegister />
        <ThemeProvider>{children}</ThemeProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
