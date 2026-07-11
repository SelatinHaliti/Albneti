import User from '../models/User.js';
import Event from '../models/Event.js';
import Notification from '../models/Notification.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { emitNotification } from '../sockets/io.js';

const PROMO_BATCH = 40;
const MIN_HOURS_BETWEEN_PROMOS = 6;
const SYSTEM_USERNAME = 'albnet_official';

async function getSystemUser() {
  let user = await User.findOne({ username: SYSTEM_USERNAME });
  if (!user) {
    user = await User.create({
      username: SYSTEM_USERNAME,
      email: 'official@albneti.app',
      fullName: 'AlbNet',
      bio: 'Zëri zyrtar i komunitetit shqiptar 🇦🇱',
      isVerified: true,
      verifiedSubscription: { plan: 'yearly', status: 'active', subscribedAt: new Date() },
      role: 'admin',
      password: 'AlbNetSystem!' + Date.now(),
    });
  }
  return user;
}

function userEventScore(user, event, interestedCategories) {
  let score = 0;
  const loc = (user.location || '').toLowerCase();
  const city = (event.city || '').toLowerCase();
  const country = (event.country || '').toLowerCase();

  if (city && loc.includes(city)) score += 35;
  if (country && loc.includes(country)) score += 25;
  if (interestedCategories.has(event.category)) score += 40;
  if ((user.eventCategoryInterests || []).includes(event.category)) score += 45;
  if (event.featured) score += 20;
  if (event.isOnline) score += 12;

  const daysUntil = Math.max(0, (new Date(event.startAt).getTime() - Date.now()) / 86400000);
  if (daysUntil <= 3) score += 30;
  else if (daysUntil <= 7) score += 18;
  else if (daysUntil <= 14) score += 8;

  const followers = user.followers?.length || 0;
  score += Math.min(followers, 50) * 0.3;

  const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
  const daysSinceActive = (Date.now() - lastActive) / 86400000;
  if (daysSinceActive <= 1) score += 25;
  else if (daysSinceActive <= 7) score += 15;
  else if (daysSinceActive <= 30) score += 5;

  score += Math.random() * 8;
  return score;
}

async function sendPromoDm(systemUser, recipientId, text, eventId) {
  try {
    let conversation = await Conversation.findOne({
      participants: { $all: [systemUser._id, recipientId] },
    });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [systemUser._id, recipientId],
      });
    }
    const msg = await Message.create({
      conversation: conversation._id,
      sender: systemUser._id,
      text,
      type: 'text',
    });
    conversation.lastMessage = msg._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const notif = await Notification.create({
      recipient: recipientId,
      sender: systemUser._id,
      type: 'event_promo',
      event: eventId,
      message: msg._id,
      text: text.slice(0, 200),
    });
    emitNotification(String(recipientId), {
      _id: notif._id,
      type: 'event_promo',
      text: notif.text,
      sender: { username: SYSTEM_USERNAME, fullName: 'AlbNet' },
      isRead: false,
      createdAt: notif.createdAt,
    });
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Shpërndan reklama eventesh te përdoruesit më të përshtatshëm (algoritëm).
 */
export async function distributeEventPromos(eventId, { force = false } = {}) {
  const event = await Event.findById(eventId);
  if (!event) return { sent: 0 };

  const now = Date.now();
  if (!force && event.lastPromoAt) {
    const hoursSince = (now - new Date(event.lastPromoAt).getTime()) / 3600000;
    if (hoursSince < MIN_HOURS_BETWEEN_PROMOS) return { sent: 0, skipped: 'cooldown' };
  }

  const alreadySent = new Set((event.promoUserIds || []).map(String));
  const interestedUserIds = new Set((event.interested || []).map((i) => String(i.user)));

  const pastEvents = await Event.find({
    'interested.user': { $exists: true },
    category: event.category,
  }).select('interested').lean();

  const interestedCategories = new Set([event.category]);
  for (const pe of pastEvents) {
    for (const i of pe.interested || []) interestedCategories.add(event.category);
  }

  const candidates = await User.find({
    isBlocked: false,
    username: { $ne: SYSTEM_USERNAME },
    eventPromoOptOut: { $ne: true },
    _id: { $nin: [...alreadySent, ...interestedUserIds] },
  })
    .select('username location followers lastActiveAt eventCategoryInterests')
    .limit(500)
    .lean();

  const scored = candidates
    .map((u) => ({ user: u, score: userEventScore(u, event, interestedCategories) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, PROMO_BATCH);

  const systemUser = await getSystemUser();
  const promoText = `🇦🇱 ${event.emoji} **${event.title}**\n📅 ${event.shortDate} · ${event.location}\n\n${event.description?.slice(0, 120) || 'Event komuniteti shqiptar.'}\n\n👉 Shiko në Komuniteti dhe regjistrohu!`;

  let sent = 0;
  for (const { user, score } of scored) {
    const notifExists = await Notification.findOne({
      recipient: user._id,
      event: event._id,
      type: 'event_promo',
    });
    if (notifExists) continue;

    const notif = await Notification.create({
      recipient: user._id,
      sender: systemUser._id,
      type: 'event_promo',
      event: event._id,
      text: `${event.emoji} ${event.title} – ${event.shortDate} · ${event.location}`,
    });
    emitNotification(String(user._id), {
      _id: notif._id,
      type: 'event_promo',
      text: notif.text,
      event: String(event._id),
      isRead: false,
      createdAt: notif.createdAt,
    });

    if (score > 30 || event.featured) {
      await sendPromoDm(systemUser, user._id, promoText, event._id);
    }

    event.promoUserIds = event.promoUserIds || [];
    event.promoUserIds.push(user._id);
    sent++;
  }

  event.lastPromoAt = new Date();
  event.promoSentCount = (event.promoSentCount || 0) + sent;
  await event.save();

  return { sent, event: event.title };
}

/** Promovo eventet e veçuara që afrohen */
export async function runScheduledEventPromos() {
  const soon = new Date(Date.now() + 14 * 86400000);
  const events = await Event.find({
    startAt: { $gte: new Date(), $lte: soon },
    $or: [{ featured: true }, { category: { $in: ['diaspora', 'muzike', 'fest'] } }],
  })
    .sort({ startAt: 1 })
    .limit(3);

  const results = [];
  for (const ev of events) {
    const r = await distributeEventPromos(ev._id);
    results.push({ event: ev.title, ...r });
  }
  return results;
}
