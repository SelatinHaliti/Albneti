'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReelsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/feed');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <p className="text-[var(--text-muted)]">Duke ridrejtuar...</p>
    </div>
  );
}
