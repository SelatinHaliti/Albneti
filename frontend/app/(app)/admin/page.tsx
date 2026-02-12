'use client';

import { useEffect, useState } from 'react';
import { api } from '@/utils/api';

type Stats = { usersCount: number; postsCount: number; reportsPending: number };

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>('/api/admin/stats')
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  if (!stats) {
    return <p className="text-gray-500">Duke ngarkuar...</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">Përdorues gjithsej</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.usersCount}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">Postime</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.postsCount}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">Raportime në pritje</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.reportsPending}</p>
      </div>
    </div>
  );
}
