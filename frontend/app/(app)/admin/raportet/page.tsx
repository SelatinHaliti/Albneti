'use client';

import { useEffect, useState } from 'react';
import { api } from '@/utils/api';

type Report = {
  _id: string;
  reason: string;
  status: string;
  description?: string;
  reporter?: { username: string; email: string };
  reportedUser?: { username: string; avatar?: string };
  reportedPost?: string;
  createdAt: string;
};

const statusLabels: Record<string, string> = {
  pending: 'Në pritje',
  reviewed: 'E shqyrtuar',
  resolved: 'E zgjidhur',
  dismissed: 'E refuzuar',
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    api<{ reports: Report[] }>(`/api/admin/raportet?status=${filter}`)
      .then((r) => setReports(r.reports || []))
      .catch(() => setReports([]));
  }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api(`/api/admin/raportet/${id}`, { method: 'PUT', body: { status } });
      setReports((prev) => prev.map((r) => (r._id === id ? { ...r, status } : r)));
    } catch (_) {}
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['pending', 'reviewed', 'resolved', 'dismissed'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${
              filter === s ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            {statusLabels[s]}
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {reports.map((r) => (
          <div
            key={r._id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4"
          >
            <p className="font-medium text-gray-900 dark:text-white">{r.reason}</p>
            {r.description && <p className="text-sm text-gray-500 mt-1">{r.description}</p>}
            <p className="text-xs text-gray-400 mt-2">
              Raportuar nga: {r.reporter?.username} • {new Date(r.createdAt).toLocaleString('sq-AL')}
            </p>
            <p className="text-xs mt-1">Status: {statusLabels[r.status]}</p>
            {r.status === 'pending' && (
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => updateStatus(r._id, 'reviewed')}
                  className="px-3 py-1 rounded-lg bg-gray-200 dark:bg-gray-600 text-sm"
                >
                  Shqyrto
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(r._id, 'resolved')}
                  className="px-3 py-1 rounded-lg bg-green-600 text-white text-sm"
                >
                  Zgjidh
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(r._id, 'dismissed')}
                  className="px-3 py-1 rounded-lg bg-red-600 text-white text-sm"
                >
                  Refuzo
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
