import { api } from '@/utils/api';

const PROMPT_DISMISS_KEY = 'albnet-push-prompt-dismissed-at';
const PROMPT_SUBSCRIBED_KEY = 'albnet-push-subscribed';
const DISMISS_DAYS = 5;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export function shouldShowPushPrompt(): boolean {
  if (!isPushSupported()) return false;
  if (Notification.permission === 'granted') return false;
  if (Notification.permission === 'denied') return false;
  if (localStorage.getItem(PROMPT_SUBSCRIBED_KEY) === '1') return false;

  const dismissed = localStorage.getItem(PROMPT_DISMISS_KEY);
  if (!dismissed) return true;
  const dismissedAt = Number(dismissed);
  if (Number.isNaN(dismissedAt)) return true;
  const days = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return days >= DISMISS_DAYS;
}

export function dismissPushPrompt(): void {
  localStorage.setItem(PROMPT_DISMISS_KEY, String(Date.now()));
}

async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const envKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
    if (envKey) return envKey;
    const res = await api<{ publicKey?: string }>('/api/push/vapid-public-key');
    return res.publicKey || null;
  } catch {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null;
  }
}

export async function subscribeToPushNotifications(): Promise<{
  ok: boolean;
  reason?: string;
}> {
  if (!isPushSupported()) {
    return { ok: false, reason: 'unsupported' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: permission };
  }

  const vapidKey = await fetchVapidPublicKey();
  if (!vapidKey) {
    return { ok: false, reason: 'no-vapid' };
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
    });
  }

  await api('/api/push/subscribe', {
    method: 'POST',
    body: {
      subscription: subscription.toJSON(),
      deviceLabel: /iPhone|iPad|Android/i.test(navigator.userAgent)
        ? 'Mobile'
        : 'Desktop',
    },
  });

  localStorage.setItem(PROMPT_SUBSCRIBED_KEY, '1');
  localStorage.removeItem(PROMPT_DISMISS_KEY);
  return { ok: true };
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    try {
      await api('/api/push/subscribe', {
        method: 'DELETE',
        body: { endpoint },
      });
    } catch {
      /* ignore */
    }
  }
  localStorage.removeItem(PROMPT_SUBSCRIBED_KEY);
}

export async function syncPushSubscriptionIfGranted(): Promise<void> {
  if (!isPushSupported() || Notification.permission !== 'granted') return;
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (!existing) return;
  try {
    await api('/api/push/subscribe', {
      method: 'POST',
      body: { subscription: existing.toJSON() },
    });
    localStorage.setItem(PROMPT_SUBSCRIBED_KEY, '1');
  } catch {
    /* ignore */
  }
}
