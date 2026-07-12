'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { useAuthReady } from '@/hooks/useAuthReady';
import { useUIStore } from '@/store/useUIStore';
import { SocketProvider, useSocket } from '@/components/SocketProvider';
import { CallProvider } from '@/components/CallProvider';
import { api } from '@/utils/api';
import {
  IconHome,
  IconSearch,
  IconAdd,
  IconReels,
  IconLive,
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
import { CreateMenu } from '@/components/CreateMenu';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { InstallAppBanner } from '@/components/InstallAppBanner';
import { PushNotificationPrompt } from '@/components/PushNotificationPrompt';
import { MobileMenu } from '@/components/MobileMenu';

const navItems = [
  { href: '/feed', label: 'Kryefaja', Icon: IconHome },
  { href: '/explore', label: 'Eksploro', Icon: IconSearch },
  { href: '/reels', label: 'Reels', Icon: IconReels },
  { href: '/live', label: 'Live', Icon: IconLive },
  { href: '/krijo/post', label: 'Krijo', Icon: IconAdd },
  { href: '/mesazhe', label: 'Mesazhe', Icon: IconMessage },
  { href: '/njoftime', label: 'Njoftime', Icon: IconHeart },
  { href: '/chat-global', label: 'Chat Global', Icon: IconGlobe },
  { href: '/komuniteti', label: 'Komuniteti', Icon: IconGlobe },
  { href: '/verifikim', label: 'Verifikim', Icon: IconSettings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <CallProvider>
        <AppShell>{children}</AppShell>
      </CallProvider>
    </SocketProvider>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, isAuthenticated, user } = useAuthReady();
  const logout = useAuthStore((s) => s.logout);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const {
    unreadNotifications: socialUnread,
    unreadMessages,
    refreshNotifications,
    refreshUnreadMessages,
    clearNotificationBadge,
  } = useSocket();
  const [feedDropdownOpen, setFeedDropdownOpen] = useState(false);
  const feedDropdownRefMobile = useRef<HTMLDivElement>(null);
  const feedDropdownRefDesktop = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const feedMode = pathname === '/feed' ? (searchParams.get('feed') === 'following' ? 'following' : 'for_you') : null;
  const isReelsPage = pathname === '/reels';
  const isLiveFullscreen =
    pathname === '/live/nis' ||
    (pathname.startsWith('/live/') && pathname !== '/live/nis');
  const isStoryViewer = pathname.startsWith('/story/');
  const isImmersivePage = isReelsPage || isLiveFullscreen || isStoryViewer;
  const isLiveSection = pathname === '/live' || pathname.startsWith('/live/');
  const hasOwnMobileHeader =
    pathname.startsWith('/mesazhe') ||
    pathname === '/live' ||
    pathname === '/njoftime' ||
    pathname === '/chat-global' ||
    pathname.startsWith('/krijo/') ||
    pathname === '/explore' ||
    pathname === '/verifikim';
  const showGlobalMobileHeader = !isImmersivePage && !hasOwnMobileHeader;
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    import('@/lib/monitoring').then(({ initMonitoring }) => initMonitoring());
  }, []);

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
    if (!ready) return;
    if (!isAuthenticated) router.replace('/kycu');
  }, [ready, isAuthenticated, router]);

  useEffect(() => {
    if (!ready || !user) return;
    if (pathname === '/njoftime') {
      clearNotificationBadge();
    } else {
      void refreshNotifications();
    }
    void refreshUnreadMessages();
    import('@/lib/pushNotifications').then((m) => {
      if (m.getNotificationPermission() === 'granted') void m.syncPushSubscriptionIfGranted();
    });
  }, [user, pathname, ready, refreshNotifications, refreshUnreadMessages, clearNotificationBadge]);

  if (!ready || !isAuthenticated || !user) {
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
    { href: '#create', Icon: IconAdd, isCreate: true },
    { href: '/reels', Icon: IconReels },
    { href: '/profili/' + (user.username || ''), icon: 'avatar' as const },
  ];

  const FeedDropdown = ({ className }: { className?: string }) => (
    <div className={`ig-dropdown ${className || ''}`}>
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
  );

  return (
    <>
      <div className={`min-h-screen flex flex-col md:flex-row overflow-x-hidden max-w-[100vw] ${isReelsPage ? 'bg-black' : 'bg-[var(--bg)]'}`}>
        {/* ── Mobile top bar ── */}
        {!showGlobalMobileHeader ? null : (
          <header className="md:hidden fixed top-0 left-0 right-0 h-[52px] px-4 grid grid-cols-[1fr_auto] items-center ig-nav-bar border-b z-50 safe-area-pt">
            <div className="flex items-center justify-start min-h-[52px] relative" ref={feedDropdownRefMobile}>
              {pathname === '/feed' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setFeedDropdownOpen((o) => !o)}
                    className="flex items-center gap-1.5 ig-touch text-[var(--text)] rounded-lg p-1 -m-1"
                    aria-expanded={feedDropdownOpen}
                    aria-haspopup="true"
                    aria-label="Zgjidh feed"
                  >
                    <span className="albnet-wordmark text-[18px]">ALBNET</span>
                    <svg className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${feedDropdownOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {feedDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 w-[200px] z-[60]">
                      <FeedDropdown />
                    </div>
                  )}
                </>
              ) : (
                <Link href="/feed" className="ig-touch flex items-center min-h-[52px] -m-2 px-2">
                  <span className="albnet-wordmark text-[18px]">ALBNET</span>
                </Link>
              )}
            </div>
            <div className="flex items-center justify-end gap-0 mobile-header-actions">
              {!isLiveSection && (
              <Link
                href="/live"
                className="ig-touch rounded-full hover:bg-[var(--primary-soft)] transition-colors relative text-[var(--text)]"
                aria-label="Live"
              >
                <IconLive active={false} />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--danger)] ring-2 ring-[var(--bg-card)] animate-pulse-live" />
              </Link>
              )}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="ig-touch text-[var(--text)] rounded-full hover:bg-[var(--primary-soft)] transition-colors"
                aria-label="Hap menunë"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              </button>
              <Link href="/njoftime" className="ig-touch text-[var(--text)] rounded-full hover:bg-[var(--primary-soft)] transition-colors relative" aria-label="Njoftime">
                <IconHeart />
                {socialUnread > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--danger)] ring-2 ring-[var(--bg-card)]" />
                )}
              </Link>
              <Link href="/mesazhe" className="ig-touch text-[var(--text)] rounded-full hover:bg-[var(--primary-soft)] transition-colors relative" aria-label="Mesazhe">
                <IconMessage />
                {unreadMessages > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--danger)] ring-2 ring-[var(--bg-card)]" />
                )}
              </Link>
            </div>
          </header>
        )}

        {/* ── Desktop sidebar ── */}
        <aside className={`hidden md:flex md:w-[72px] lg:w-[245px] flex-col fixed left-0 top-0 h-full border-r border-[var(--border)] z-30 ${isReelsPage ? 'bg-black/80 backdrop-blur-xl' : 'ig-nav-bar'}`}>
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
                  <AppLogo size={32} />
                  <span className="hidden lg:inline albnet-wordmark text-[22px]">ALBNET</span>
                  <svg className={`hidden lg:block w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${feedDropdownOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
                {feedDropdownOpen && (
                  <div className="absolute left-4 lg:left-6 top-full mt-2 w-[210px] z-[60]">
                    <FeedDropdown />
                  </div>
                )}
              </>
            ) : (
              <Link href="/feed" className="flex items-center gap-3">
                <AppLogo size={32} />
                <span className="hidden lg:inline albnet-wordmark text-[22px]">ALBNET</span>
              </Link>
            )}
          </div>

          <nav className="flex-1 px-3 lg:px-4 pt-1 space-y-0.5 overflow-y-auto">
            {navItems.map((navItem) => {
              const isActive = navItem.href === '/feed'
                ? pathname === '/feed'
                : navItem.href === '/live'
                  ? isLiveSection
                  : pathname === navItem.href || (navItem.href === '/explore' && pathname.startsWith('/explore'));
              const Icon = navItem.Icon;
              const inner = (
                <>
                  <span className={`flex-shrink-0 relative transition-transform duration-150 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`}>
                    {Icon === IconHome && <IconHome active={isActive} />}
                    {Icon === IconSearch && <IconSearch />}
                    {Icon === IconReels && <IconReels active={isActive} />}
                    {Icon === IconLive && <IconLive active={isActive || (navItem.href === '/live' && isLiveSection)} />}
                    {Icon === IconAdd && (
                      <span className="ig-create-btn">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </span>
                    )}
                    {Icon === IconGlobe && <IconGlobe />}
                    {navItem.href === '/mesazhe' ? (
                      <>
                        <IconMessage />
                        {unreadMessages > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-[var(--danger)] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[var(--bg-card)]">
                            {unreadMessages > 9 ? '9+' : unreadMessages}
                          </span>
                        )}
                      </>
                    ) : navItem.href === '/njoftime' ? (
                      <>
                        <IconHeart />
                        {socialUnread > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-[var(--danger)] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-[var(--bg-card)]">
                            {socialUnread > 9 ? '9+' : socialUnread}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        {Icon === IconMessage && <IconMessage />}
                        {Icon === IconHeart && <IconHeart />}
                      </>
                    )}
                  </span>
                  <span className="hidden lg:inline text-[15px] truncate">{navItem.label}</span>
                </>
              );
              if (navItem.href === '/krijo/post') {
                return (
                  <button
                    key={navItem.href}
                    type="button"
                    onClick={() => setCreateMenuOpen(true)}
                    className="group w-full flex items-center gap-4 px-3 py-3 rounded-xl text-[var(--text)] hover:bg-[var(--primary-soft)] transition-all duration-150"
                  >
                    {inner}
                  </button>
                );
              }
              return (
                <Link
                  key={navItem.href}
                  href={navItem.href === '/feed' ? (feedMode === 'following' ? '/feed?feed=following' : '/feed') : navItem.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-150 md:justify-center lg:justify-start md:px-2 lg:px-3 overflow-hidden ${
                    isActive ? 'text-[var(--text)] font-bold' : 'text-[var(--text)] hover:bg-[var(--primary-soft)]'
                  }`}
                >
                  {inner}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 lg:p-4 border-t border-[var(--border)] space-y-0.5">
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full flex items-center gap-4 px-3 py-3 rounded-xl text-[var(--text)] hover:bg-[var(--primary-soft)] transition-colors"
            >
              <span className="flex-shrink-0">{theme === 'dark' ? <IconSun /> : <IconMoon />}</span>
              <span className="hidden lg:inline text-[15px]">{theme === 'dark' ? 'Ndriço' : 'Errëso'}</span>
            </button>
            {(user.role === 'admin' || user.role === 'moderator') && (
              <Link href="/admin" className="flex items-center gap-4 px-3 py-3 rounded-xl text-[var(--text)] hover:bg-[var(--primary-soft)] transition-colors">
                <span className="flex-shrink-0"><IconSettings /></span>
                <span className="hidden lg:inline text-[15px]">Admin</span>
              </Link>
            )}
            <Link
              href={`/profili/${user.username}`}
              className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-colors ${
                pathname.startsWith('/profili')
                  ? 'font-bold text-[var(--text)]'
                  : 'text-[var(--text)] hover:bg-[var(--primary-soft)]'
              }`}
            >
              <img
                src={user.avatar || ''}
                alt=""
                className={`w-7 h-7 rounded-full object-cover flex-shrink-0 ${pathname.startsWith('/profili') ? 'ring-2 ring-[var(--primary)]' : ''}`}
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.username; }}
              />
              <span className="hidden lg:inline text-[15px] font-medium truncate">{user.username}</span>
            </Link>
            <button
              type="button"
              onClick={() => { logout(); router.push('/'); }}
              className="w-full flex items-center gap-4 px-3 py-3 rounded-xl text-[var(--text-muted)] hover:bg-[var(--primary-soft)] hover:text-[var(--danger)] transition-colors"
              aria-label="Dil nga llogaria"
              title="Dil"
            >
              <span className="flex-shrink-0"><IconLogout /></span>
              <span className="hidden lg:inline text-[15px]">Dil</span>
            </button>
          </div>
        </aside>

        <main className={`app-shell-main md:ml-[72px] lg:ml-[245px] md:pt-0 md:pb-0 ${
          isImmersivePage
            ? 'app-shell-main--immersive'
            : hasOwnMobileHeader
              ? 'app-shell-main--page-header'
              : isReelsPage
                ? 'app-shell-main--reels'
                : ''
        }`}>
          {showGlobalMobileHeader && (
            <div className="md:hidden px-3 pt-2 max-w-[100vw]">
              <InstallAppBanner />
              <PushNotificationPrompt />
            </div>
          )}
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>

        {/* ── Mobile bottom nav ── */}
        {!isLiveFullscreen && !isStoryViewer && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
          <div className={`pointer-events-auto flex items-center justify-around ${isReelsPage ? 'h-[56px] bg-black/85 backdrop-blur-xl border-t border-white/10 safe-area-pb px-2' : 'liquid-nav-pill'}`}>
          {bottomNavItems.map((item) => {
            const isActive = item.icon === 'avatar'
              ? pathname.startsWith('/profili')
              : pathname === item.href || (item.href === '/explore' && pathname.startsWith('/explore'));
            return item.isCreate ? (
              <button
                key="create"
                type="button"
                onClick={() => setCreateMenuOpen(true)}
                className={`relative flex items-center justify-center flex-1 min-h-[48px] min-w-0 transition-colors ${isReelsPage ? 'text-white/80' : 'text-[var(--text)]'}`}
                aria-label="Krijo"
              >
                <span className={`ig-create-btn ${isReelsPage ? 'border-white/80' : ''}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </span>
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-label={
                  item.icon === 'avatar'
                    ? 'Profili'
                    : item.href === '/feed'
                      ? 'Kryefaja'
                      : item.href === '/explore'
                        ? 'Eksploro'
                        : 'Reels'
                }
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex items-center justify-center flex-1 min-h-[48px] min-w-0 transition-colors ${
                  isActive ? 'text-[var(--text)]' : isReelsPage ? 'text-white/60' : 'text-[var(--text)]'
                }`}
              >
                {item.icon === 'avatar' ? (
                  <img
                    src={user.avatar || ''}
                    alt=""
                    className={`w-[26px] h-[26px] rounded-full object-cover flex-shrink-0 transition-all ${isActive ? 'ring-2 ring-[var(--text)]' : ''}`}
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.username; }}
                  />
                ) : (
                  <span className="flex items-center justify-center">
                    {item.Icon === IconHome && <IconHome active={isActive} />}
                    {item.Icon === IconSearch && <IconSearch />}
                    {item.Icon === IconReels && <IconReels active={isActive} />}
                  </span>
                )}
              </Link>
            );
          })}
          </div>
        </nav>
        )}
      </div>
      <MobileMenu
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        socialUnread={socialUnread}
        messageUnread={unreadMessages}
      />
      <CreateMenu open={createMenuOpen} onClose={() => setCreateMenuOpen(false)} />
      <Toaster />
    </>
  );
}
