import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  avatar?: string;
  bio?: string;
  website?: string;
  location?: string;
  isVerified?: boolean;
  role?: string;
  isPrivate?: boolean;
  followers?: number;
  following?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User | null, token: string | null) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        if (typeof window !== 'undefined' && token) localStorage.setItem('token', token);
        set({ user, token });
      },
      logout: () => {
        if (typeof window !== 'undefined') localStorage.removeItem('token');
        set({ user: null, token: null });
      },
      updateUser: (updates) =>
        set((s) => (s.user ? { user: { ...s.user, ...updates } } : s)),
    }),
    { name: 'albnet-auth' }
  )
);
