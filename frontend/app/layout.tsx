import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'AlbNet – Instagram Shqiptar',
  description: 'Kyçu për të parë fotot, story-t dhe reels nga komuniteti shqiptar.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sq" suppressHydrationWarning>
      <body className="antialiased bg-[var(--bg)] text-[var(--text)]">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
