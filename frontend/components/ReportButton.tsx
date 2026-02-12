'use client';

import { useState } from 'react';
import { api } from '@/utils/api';

const REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Ngacmim' },
  { value: 'hate_speech', label: 'Fjalë urrejtjeje' },
  { value: 'violence', label: 'Dhunë' },
  { value: 'nudity', label: 'Përmbajtje e pahijshme' },
  { value: 'false_info', label: 'Informacion i rremë' },
  { value: 'other', label: 'Tjetër' },
];

export function ReportButton({
  reportedPost,
  reportedUser,
  reportedStory,
  className = '',
}: {
  reportedPost?: string;
  reportedUser?: string;
  reportedStory?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    setLoading(true);
    try {
      await api('/api/reports', {
        method: 'POST',
        body: { reason, description: description || undefined, reportedPost, reportedUser, reportedStory },
      });
      setSent(true);
      setTimeout(() => { setOpen(false); setSent(false); setReason(''); setDescription(''); }, 1500);
    } catch (_) {}
    setLoading(false);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Raporto
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold dark:text-white mb-4">Dërgo raport</h3>
            {sent ? (
              <p className="text-green-600 dark:text-green-400">Raporti u dërgua. Faleminderit.</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Arsyeja</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">Zgjidhni...</option>
                    {REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Përshkrim (opsional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    maxLength={500}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                    Anulo
                  </button>
                  <button type="submit" disabled={loading} className="flex-1 py-2 rounded-xl bg-primary-500 text-white font-medium disabled:opacity-50">
                    {loading ? 'Duke dërguar...' : 'Dërgo'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
