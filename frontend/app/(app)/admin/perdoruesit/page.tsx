'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/utils/api';

type User = {
  _id: string;
  username: string;
  email: string;
  fullName?: string;
  avatar?: string;
  isBlocked: boolean;
  role: string;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    api<{ users: User[] }>('/api/admin/perdoruesit')
      .then((r) => setUsers(r.users || []))
      .catch(() => setUsers([]));
  }, []);

  const toggleBlock = async (userId: string, isBlocked: boolean) => {
    try {
      await api(
        `/api/admin/perdoruesit/${userId}/${isBlocked ? 'zhblloko' : 'blloko'}`,
        { method: 'POST' }
      );
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, isBlocked: !isBlocked } : u)));
    } catch (_) {}
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="py-3 text-gray-500 dark:text-gray-400">Përdoruesi</th>
            <th className="py-3 text-gray-500 dark:text-gray-400">Email</th>
            <th className="py-3 text-gray-500 dark:text-gray-400">Roli</th>
            <th className="py-3 text-gray-500 dark:text-gray-400">Statusi</th>
            <th className="py-3 text-gray-500 dark:text-gray-400">Veprime</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u._id} className="border-b border-gray-100 dark:border-gray-700">
              <td className="py-3">
                <Link href={`/profili/${u.username}`} className="font-medium text-primary-500 hover:underline">
                  {u.username}
                </Link>
              </td>
              <td className="py-3 text-gray-600 dark:text-gray-400">{u.email}</td>
              <td className="py-3">{u.role}</td>
              <td className="py-3">{u.isBlocked ? 'Bllokuar' : 'Aktiv'}</td>
              <td className="py-3">
                <button
                  type="button"
                  onClick={() => toggleBlock(u._id, u.isBlocked)}
                  className={`px-3 py-1 rounded-lg text-sm ${u.isBlocked ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                >
                  {u.isBlocked ? 'Zhblloko' : 'Blloko'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
