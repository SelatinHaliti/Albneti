'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { IconLive } from '@/components/Icons';

export function CreateMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open, onClose]);

  if (!open) return null;

  const items = [
    { href: '/krijo/post', label: 'Postim', desc: 'Ndaj foto ose video', icon: '📷' },
    { href: '/krijo/story', label: 'Story', desc: '24 orë në profil', icon: '⭕' },
    { href: '/krijo/reel', label: 'Reel', desc: 'Video vertikale me muzikë', icon: '🎬' },
    { href: '/live/nis', label: 'Nis Live', desc: 'Transmetim live për ndjekësit', liveIcon: true, danger: true },
  ] as const;

  return (
    <div className="fixed inset-0 z-[70] ig-modal-overlay flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        ref={ref}
        className="w-full max-w-[360px] liquid-glass-ultra rounded-t-3xl sm:rounded-3xl p-2 pb-6 safe-area-pb sm:mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-[var(--border)] mx-auto mb-4 sm:hidden" />
        <p className="text-center text-[15px] font-semibold text-[var(--text)] py-2 mb-1">Krijo</p>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-[var(--primary-soft)] transition-colors"
          >
            <span className={`w-11 h-11 rounded-full flex items-center justify-center text-xl ${'danger' in item && item.danger ? 'bg-[var(--danger)]/15 text-[var(--danger)]' : 'bg-[var(--primary-soft)]'}`}>
              {'liveIcon' in item && item.liveIcon ? <IconLive active /> : 'icon' in item ? item.icon : null}
            </span>
            <div>
              <p className="text-[14px] font-semibold text-[var(--text)]">{item.label}</p>
              <p className="text-[12px] text-[var(--text-muted)]">{item.desc}</p>
            </div>
          </Link>
        ))}
        <button type="button" onClick={onClose} className="w-full mt-2 py-3 text-[14px] font-semibold text-[var(--text-muted)] rounded-xl hover:bg-[var(--primary-soft)]">
          Anulo
        </button>
      </div>
    </div>
  );
}
