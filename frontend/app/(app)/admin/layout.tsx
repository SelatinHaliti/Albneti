'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) {
      router.replace('/kycu');
      return;
    }
    if (user.role !== 'admin' && user.role !== 'moderator') {
      router.replace('/feed');
    }
  }, [user, router]);

  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Nuk keni akses.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/feed" className="text-primary-500">← Feed</Link>
        <h1 className="text-2xl font-bold dark:text-white">Panel admini</h1>
      </div>
      <nav className="flex gap-2 mb-6">
        <Link
          href="/admin"
          className={`px-4 py-2 rounded-xl font-medium ${
            pathname === '/admin' ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          Përmbledhje
        </Link>
        <Link
          href="/admin/raportet"
          className={`px-4 py-2 rounded-xl font-medium ${
            pathname === '/admin/raportet' ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          Raportet
        </Link>
        <Link
          href="/admin/perdoruesit"
          className={`px-4 py-2 rounded-xl font-medium ${
            pathname === '/admin/perdoruesit' ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
          }`}
        >
          Përdoruesit
        </Link>
      </nav>
      {children}
    </div>
  );
}
