'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { SocketProvider } from '@/components/SocketProvider';
import { api } from '@/utils/api';
import {
  IconHome,
  IconSearch,
  IconAdd,
  IconMessage,
  IconHeart,
  IconSettings,
  IconLogout,
  IconSun,
  IconMoon,
  IconGlobe,
} from '@/components/Icons';
import { AppLogo } from '@/components/AppLogo';
import { Toaster } from '@/components/Toaster';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const navItems = [
  { href: '/feed', label: 'Kryefaja', Icon: IconHome },
  { href: '/explore', label: 'Eksploro', Icon: IconSearch },
  { href: '/krijo/post', label: 'Shto', Icon: IconAdd },
  { href: '/chat-global', label: 'Chat Global', Icon: IconGlobe },
  { href: '/mesazhe', label: 'Mesazhe', Icon: IconMessage },
  { href: '/njoftime', label: 'Njoftime', Icon: IconHeart },
  { href: '/krijo/story', label: 'Story', Icon: IconAdd },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [feedDropdownOpen, setFeedDropdownOpen] = useState(false);
  const feedDropdownRefMobile = useRef<HTMLDivElement>(null);
  const feedDropdownRefDesktop = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const feedMode = pathname === '/feed' ? (searchParams.get('feed') === 'following' ? 'following' : 'for_you') : null;

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      const inMobile = feedDropdownRefMobile.current?.contains(target);
      const inDesktop = feedDropdownRefDesktop.current?.contains(target);
      if (!inMobile && !inDesktop) setFeedDropdownOpen(false);
    };
    if (feedDropdownOpen) {
      document.addEventListener('click', close);
      return () => document.removeEventListener('click', close);
    }
  }, [feedDropdownOpen]);

  useEffect(() => {
    if (!user) router.replace('/kycu');
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    api<{ unreadCount: number }>('/api/notifications?limit=1')
      .then((r) => setUnreadNotifications(r.unreadCount ?? 0))
      .catch(() => {});
  }, [user, pathname]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--border)]" />
          <p className="text-sm text-[var(--text-muted)]">Duke u ngarkuar...</p>
        </div>
      </div>
    );
  }

  const bottomNavItems = [
    { href: '/feed', Icon: IconHome },
    { href: '/explore', Icon: IconSearch },
    { href: '/krijo/post', Icon: IconAdd },
    { href: '/profili/' + user.username, icon: 'avatar' as const },
  ];

  return (
    <SocketProvider>
      <div className="min-h-screen flex flex-col md:flex-row bg-[var(--bg)]">
        {/* Mobile: top bar – si Instagram: logo majtas me dropdown Për ty / Ndiqet */}
        <header className="md:hidden fixed top-0 left-0 right-0 h-[44px] px-4 grid grid-cols-3 items-center border-b border-[var(--border)] bg-[var(--bg-card)] z-50 safe-area-pt shadow-[0_1px_0_0_var(--border)]">
          <div className="flex items-center justify-start min-h-[44px] relative" ref={feedDropdownRefMobile}>
            {pathname === '/feed' ? (
              <>
                <button
                  type="button"
                  onClick={() => setFeedDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 ig-touch text-[var(--text)] rounded p-1 -m-1"
                  aria-expanded={feedDropdownOpen}
                  aria-haspopup="true"
                  aria-label="Zgjidh feed"
                >
                  <AppLogo size={28} />
                  <span className="font-bold text-[17px] tracking-tight text-[var(--text)]">ALBNET</span>
                  <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${feedDropdownOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
                {feedDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1 w-[200px] py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-lg z-[60]">
                    <Link
                      href="/feed"
                      onClick={() => setFeedDropdownOpen(false)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-[14px] ${feedMode === 'for_you' ? 'font-semibold text-[var(--text)]' : 'text-[var(--text-muted)]'}`}
                    >
                      <span className="w-5 h-5 rounded-full bg-[var(--ig-gradient)] flex items-center justify-center text-white text-[10px] font-bold">P</span>
                      Për ty
                    </Link>
                    <Link
                      href="/feed?feed=following"
                      onClick={() => setFeedDropdownOpen(false)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-[14px] ${feedMode === 'following' ? 'font-semibold text-[var(--text)]' : 'text-[var(--text-muted)]'}`}
                    >
                      <span className="w-5 h-5 rounded-full border-2 border-[var(--text)] flex items-center justify-center text-[10px] font-bold">N</span>
                      Ndiqet
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <Link href="/feed" className="ig-touch flex items-center gap-2 min-h-[44px] -m-2 px-2">
                <AppLogo size={28} />
                <span className="font-bold text-[17px] tracking-tight text-[var(--text)]">ALBNET</span>
              </Link>
            )}
          </div>
          <div className="flex justify-center items-center min-h-[44px] text-[15px] font-semibold text-[var(--text)]">
            {pathname === '/feed' && feedMode === 'following' ? 'Ndiqet' : ''}
          </div>
          <div className="flex items-center justify-end gap-1">
            <Link href="/chat-global" className="ig-touch text-[var(--text)] rounded-full hover:opacity-70 transition-opacity" aria-label="Chat Global">
              <IconGlobe />
            </Link>
            <Link href="/njoftime" className="ig-touch text-[var(--text)] rounded-full hover:opacity-70 transition-opacity relative" aria-label="Njoftime">
              <IconHeart />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--danger)]" />
              )}
            </Link>
            <Link href="/mesazhe" className="ig-touch text-[var(--text)] rounded-full hover:opacity-70 transition-opacity" aria-label="Mesazhe">
              <IconMessage />
            </Link>
          </div>
        </header>

        {/* Desktop: left sidebar – logo me dropdown si Instagram */}
        <aside className="hidden md:flex md:w-[72px] lg:w-[244px] flex-col fixed left-0 top-0 h-full border-r border-[var(--border)] bg-[var(--bg-card)] z-30">
          <div className="p-4 lg:pl-6 lg:pt-6 flex items-center relative" ref={feedDropdownRefDesktop}>
            {pathname === '/feed' ? (
              <>
                <button
                  type="button"
                  onClick={() => setFeedDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 text-[var(--text)] rounded-lg hover:opacity-90"
                  aria-expanded={feedDropdownOpen}
                  aria-label="Zgjidh feed"
                >
                  <AppLogo size={36} />
                  <span className="hidden lg:inline font-bold text-[18px] tracking-tight text-[var(--text)]">ALBNET</span>
                  <svg className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${feedDropdownOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
                {feedDropdownOpen && (
                  <div className="absolute left-4 lg:left-6 top-full mt-1 w-[200px] py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-lg z-[60]">
                    <Link href="/feed" onClick={() => setFeedDropdownOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 text-[14px] ${feedMode === 'for_you' ? 'font-semibold text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
                      <span className="w-5 h-5 rounded-full bg-[var(--ig-gradient)] flex items-center justify-center text-white text-[10px] font-bold">P</span>
                      Për ty
                    </Link>
                    <Link href="/feed?feed=following" onClick={() => setFeedDropdownOpen(false)} className={`flex items-center gap-2 px-4 py-2.5 text-[14px] ${feedMode === 'following' ? 'font-semibold text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
                      <span className="w-5 h-5 rounded-full border-2 border-[var(--text)] flex items-center justify-center text-[10px] font-bold">N</span>
                      Ndiqet
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <Link href="/feed" className="flex items-center gap-2">
                <AppLogo size={36} />
                <span className="hidden lg:inline font-bold text-[18px] tracking-tight text-[var(--text)]">ALBNET</span>
              </Link>
            )}
          </div>
          <nav className="flex-1 px-2 lg:px-3 pt-2 space-y-1">
            {navItems.map((item) => {
              const isActive = item.href === '/feed' ? pathname === '/feed' : pathname === item.href;
              const Icon = item.Icon;
              return (
                <Link
                  key={item.href}
                  href={item.href === '/feed' ? (feedMode === 'following' ? '/feed?feed=following' : '/feed') : item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                    isActive ? 'font-semibold text-[var(--text)]' : 'text-[var(--text)] hover:bg-[var(--bg)]'
                  }`}
                >
                  <span className="flex-shrink-0 relative">
                    {Icon === IconHome && <IconHome active={isActive} />}
                    {Icon === IconSearch && <IconSearch />}
                    {Icon === IconAdd && <IconAdd />}
                    {Icon === IconGlobe && <IconGlobe />}
                    {Icon === IconMessage && <IconMessage />}
                    {item.href === '/njoftime' ? (
                      <>
                        <IconHeart />
                        {unreadNotifications > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--danger)]" />
                        )}
                      </>
                    ) : (
                      Icon === IconHeart && <IconHeart />
                    )}
                  </span>
                  <span className="hidden lg:inline text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="p-2 lg:p-3 border-t border-[var(--border)] space-y-1">
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--text)] hover:bg-[var(--bg)]"
            >
              <span className="flex-shrink-0">{theme === 'dark' ? <IconSun /> : <IconMoon />}</span>
              <span className="hidden lg:inline text-sm">{theme === 'dark' ? 'Ndriço' : 'Errëso'}</span>
            </button>
            {(user.role === 'admin' || user.role === 'moderator') && (
              <Link
                href="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--text)] hover:bg-[var(--bg)]"
              >
                <span className="flex-shrink-0"><IconSettings /></span>
                <span className="hidden lg:inline text-sm">Admin</span>
              </Link>
            )}
            <Link
              href={`/profili/${user.username}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg)] ${
                pathname.startsWith('/profili') ? 'font-semibold text-[var(--text)]' : 'text-[var(--text)]'
              }`}
            >
              <img
                src={user.avatar || ''}
                alt=""
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.username;
                }}
              />
              <span className="hidden lg:inline text-sm font-medium truncate">{user.username}</span>
            </Link>
            <button
              type="button"
              onClick={() => { logout(); router.push('/'); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--text)] hover:bg-[var(--bg)]"
            >
              <span className="flex-shrink-0"><IconLogout /></span>
              <span className="hidden lg:inline text-sm">Dil</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 md:ml-[72px] lg:ml-[244px] pt-[44px] md:pt-0 pb-[60px] md:pb-0 min-h-screen">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>

        {/* Mobile: bottom nav – 5 ikona identike me Instagram (49px) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[49px] bg-[var(--bg-card)] border-t border-[var(--border)] flex items-center justify-around z-40 safe-area-pb shadow-[0_-1px_0_0_var(--border)]">
          {bottomNavItems.map((item) => {
            const isActive = item.icon === 'avatar' ? pathname.startsWith('/profili') : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center flex-1 h-[49px] min-w-0 gap-0.5 ${
                  isActive ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'
                }`}
              >
                {item.icon === 'avatar' ? (
                  <img
                    src={user.avatar || ''}
                    alt=""
                    className={`w-6 h-6 rounded-full object-cover flex-shrink-0 ${isActive ? 'ring-2 ring-[var(--text)] ring-offset-2 ring-offset-[var(--bg-card)]' : ''}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.username;
                    }}
                  />
                ) : (
                  <span className="flex items-center justify-center w-6 h-6">
                    {item.Icon === IconHome && <IconHome active={isActive} />}
                    {item.Icon === IconSearch && <IconSearch />}
                    {item.Icon === IconAdd && <IconAdd />}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      <Toaster />
    </SocketProvider>
  );
}
