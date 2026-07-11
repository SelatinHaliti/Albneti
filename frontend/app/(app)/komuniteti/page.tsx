'use client';

import { Suspense } from 'react';
import KomunitetiContent from './KomunitetiContent';

export default function KomunitetiPage() {
  return (
    <Suspense fallback={<div className="max-w-[630px] mx-auto px-4 py-6 text-[var(--text-muted)]">Duke ngarkuar...</div>}>
      <KomunitetiContent />
    </Suspense>
  );
}
