import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

const outfit = Outfit({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AlbNet - Platforma Sociale Shqiptare',
  description: 'Ndani momentet, lidhuni me miq dhe eksploroni përmbajtje në gjuhën shqipe.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sq" suppressHydrationWarning className={outfit.variable}>
      <body className="antialiased font-sans text-[#1a1a2e] dark:text-[#f4f4f5]">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
