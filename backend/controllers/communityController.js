import Event from '../models/Event.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { notifyUser, buildPushFromNotification } from '../services/pushService.js';
import { distributeEventPromos } from '../services/eventAdsService.js';

const MS_24H = 24 * 60 * 60 * 1000;
const MS_1H = 60 * 60 * 1000;

function formatEventForClient(ev, userId) {
  const interested = ev.interested || [];
  const isInterested = userId
    ? interested.some((i) => String(i.user) === String(userId))
    : false;
  const now = Date.now();
  const start = new Date(ev.startAt).getTime();
  const end = ev.endAt ? new Date(ev.endAt).getTime() : start + MS_1H;
  let status = 'upcoming';
  if (now >= start && now <= end + MS_24H) status = 'live';
  else if (now > end + MS_24H) status = 'past';

  return {
    _id: ev._id,
    slug: ev.slug,
    title: ev.title,
    description: ev.description,
    shortDate: ev.shortDate,
    startAt: ev.startAt,
    endAt: ev.endAt,
    location: ev.location,
    city: ev.city,
    country: ev.country,
    emoji: ev.emoji,
    category: ev.category,
    isOnline: ev.isOnline,
    link: ev.link,
    featured: ev.featured,
    interestedCount: interested.length,
    isInterested,
    status,
    daysUntil: start > now ? Math.ceil((start - now) / MS_24H) : 0,
  };
}

async function sendEventNotification(userId, { type, event, text }) {
  const doc = await Notification.create({
    recipient: userId,
    type,
    event: event._id,
    text,
  });
  const payload = {
    _id: doc._id,
    type,
    text,
    event: String(event._id),
    isRead: false,
    createdAt: doc.createdAt,
  };
  void notifyUser(String(userId), {
    socket: payload,
    push: buildPushFromNotification(doc, 'AlbNet'),
  });
  return doc;
}

/** Dërgon njoftime reminder për evente që afrohen */
export async function processEventReminders(userId) {
  if (!userId) return;
  const now = new Date();
  const events = await Event.find({ 'interested.user': userId, startAt: { $gte: now } });

  for (const event of events) {
    const idx = event.interested.findIndex((i) => String(i.user) === String(userId));
    if (idx < 0) continue;
    const entry = event.interested[idx];
    const msUntil = new Date(event.startAt).getTime() - now.getTime();

    if (msUntil <= MS_24H && msUntil > MS_1H && !entry.reminder24hSent) {
      await sendEventNotification(userId, {
        type: 'event_reminder',
        event,
        text: `⏰ "${event.title}" fillon nesër (${event.shortDate}) · ${event.location}`,
      });
      event.interested[idx].reminder24hSent = true;
      await event.save();
    } else if (msUntil <= MS_1H && msUntil > 0 && !entry.reminder1hSent) {
      await sendEventNotification(userId, {
        type: 'event_reminder',
        event,
        text: `🔔 "${event.title}" fillon për 1 orë! ${event.isOnline ? 'Hyr online tani.' : `Vend: ${event.location}`}`,
      });
      event.interested[idx].reminder1hSent = true;
      await event.save();
    }
  }
}

export const getEvents = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (userId) await processEventReminders(userId);

    const category = (req.query.category || '').trim().toLowerCase();
    const filter = (req.query.filter || 'upcoming').trim().toLowerCase();
    const q = (req.query.q || '').trim().toLowerCase();

    const query = {};
    if (category && category !== 'all') query.category = category;
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } },
        { city: { $regex: q, $options: 'i' } },
      ];
    }

    let events = await Event.find(query).sort({ startAt: 1 }).lean();
    const now = Date.now();

    events = events.filter((ev) => {
      const start = new Date(ev.startAt).getTime();
      const end = ev.endAt ? new Date(ev.endAt).getTime() : start + MS_24H;
      if (filter === 'past') return end < now;
      if (filter === 'mine') {
        if (!userId) return false;
        return (ev.interested || []).some((i) => String(i.user) === String(userId));
      }
      return end >= now - MS_24H;
    });

    const formatted = events.map((ev) => formatEventForClient(ev, userId));
    const myCount = userId
      ? formatted.filter((e) => e.isInterested).length
      : 0;

    const featured = events.find((e) => e.featured);
    if (featured && userId) {
      distributeEventPromos(featured._id).catch(() => {});
    }

    res.json({
      events: formatted,
      myInterestedCount: myCount,
      categories: [
        { id: 'all', label: 'Të gjitha' },
        { id: 'diaspora', label: '🌍 Diaspora' },
        { id: 'online', label: '📡 Online' },
        { id: 'kulture', label: '🎭 Kulturë' },
        { id: 'muzike', label: '🎵 Muzikë' },
        { id: 'fest', label: '🎉 Festa' },
        { id: 'sport', label: '🏃 Sport' },
        { id: 'biznes', label: '💼 Biznes' },
        { id: 'krijues', label: '⭐ Krijues' },
      ],
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

export const toggleInterest = async (req, res) => {
  try {
    const userId = req.user._id ?? req.user.id;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Eventi nuk u gjet.' });

    if (!Array.isArray(event.interested)) event.interested = [];

    const idx = event.interested.findIndex((i) => String(i.user) === String(userId));
    let interested = false;

    if (idx >= 0) {
      event.interested.splice(idx, 1);
      await sendEventNotification(userId, {
        type: 'event_update',
        event,
        text: `U ç'regjistruat nga "${event.title}".`,
      });
    } else {
      event.interested.push({
        user: userId,
        joinedAt: new Date(),
        reminder24hSent: false,
        reminder1hSent: false,
      });
      interested = true;

      await User.findByIdAndUpdate(userId, {
        $addToSet: { eventCategoryInterests: event.category },
        lastActiveAt: new Date(),
      }).catch(() => {});

      const msUntil = new Date(event.startAt).getTime() - Date.now();
      await sendEventNotification(userId, {
        type: 'event_interest',
        event,
        text: `✅ U regjistruat për "${event.title}" (${event.shortDate}). Do të njoftohemi para fillimit!`,
      });

      if (msUntil <= MS_24H && msUntil > 0) {
        const entryIdx = event.interested.length - 1;
        await sendEventNotification(userId, {
          type: 'event_reminder',
          event,
          text: `⏰ "${event.title}" afrohet shpejt – ${event.shortDate} · ${event.location}`,
        });
        event.interested[entryIdx].reminder24hSent = true;
      }
    }

    await event.save();
    await processEventReminders(userId);

    res.json({
      success: true,
      interested,
      interestedCount: event.interested.length,
      event: formatEventForClient(event.toObject(), userId),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

export const getEvent = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const event = await Event.findOne({
      $or: [{ _id: req.params.id }, { slug: req.params.id }],
    }).lean();
    if (!event) return res.status(404).json({ message: 'Eventi nuk u gjet.' });
    res.json({ event: formatEventForClient(event, userId) });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};
