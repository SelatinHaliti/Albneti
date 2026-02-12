'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore } from '@/store/useToastStore';

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none max-w-[min(100vw-2rem,320px)] md:bottom-6 safe-area-pb">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className={`
              pointer-events-auto px-4 py-3 rounded-xl text-[14px] font-medium shadow-lg
              ${t.type === 'success' ? 'bg-emerald-600 text-white' : ''}
              ${t.type === 'error' ? 'bg-red-600 text-white' : ''}
              ${t.type === 'info' ? 'bg-[var(--primary)] text-white' : ''}
              ${t.type === 'default' ? 'bg-[var(--bg-card)] text-[var(--text)] border border-[var(--border)]' : ''}
            `}
            role="status"
            aria-live="polite"
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
