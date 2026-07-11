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
  verifiedPlan?: string;
  role?: string;
  isPrivate?: boolean;
  followers?: number;
  following?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  _hasHydrated: boolean;
  setAuth: (user: User | null, token: string | null) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setHasHydrated: (value: boolean) => void;
}

function syncTokenToStorage(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

/** Normalizon përdoruesin nga API (id string, username i detyrueshëm) */
export function normalizeAuthUser(raw: unknown): User | null {
  if (!raw || typeof raw !== 'object') return null;
  const u = raw as Record<string, unknown>;
  const id = u.id ?? u._id;
  const username = u.username;
  if (!id || !username || typeof username !== 'string') return null;
  return {
    id: String(id),
    username,
    email: typeof u.email === 'string' ? u.email : '',
    fullName: typeof u.fullName === 'string' ? u.fullName : undefined,
    avatar: typeof u.avatar === 'string' ? u.avatar : undefined,
    bio: typeof u.bio === 'string' ? u.bio : undefined,
    website: typeof u.website === 'string' ? u.website : undefined,
    location: typeof u.location === 'string' ? u.location : undefined,
    isVerified: Boolean(u.isVerified),
    verifiedPlan: typeof u.verifiedPlan === 'string' ? u.verifiedPlan : undefined,
    role: typeof u.role === 'string' ? u.role : undefined,
    isPrivate: Boolean(u.isPrivate),
    followers: typeof u.followers === 'number' ? u.followers : undefined,
    following: typeof u.following === 'number' ? u.following : undefined,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      _hasHydrated: false,
      setHasHydrated: (value) => set({ _hasHydrated: value }),
      setAuth: (user, token) => {
        syncTokenToStorage(token);
        set({ user, token });
      },
      logout: () => {
        syncTokenToStorage(null);
        set({ user: null, token: null });
      },
      updateUser: (updates) =>
        set((s) => (s.user ? { user: { ...s.user, ...updates } } : s)),
    }),
    {
      name: 'albnet-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) syncTokenToStorage(state.token);
        state?.setHasHydrated(true);
      },
    }
  )
);

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const fromStore = useAuthStore.getState().token;
  const fromLs = localStorage.getItem('token');
  if (fromLs) return fromLs;
  if (fromStore) {
    syncTokenToStorage(fromStore);
    return fromStore;
  }
  return null;
}

export function clearAuthSession(reason: 'session' | 'forbidden' = 'session') {
  useAuthStore.getState().logout();
  if (typeof window !== 'undefined') {
    window.location.replace(`/kycu?reason=${reason}`);
  }
}
