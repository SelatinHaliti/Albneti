import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';
import { emitNotification } from '../sockets/io.js';

let vapidReady = false;

export function isPushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || '';
}

function ensureVapid() {
  if (vapidReady) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@albneti.vercel.app';
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidReady = true;
  return true;
}

/**
 * Dërgon Web Push te të gjitha pajisjet e përdoruesit (edhe jashtë app-it).
 */
export async function sendPushToUser(userId, payload) {
  if (!ensureVapid()) return { sent: 0, failed: 0 };

  const subs = await PushSubscription.find({ user: String(userId) }).lean();
  if (!subs.length) return { sent: 0, failed: 0 };

  const body = JSON.stringify({
    title: payload.title || 'AlbNet',
    body: payload.body || '',
    url: payload.url || '/njoftime',
    tag: payload.tag || 'albnet',
    type: payload.type || 'general',
    icon: payload.icon || '/icon.png',
    badge: payload.badge || '/icon.png',
    requireInteraction: Boolean(payload.requireInteraction),
    data: payload.data || {},
  });

  let sent = 0;
  let failed = 0;
  const deadEndpoints = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          body,
          { TTL: payload.ttl ?? 60 * 60 }
        );
        sent += 1;
        await PushSubscription.updateOne({ _id: sub._id }, { lastUsedAt: new Date() });
      } catch (err) {
        failed += 1;
        const status = err?.statusCode || err?.status;
        if (status === 404 || status === 410) {
          deadEndpoints.push(sub.endpoint);
        }
      }
    })
  );

  if (deadEndpoints.length) {
    await PushSubscription.deleteMany({ endpoint: { $in: deadEndpoints } });
  }

  return { sent, failed };
}

/** Socket + push njëkohësisht */
export async function notifyUser(userId, { socket, push }) {
  if (socket) emitNotification(String(userId), socket);
  if (push) await sendPushToUser(String(userId), push);
}

export function buildPushFromNotification(notif, senderUsername) {
  const user = senderUsername ? `@${senderUsername}` : 'Dikush';
  const map = {
    message: { title: 'Mesazh i ri', body: `${user} të dërgoi një mesazh`, url: '/mesazhe' },
    follow: { title: 'Ndjekës i ri', body: `${user} filloi të të ndjekë`, url: '/njoftime' },
    like: { title: 'Pëlqim i ri', body: `${user} pëlqeu postimin tënd`, url: '/njoftime' },
    comment: { title: 'Koment i ri', body: `${user} komentoi postimin tënd`, url: '/njoftime' },
    mention: { title: 'Përmendje', body: `${user} të përmendi`, url: '/njoftime' },
    share: { title: 'Ndarje', body: `${user} ndau postimin tënd`, url: '/njoftime' },
    story_view: { title: 'Story', body: `${user} shikoi story-n tënde`, url: '/njoftime' },
    verification: { title: 'Verifikim', body: notif.text || 'Llogaria jote u verifikua!', url: '/verifikim' },
    event_interest: { title: 'Komuniteti', body: notif.text || 'Aktivitet i ri', url: '/komuniteti' },
    event_reminder: { title: 'Kujtesë eventi', body: notif.text || 'Event së shpejti', url: '/komuniteti' },
    event_update: { title: 'Event', body: notif.text || 'Përditësim eventi', url: '/komuniteti' },
    event_promo: { title: 'AlbNet', body: notif.text || 'Lajm nga komuniteti', url: '/komuniteti' },
  };
  const base = map[notif.type] || { title: 'AlbNet', body: notif.text || 'Njoftim i ri', url: '/njoftime' };
  if (notif.text && notif.type === 'message') base.body = `${user}: ${notif.text}`;
  return {
    ...base,
    tag: `notif-${notif.type}`,
    type: notif.type,
    data: { notificationId: notif._id?.toString?.() },
  };
}

export async function sendIncomingCallPush(calleeId, { callerUsername, conversationId, mode }) {
  const user = callerUsername ? `@${callerUsername}` : 'Dikush';
  const isVideo = mode === 'video';
  await sendPushToUser(calleeId, {
    title: isVideo ? 'Thirrje video hyrëse' : 'Thirrje audio hyrëse',
    body: `${user} po të thirr – prek për të përgjigjur`,
    url: `/mesazhe/${conversationId}`,
    tag: `call-${conversationId}`,
    type: 'call',
    requireInteraction: true,
    ttl: 45,
    data: { conversationId, mode, callerUsername },
  });
}
