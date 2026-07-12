import crypto from 'crypto';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Event from '../models/Event.js';
import LiveStream from '../models/LiveStream.js';
import MarketingRun from '../models/MarketingRun.js';
import { sendAlbnetAdsEmail, isSmtpConfigured } from '../utils/email.js';

const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 2000;
const ACTIVE_DAYS = 60;
const MIN_DAYS_BETWEEN_EMAILS = 6;
const SYSTEM_USERNAME = 'albnet_official';

const WEEKLY_THEMES = [
  {
    id: 'live-reels',
    subject: '🔴 Këtë javë në AlbNet: Live, Reels & diaspora',
    headline: 'Rrjeti yt social shqiptar po lulëzon',
    intro: 'Shiko çfarë po ndodh këtë javë – transmetime live, reels kreative dhe komuniteti shqiptar në një vend.',
    features: [
      { emoji: '🔴', title: 'Nis Live', desc: 'Lidhu me ndjekësit në kohë reale. Komente live, shikues, WebRTC.', cta: 'Nis transmetim', path: '/live/nis' },
      { emoji: '🎬', title: 'Reels me muzikë', desc: 'Krijo video vertikale, duet dhe shpërndaj me hashtag shqiptar.', cta: 'Shiko Reels', path: '/reels' },
      { emoji: '💬', title: 'Mesazhe & thirrje', desc: 'DM, grupe, voice notes dhe thirrje audio/video falas.', cta: 'Hap mesazhet', path: '/mesazhe' },
    ],
  },
  {
    id: 'community',
    subject: '🇦🇱 Evente & komuniteti shqiptar në AlbNet',
    headline: 'Komuniteti yt po pret',
    intro: 'Ngjarje diaspora, festa, muzikë dhe takime online – gjithçka në seksionin Komuniteti.',
    features: [
      { emoji: '🇦🇱', title: 'Komuniteti', desc: 'Evente, promovime dhe takime për shqiptarët kudo në botë.', cta: 'Eksploro', path: '/komuniteti' },
      { emoji: '🌍', title: 'Chat Global', desc: 'Bisedo live me shqiptarë nga çdo vend – 24/7.', cta: 'Hyr në chat', path: '/chat-global' },
      { emoji: '✨', title: 'Story & Close Friends', desc: 'Ndaj momente me miq të ngushtë – unike si Instagram.', cta: 'Krijo story', path: '/krijo/story' },
    ],
  },
  {
    id: 'creators',
    subject: '✓ Krijues të verifikuar & përmbajtje trending',
    headline: 'Rrit audiencën tënde',
    intro: 'Verifikohu me badge blu, arri më shumë njerëz dhe shiko çfarë po trend-on në feed.',
    features: [
      { emoji: '✓', title: 'AlbNet Verifikuar', desc: 'Badge blu, prioritet në feed dhe mbrojtje nga imitim.', cta: 'Verifikohu', path: '/verifikim' },
      { emoji: '📸', title: 'Postime & Eksploro', desc: 'Hashtag trending, eksploro krijues dhe ndiq të rinj.', cta: 'Eksploro', path: '/explore' },
      { emoji: '📲', title: 'Shkarko AlbNet', desc: 'PWA për telefon – si app native, pa App Store.', cta: 'Shkarko', path: '/shkarko' },
    ],
  },
  {
    id: 'engagement',
    subject: '💬 Mos humb – miqtë të tu janë aktiv në AlbNet',
    headline: 'Kthehu dhe lidhu sërish',
    intro: 'Feed-i yt po mbushet me postime të reja. Ja pse ia vlen të hapësh AlbNet sot.',
    features: [
      { emoji: '❤️', title: 'Feed & Ndiqet', desc: 'Postime nga miqtë dhe përmbajtje "Për ty" e personalizuar.', cta: 'Hap feed-in', path: '/feed' },
      { emoji: '🔔', title: 'Njoftime live', desc: 'Merr njoftime kur dikush nis live ose të ndjek.', cta: 'Shiko njoftimet', path: '/njoftime' },
      { emoji: '👥', title: 'Miq të ngushtë', desc: 'Story vetëm për ata që zgjedh ti – si Instagram Close Friends.', cta: 'Menaxho', path: '/profili/miq-te-ngushte' },
    ],
  },
];

function frontendBase() {
  return (process.env.FRONTEND_URL || 'https://albneti.vercel.app').replace(/\/$/, '');
}

export function getWeekKey(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const start = new Date(year, 0, 1);
  const days = Math.floor((d - start) / 86400000);
  const week = Math.ceil((days + start.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function pickTheme(weekKey) {
  const weekNum = parseInt(weekKey.split('-W')[1] || '1', 10);
  return WEEKLY_THEMES[weekNum % WEEKLY_THEMES.length];
}

async function ensureUnsubscribeToken(user) {
  if (user.marketingUnsubscribeToken) return user.marketingUnsubscribeToken;
  const token = crypto.randomBytes(24).toString('hex');
  await User.findByIdAndUpdate(user._id, { $set: { marketingUnsubscribeToken: token } });
  return token;
}

async function buildDynamicHighlights() {
  const since = new Date(Date.now() - 7 * 86400000);
  const [trendingPosts, upcomingEvent, activeLives, activeUsers] = await Promise.all([
    Post.find({ createdAt: { $gte: since }, isArchived: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('user', 'username avatar')
      .lean(),
    Event.find({ startAt: { $gte: new Date() } })
      .sort({ startAt: 1 })
      .limit(1)
      .lean(),
    LiveStream.countDocuments({ isActive: true }),
    User.countDocuments({
      isBlocked: false,
      lastActiveAt: { $gte: since },
      username: { $ne: SYSTEM_USERNAME },
    }),
  ]);

  const trendingPost = [...trendingPosts].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))[0] || null;

  return {
    trendingPost,
    upcomingEvent: upcomingEvent || null,
    activeLives,
    activeUsers,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Dërgon email-in javor AlbNet Ads te përdoruesit aktivë.
 */
export async function runWeeklyMarketingEmails({ force = false, triggeredBy = 'cron' } = {}) {
  if (!isSmtpConfigured()) {
    return { ok: false, error: 'SMTP nuk është konfiguruar. Vendos SMTP_* në Render.' };
  }

  const weekKey = getWeekKey();
  const existing = await MarketingRun.findOne({ weekKey }).lean();
  if (existing?.completedAt && !force) {
    return { ok: true, skipped: true, reason: 'already_sent', weekKey, sent: existing.sentCount };
  }

  const theme = pickTheme(weekKey);
  const highlights = await buildDynamicHighlights();
  const base = frontendBase();

  const activeSince = new Date(Date.now() - ACTIVE_DAYS * 86400000);
  const minEmailGap = new Date(Date.now() - MIN_DAYS_BETWEEN_EMAILS * 86400000);

  const users = await User.find({
    isBlocked: false,
    marketingEmailsOptIn: { $ne: false },
    email: { $exists: true, $ne: '' },
    username: { $ne: SYSTEM_USERNAME },
    lastActiveAt: { $gte: activeSince },
    $or: [
      { lastMarketingEmailAt: { $exists: false } },
      { lastMarketingEmailAt: null },
      { lastMarketingEmailAt: { $lt: minEmailGap } },
    ],
  })
    .select('username email fullName marketingUnsubscribeToken lastMarketingEmailAt')
    .limit(2000)
    .lean();

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    for (const u of batch) {
      if (u.lastMarketingEmailAt && new Date(u.lastMarketingEmailAt) >= minEmailGap && !force) {
        skipped++;
        continue;
      }
      const token = await ensureUnsubscribeToken(u);
      const result = await sendAlbnetAdsEmail({
        to: u.email,
        username: u.username,
        fullName: u.fullName,
        theme,
        highlights,
        baseUrl: base,
        unsubscribeToken: token,
      });
      if (result.ok) {
        sent++;
        await User.findByIdAndUpdate(u._id, { $set: { lastMarketingEmailAt: new Date() } });
      } else {
        failed++;
      }
    }
    if (i + BATCH_SIZE < users.length) await sleep(BATCH_DELAY_MS);
  }

  await MarketingRun.findOneAndUpdate(
    { weekKey },
    {
      $set: {
        weekKey,
        subject: theme.subject,
        theme: theme.id,
        sentCount: sent,
        failedCount: failed,
        skippedCount: skipped,
        completedAt: new Date(),
        triggeredBy,
      },
    },
    { upsert: true }
  );

  return { ok: true, weekKey, theme: theme.id, sent, failed, skipped, total: users.length };
}

export async function unsubscribeMarketingByToken(token) {
  if (!token || typeof token !== 'string') {
    return { ok: false, message: 'Token i pavlefshëm.' };
  }
  const user = await User.findOne({ marketingUnsubscribeToken: token.trim() });
  if (!user) return { ok: false, message: 'Lidhja e çabonimit nuk është e vlefshme.' };
  user.marketingEmailsOptIn = false;
  await user.save();
  return { ok: true, username: user.username };
}

export async function getMarketingStats() {
  const weekKey = getWeekKey();
  const [lastRun, optedIn, optedOut, eligible] = await Promise.all([
    MarketingRun.findOne().sort({ createdAt: -1 }).lean(),
    User.countDocuments({ marketingEmailsOptIn: { $ne: false }, isBlocked: false }),
    User.countDocuments({ marketingEmailsOptIn: false }),
    User.countDocuments({
      isBlocked: false,
      marketingEmailsOptIn: { $ne: false },
      lastActiveAt: { $gte: new Date(Date.now() - ACTIVE_DAYS * 86400000) },
    }),
  ]);
  return {
    smtpConfigured: isSmtpConfigured(),
    currentWeekKey: weekKey,
    lastRun,
    optedIn,
    optedOut,
    eligibleActiveUsers: eligible,
    themes: WEEKLY_THEMES.map((t) => ({ id: t.id, subject: t.subject })),
  };
}
