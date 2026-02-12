import { create } from 'zustand';

export type ToastType = 'success' | 'info' | 'error' | 'default';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  createdAt: number;
}

interface ToastState {
  toasts: Toast[];
  add: (message: string, type?: ToastType, duration?: number) => void;
  remove: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const DEFAULT_DURATION = 3000;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  add: (message, type = 'default', duration = DEFAULT_DURATION) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const toast: Toast = { id, message, type, duration, createdAt: Date.now() };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    if (duration > 0) {
      setTimeout(() => get().remove(id), duration);
    }
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  success: (message, duration = DEFAULT_DURATION) => get().add(message, 'success', duration),
  error: (message, duration = DEFAULT_DURATION) => get().add(message, 'error', duration),
  info: (message, duration = DEFAULT_DURATION) => get().add(message, 'info', duration),
}));
