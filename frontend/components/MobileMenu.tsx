'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import {
  IconHome,
  IconSearch,
  IconReels,
  IconLive,
  IconMessage,
  IconHeart,
  IconCommunity,
  IconVerified,
  IconChatGlobal,
  IconSettings,
  IconLogout,
  IconSun,
  IconMoon,
} from '@/components/Icons';
import { VerifiedBadge } from '@/components/VerifiedBadge';

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  socialUnread?: number;
  messageUnread?: number;
};

const links = [
  { href: '/feed', label: 'Kryefaja', Icon: IconHome },
  { href: '/explore', label: 'Eksploro', Icon: IconSearch },
  { href: '/reels', label: 'Reels', Icon: IconReels },
  { href: '/live', label: 'Live', Icon: IconLive, highlight: true },
  { href: '/komuniteti', label: 'Komuniteti', Icon: IconCommunity, featured: true },
  { href: '/verifikim', label: 'Verifikim', Icon: IconVerified, featured: true },
  { href: '/mesazhe', label: 'Mesazhe', Icon: IconMessage, badgeKey: 'messages' as const },
  { href: '/njoftime', label: 'Njoftime', Icon: IconHeart, badgeKey: 'social' as const },
  { href: '/chat-global', label: 'Chat Global', Icon: IconChatGlobal },
];

export function MobileMenu({ open, onClose, socialUnread = 0, messageUnread = 0 }: MobileMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !user) return null;

  const handleLogout = () => {
    onClose();
    logout();
    router.push('/');
  };

  return (
    <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label="Mbyll menunë"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="mobile-menu-panel absolute right-0 top-0 bottom-0 w-[min(100vw-48px,320px)] liquid-glass-ultra flex flex-col safe-area-pt safe-area-pb"
      >
        <div className="liquid-shine" aria-hidden />

        <div className="relative z-10 flex items-center justify-between px-4 py-4 border-b border-[var(--border-glass)]">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={user.avatar || ''}
              alt=""
              className="w-11 h-11 rounded-full object-cover ring-2 ring-[var(--border)] flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.username;
              }}
            />
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-[var(--text)] truncate flex items-center gap-1">
                {user.username}
                {user.isVerified && <VerifiedBadge size={14} />}
              </p>
              <p className="text-[12px] text-[var(--text-muted)] truncate">{user.fullName || user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ig-touch rounded-full text-[var(--text-muted)] hover:bg-[var(--primary-soft)]"
            aria-label="Mbyll"
          >
            ✕
          </button>
        </div>

        <nav className="relative z-10 flex-1 overflow-y-auto py-2 px-2">
          {links.map((item) => {
            const isActive = pathname === item.href
              || (item.href === '/explore' && pathname.startsWith('/explore'))
              || (item.href === '/live' && pathname.startsWith('/live'));
            const Icon = item.Icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-colors ${
                  isActive ? 'bg-[var(--primary-soft)] text-[var(--text)] font-semibold' : 'text-[var(--text)] hover:bg-[var(--primary-soft)]'
                } ${'highlight' in item && item.highlight ? 'border border-[var(--danger)]/30' : ''} ${'featured' in item && item.featured ? 'border border-[var(--primary)]/25 bg-[var(--primary-soft)]/40' : ''}`}
              >
                <span className="relative flex-shrink-0 w-6 flex justify-center">
                  {Icon === IconHome && <IconHome active={isActive} />}
                  {Icon === IconSearch && <IconSearch />}
                  {Icon === IconReels && <IconReels active={isActive} />}
                  {Icon === IconLive && <IconLive active={isActive} />}
                  {Icon === IconMessage && <IconMessage />}
                  {Icon === IconHeart && <IconHeart />}
                  {Icon === IconCommunity && <IconCommunity active={isActive} />}
                  {Icon === IconVerified && <IconVerified active={isActive} />}
                  {Icon === IconChatGlobal && <IconChatGlobal active={isActive} />}
                  {'highlight' in item && item.highlight && (
                    <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-[var(--danger)] animate-pulse-live" />
                  )}
                  {item.badgeKey === 'social' && socialUnread > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[var(--danger)] text-white text-[9px] font-bold flex items-center justify-center">
                      {socialUnread > 9 ? '9+' : socialUnread}
                    </span>
                  )}
                  {item.badgeKey === 'messages' && messageUnread > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[var(--danger)] text-white text-[9px] font-bold flex items-center justify-center">
                      {messageUnread > 9 ? '9+' : messageUnread}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            );
          })}

          <Link
            href="/profili/redakto"
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium text-[var(--text)] hover:bg-[var(--primary-soft)]"
          >
            <span className="w-6 flex justify-center"><IconSettings /></span>
            Redakto profilin
          </Link>

          {(user.role === 'admin' || user.role === 'moderator') && (
            <Link
              href="/admin"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium text-[var(--text)] hover:bg-[var(--primary-soft)]"
            >
              <span className="w-6 flex justify-center"><IconSettings /></span>
              Admin
            </Link>
          )}
        </nav>

        <div className="relative z-10 p-3 border-t border-[var(--border-glass)] space-y-1">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium text-[var(--text)] hover:bg-[var(--primary-soft)]"
          >
            <span className="w-6 flex justify-center">{theme === 'dark' ? <IconSun /> : <IconMoon />}</span>
            {theme === 'dark' ? 'Ndriço ekranin' : 'Errëso ekranin'}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-semibold text-[var(--danger)] hover:bg-[var(--primary-soft)] bg-[var(--primary-soft)]/50"
          >
            <span className="w-6 flex justify-center"><IconLogout /></span>
            Dil nga llogaria
          </button>
        </div>
      </div>
    </div>
  );
}
