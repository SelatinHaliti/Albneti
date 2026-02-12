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
        {/* ── Mobile top bar ── */}
        <header className="md:hidden fixed top-0 left-0 right-0 h-[52px] px-4 grid grid-cols-3 items-center bg-[var(--bg-card)]/95 backdrop-blur-xl border-b border-[var(--border)] z-50 safe-area-pt">
          <div className="flex items-center justify-start min-h-[52px] relative" ref={feedDropdownRefMobile}>
            {pathname === '/feed' ? (
              <>
                <button
                  type="button"
                  onClick={() => setFeedDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 ig-touch text-[var(--text)] rounded-lg p-1 -m-1"
                  aria-expanded={feedDropdownOpen}
                  aria-haspopup="true"
                  aria-label="Zgjidh feed"
                >
                  <AppLogo size={30} />
                  <span className="font-bold text-[17px] tracking-tight text-[var(--text)]">ALBNET</span>
                  <svg className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${feedDropdownOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
                {feedDropdownOpen && (
                  <div className="absolute left-0 top-full mt-2 w-[200px] py-1.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-lg)] z-[60] overflow-hidden">
                    <Link
                      href="/feed"
                      onClick={() => setFeedDropdownOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 text-[14px] transition-colors ${feedMode === 'for_you' ? 'font-semibold text-[var(--text)] bg-[var(--primary-soft)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg)]'}`}
                    >
                      <span className="w-6 h-6 rounded-full bg-[var(--ig-gradient)] flex items-center justify-center text-white text-[11px] font-bold">P</span>
                      Për ty
                    </Link>
                    <Link
                      href="/feed?feed=following"
                      onClick={() => setFeedDropdownOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 text-[14px] transition-colors ${feedMode === 'following' ? 'font-semibold text-[var(--text)] bg-[var(--primary-soft)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg)]'}`}
                    >
                      <span className="w-6 h-6 rounded-full border-2 border-[var(--text)] flex items-center justify-center text-[11px] font-bold">N</span>
                      Ndiqet
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <Link href="/feed" className="ig-touch flex items-center gap-2 min-h-[52px] -m-2 px-2">
                <AppLogo size={30} />
                <span className="font-bold text-[17px] tracking-tight text-[var(--text)]">ALBNET</span>
              </Link>
            )}
          </div>
          <div className="flex justify-center items-center min-h-[52px] text-[14px] font-semibold text-[var(--text)]">
            {pathname === '/feed' && feedMode === 'following' ? 'Ndiqet' : ''}
          </div>
          <div className="flex items-center justify-end gap-0.5">
            <Link href="/chat-global" className="ig-touch text-[var(--text)] rounded-full hover:bg-[var(--bg)] transition-colors" aria-label="Chat Global">
              <IconGlobe />
            </Link>
            <Link href="/njoftime" className="ig-touch text-[var(--text)] rounded-full hover:bg-[var(--bg)] transition-colors relative" aria-label="Njoftime">
              <IconHeart />
              {unreadNotifications > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--danger)] ring-2 ring-[var(--bg-card)]" />
              )}
            </Link>
            <Link href="/mesazhe" className="ig-touch text-[var(--text)] rounded-full hover:bg-[var(--bg)] transition-colors" aria-label="Mesazhe">
              <IconMessage />
            </Link>
          </div>
        </header>

        {/* ── Desktop sidebar ── */}
        <aside className="hidden md:flex md:w-[72px] lg:w-[260px] flex-col fixed left-0 top-0 h-full border-r border-[var(--border)] bg-[var(--bg-card)] z-30">
          {/* Logo */}
          <div className="px-4 lg:px-6 pt-6 pb-4 flex items-center relative" ref={feedDropdownRefDesktop}>
            {pathname === '/feed' ? (
              <>
                <button
                  type="button"
                  onClick={() => setFeedDropdownOpen((o) => !o)}
                  className="flex items-center gap-3 text-[var(--text)] rounded-xl hover:opacity-90 transition-opacity"
                  aria-expanded={feedDropdownOpen}
                  aria-label="Zgjidh feed"
                >
                  <AppLogo size={38} />
                  <span className="hidden lg:inline font-bold text-[20px] tracking-tight text-[var(--text)]">ALBNET</span>
                  <svg className={`hidden lg:block w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${feedDropdownOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
                {feedDropdownOpen && (
                  <div className="absolute left-4 lg:left-6 top-full mt-2 w-[210px] py-1.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-lg)] z-[60] overflow-hidden">
                    <Link href="/feed" onClick={() => setFeedDropdownOpen(false)} className={`flex items-center gap-3 px-4 py-3 text-[14px] transition-colors ${feedMode === 'for_you' ? 'font-semibold text-[var(--text)] bg-[var(--primary-soft)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg)]'}`}>
                      <span className="w-6 h-6 rounded-full bg-[var(--ig-gradient)] flex items-center justify-center text-white text-[11px] font-bold">P</span>
                      Për ty
                    </Link>
                    <Link href="/feed?feed=following" onClick={() => setFeedDropdownOpen(false)} className={`flex items-center gap-3 px-4 py-3 text-[14px] transition-colors ${feedMode === 'following' ? 'font-semibold text-[var(--text)] bg-[var(--primary-soft)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg)]'}`}>
                      <span className="w-6 h-6 rounded-full border-2 border-[var(--text)] flex items-center justify-center text-[11px] font-bold">N</span>
                      Ndiqet
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <Link href="/feed" className="flex items-center gap-3">
                <AppLogo size={38} />
                <span className="hidden lg:inline font-bold text-[20px] tracking-tight text-[var(--text)]">ALBNET</span>
              </Link>
            )}
          </div>

          {/* Nav items */}
          <nav className="flex-1 px-3 lg:px-4 pt-1 space-y-0.5 overflow-y-auto">
            {navItems.map((navItem) => {
              const isActive = navItem.href === '/feed' ? pathname === '/feed' : pathname === navItem.href;
              const Icon = navItem.Icon;
              return (
                <Link
                  key={navItem.href}
                  href={navItem.href === '/feed' ? (feedMode === 'following' ? '/feed?feed=following' : '/feed') : navItem.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 ${
                    isActive
                      ? 'bg-[var(--primary-soft)] text-[var(--text)] font-semibold'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]'
                  }`}
                >
                  <span className={`flex-shrink-0 relative transition-transform duration-150 group-hover:scale-110 ${isActive ? 'text-[var(--primary)]' : ''}`}>
                    {Icon === IconHome && <IconHome active={isActive} />}
                    {Icon === IconSearch && <IconSearch />}
                    {Icon === IconAdd && <IconAdd />}
                    {Icon === IconGlobe && <IconGlobe />}
                    {Icon === IconMessage && <IconMessage />}
                    {navItem.href === '/njoftime' ? (
                      <>
                        <IconHeart />
                        {unreadNotifications > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-[var(--danger)] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[var(--bg-card)]">
                            {unreadNotifications > 9 ? '9+' : unreadNotifications}
                          </span>
                        )}
                      </>
                    ) : (
                      Icon === IconHeart && <IconHeart />
                    )}
                  </span>
                  <span className="hidden lg:inline text-[14px]">{navItem.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="p-3 lg:p-4 border-t border-[var(--border)] space-y-0.5">
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)] transition-colors"
            >
              <span className="flex-shrink-0">{theme === 'dark' ? <IconSun /> : <IconMoon />}</span>
              <span className="hidden lg:inline text-[14px]">{theme === 'dark' ? 'Ndriço' : 'Errëso'}</span>
            </button>
            {(user.role === 'admin' || user.role === 'moderator') && (
              <Link
                href="/admin"
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)] transition-colors"
              >
                <span className="flex-shrink-0"><IconSettings /></span>
                <span className="hidden lg:inline text-[14px]">Admin</span>
              </Link>
            )}
            <Link
              href={`/profili/${user.username}`}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                pathname.startsWith('/profili')
                  ? 'bg-[var(--primary-soft)] font-semibold text-[var(--text)]'
                  : 'text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]'
              }`}
            >
              <img
                src={user.avatar || ''}
                alt=""
                className={`w-7 h-7 rounded-full object-cover flex-shrink-0 ${pathname.startsWith('/profili') ? 'ring-2 ring-[var(--primary)]' : 'ring-1 ring-[var(--border)]'}`}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.username;
                }}
              />
              <span className="hidden lg:inline text-[14px] font-medium truncate">{user.username}</span>
            </Link>
            <button
              type="button"
              onClick={() => { logout(); router.push('/'); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--danger)] transition-colors"
            >
              <span className="flex-shrink-0"><IconLogout /></span>
              <span className="hidden lg:inline text-[14px]">Dil</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 md:ml-[72px] lg:ml-[260px] pt-[52px] md:pt-0 pb-[64px] md:pb-0 min-h-screen">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>

        {/* ── Mobile bottom nav ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[56px] bg-[var(--bg-card)]/95 backdrop-blur-xl border-t border-[var(--border)] flex items-center justify-around z-40 safe-area-pb">
          {bottomNavItems.map((item) => {
            const isActive = item.icon === 'avatar' ? pathname.startsWith('/profili') : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center flex-1 h-[56px] min-w-0 gap-0.5 transition-colors ${
                  isActive ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
                }`}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute top-1 w-1 h-1 rounded-full bg-[var(--primary)]" />
                )}
                {item.icon === 'avatar' ? (
                  <img
                    src={user.avatar || ''}
                    alt=""
                    className={`w-7 h-7 rounded-full object-cover flex-shrink-0 transition-all ${isActive ? 'ring-2 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--bg-card)]' : ''}`}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.username;
                    }}
                  />
                ) : (
                  <span className={`flex items-center justify-center w-7 h-7 transition-transform ${isActive ? 'scale-110' : ''}`}>
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
