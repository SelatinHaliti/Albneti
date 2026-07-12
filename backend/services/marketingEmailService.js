import crypto from 'crypto';
import User from '../models/User.js';
import Post from '../models/Post.js';
import Event from '../models/Event.js';
import LiveStream from '../models/LiveStream.js';
import MarketingRun from '../models/MarketingRun.js';
import { sendAlbnetAdsEmail, isSmtpConfigured, verifySmtpConnection } from '../utils/email.js';
import { generateMarketingTheme, getAiMarketingStatus } from './aiMarketingService.js';

const BATCH_SIZE = 25;
const BATCH_DELAY_MS = 2000;
const ACTIVE_DAYS = 60;
const MIN_DAYS_BETWEEN_EMAILS = 6;
const SYSTEM_USERNAME = 'albnet_official';
const STUCK_RUN_MS = 15 * 60 * 1000;

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
  const [trendingPosts, upcomingEvent, activeLives, activeUsers, totalUsers] = await Promise.all([
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
    User.countDocuments({ isBlocked: false, username: { $ne: SYSTEM_USERNAME } }),
  ]);

  const trendingPost = [...trendingPosts].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))[0] || null;

  return {
    trendingPost,
    upcomingEvent: upcomingEvent || null,
    activeLives,
    activeUsers,
    totalUsers,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Pastron dërgime të ngecura (server restart / timeout) */
export async function resetStuckMarketingRuns() {
  const cutoff = new Date(Date.now() - STUCK_RUN_MS);
  const result = await MarketingRun.updateMany(
    { status: 'running', updatedAt: { $lt: cutoff } },
    {
      $set: {
        status: 'failed',
        errorMessage: 'Dërguar u ndërpre (server restart ose timeout). Provo përsëri.',
        completedAt: new Date(),
      },
    }
  );
  return result.modifiedCount || 0;
}

/** Admin: anulon të gjitha dërgimet në status running */
export async function cancelStuckMarketingRuns() {
  const result = await MarketingRun.updateMany(
    { status: 'running' },
    {
      $set: {
        status: 'failed',
        errorMessage: 'Anuluar manualisht nga admin.',
        completedAt: new Date(),
      },
    }
  );
  return result.modifiedCount || 0;
}

async function sendToUsers({ users, theme, highlights, base, triggeredBy, runKey, runType, force }) {
  const smtpCheck = await verifySmtpConnection();
  if (!smtpCheck.ok) {
    await MarketingRun.findOneAndUpdate(
      { weekKey: runKey, runType },
      {
        $set: {
          status: 'failed',
          errorMessage: smtpCheck.error,
          completedAt: new Date(),
          failedCount: users.length,
        },
      }
    );
    return { sent: 0, failed: users.length, skipped: 0, total: users.length, lastError: smtpCheck.error };
  }

  const minEmailGap = new Date(Date.now() - MIN_DAYS_BETWEEN_EMAILS * 86400000);
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let lastError = null;

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
        if (!lastError) lastError = result.error;
      }
    }
    if (i + BATCH_SIZE < users.length) await sleep(BATCH_DELAY_MS);

    await MarketingRun.findOneAndUpdate(
      { weekKey: runKey, runType },
      { $set: { sentCount: sent, failedCount: failed, skippedCount: skipped } }
    );
  }

  await MarketingRun.findOneAndUpdate(
    { weekKey: runKey, runType },
    {
      $set: {
        weekKey: runKey,
        runType,
        subject: theme.subject,
        theme: theme.id,
        generatedContent: theme,
        aiSource: theme.aiSource,
        aiModel: theme.aiModel,
        sentCount: sent,
        failedCount: failed,
        skippedCount: skipped,
        status: failed > 0 && sent === 0 ? 'failed' : 'completed',
        errorMessage: sent === 0 && lastError ? lastError : undefined,
        completedAt: new Date(),
        triggeredBy,
      },
    },
    { upsert: true }
  );

  return { sent, failed, skipped, total: users.length, lastError };
}

function queryEligibleUsers({ allUsers = false } = {}) {
  const activeSince = new Date(Date.now() - ACTIVE_DAYS * 86400000);
  const minEmailGap = new Date(Date.now() - MIN_DAYS_BETWEEN_EMAILS * 86400000);
  const baseQuery = {
    isBlocked: false,
    marketingEmailsOptIn: { $ne: false },
    email: { $exists: true, $ne: '' },
    username: { $ne: SYSTEM_USERNAME },
  };
  if (!allUsers) {
    baseQuery.lastActiveAt = { $gte: activeSince };
    baseQuery.$or = [
      { lastMarketingEmailAt: { $exists: false } },
      { lastMarketingEmailAt: null },
      { lastMarketingEmailAt: { $lt: minEmailGap } },
    ];
  }
  return User.find(baseQuery)
    .select('username email fullName marketingUnsubscribeToken lastMarketingEmailAt')
    .limit(5000)
    .lean();
}

/**
 * Dërgon email-in javor AlbNet Ads te përdoruesit aktivë.
 */
export async function runWeeklyMarketingEmails({ force = false, triggeredBy = 'cron' } = {}) {
  if (!isSmtpConfigured()) {
    return { ok: false, error: 'SMTP nuk është konfiguruar. Vendos SMTP_* në Render.' };
  }

  const weekKey = getWeekKey();
  const existing = await MarketingRun.findOne({ weekKey, runType: 'weekly' }).lean();
  if (existing?.completedAt && !force) {
    return { ok: true, skipped: true, reason: 'already_sent', weekKey, sent: existing.sentCount };
  }

  const highlights = await buildDynamicHighlights();
  const theme = await generateMarketingTheme(highlights, { fast: true });
  const base = frontendBase();

  const users = await queryEligibleUsers({ allUsers: false });

  const { sent, failed, skipped, total } = await sendToUsers({
    users,
    theme,
    highlights,
    base,
    triggeredBy,
    runKey: weekKey,
    runType: 'weekly',
    force,
  });

  return {
    ok: true,
    weekKey,
    theme: theme.id,
    aiSource: theme.aiSource,
    subject: theme.subject,
    sent,
    failed,
    skipped,
    total,
  };
}

/** Admin: gjeneron preview marketing me AI */
export async function getAIMarketingPreview() {
  const highlights = await buildDynamicHighlights();
  const theme = await generateMarketingTheme(highlights, { fast: true });
  const [allUsers, activeUsers] = await Promise.all([
    queryEligibleUsers({ allUsers: true }),
    queryEligibleUsers({ allUsers: false }),
  ]);
  return {
    ok: true,
    theme,
    highlights: {
      activeUsers: highlights.activeUsers,
      activeLives: highlights.activeLives,
      totalUsers: highlights.totalUsers,
      trendingCreator: highlights.trendingPost?.user?.username || null,
      upcomingEvent: highlights.upcomingEvent?.title || null,
    },
    recipientCount: allUsers.length,
    activeRecipientCount: activeUsers.length,
    ai: getAiMarketingStatus(),
  };
}

/** Worker – dërgon blast në background */
async function runAIMarketingBlastWorker({ runKey, triggeredBy }) {
  const highlights = await buildDynamicHighlights();
  const theme = await generateMarketingTheme(highlights, { fast: true });
  const base = frontendBase();
  const users = await queryEligibleUsers({ allUsers: true });

  if (!users.length) {
    await MarketingRun.findOneAndUpdate(
      { weekKey: runKey, runType: 'ai-blast' },
      { $set: { status: 'failed', errorMessage: 'Nuk ka përdorues me email.', completedAt: new Date() } }
    );
    return { ok: false, error: 'Nuk ka përdorues me email për dërgim.' };
  }

  const result = await sendToUsers({
    users,
    theme,
    highlights,
    base,
    triggeredBy,
    runKey,
    runType: 'ai-blast',
    force: true,
  });

  return {
    ok: result.sent > 0,
    runKey,
    theme: theme.id,
    aiSource: theme.aiSource,
    aiModel: theme.aiModel,
    subject: theme.subject,
    headline: theme.headline,
    ...result,
  };
}

/** Admin: nis blast në background (kthehet menjëherë) */
export async function startAIMarketingBlast({ triggeredBy = 'admin' } = {}) {
  if (!isSmtpConfigured()) {
    return { ok: false, error: 'SMTP nuk është konfiguruar. Vendos SMTP_HOST, SMTP_USER, SMTP_PASS në Render Environment.' };
  }

  await resetStuckMarketingRuns();

  const running = await MarketingRun.findOne({ status: 'running' }).lean();
  if (running) {
    return {
      ok: true,
      alreadyRunning: true,
      runKey: running.weekKey,
      runType: running.runType,
      message: 'Një dërgim është ende në proces. Prit ose anulo.',
    };
  }

  const runKey = `${getWeekKey()}-blast-${Date.now()}`;
  const users = await queryEligibleUsers({ allUsers: true });
  if (!users.length) {
    return { ok: false, error: 'Nuk ka përdorues me email për dërgim.' };
  }

  await MarketingRun.create({
    weekKey: runKey,
    runType: 'ai-blast',
    status: 'running',
    triggeredBy,
    sentCount: 0,
    failedCount: 0,
    skippedCount: 0,
  });

  setImmediate(() => {
    runAIMarketingBlastWorker({ runKey, triggeredBy }).catch(async (err) => {
      await MarketingRun.findOneAndUpdate(
        { weekKey: runKey, runType: 'ai-blast' },
        { $set: { status: 'failed', errorMessage: err.message, completedAt: new Date() } }
      );
    });
  });

  return {
    ok: true,
    started: true,
    runKey,
    runType: 'ai-blast',
    total: users.length,
    message: `Duke dërguar te ${users.length} përdorues...`,
  };
}

/** Worker – dërgon te përdoruesit aktivë */
async function runActiveMarketingWorker({ runKey, triggeredBy }) {
  const highlights = await buildDynamicHighlights();
  const theme = await generateMarketingTheme(highlights, { fast: true });
  const base = frontendBase();
  const users = await queryEligibleUsers({ allUsers: false });

  if (!users.length) {
    await MarketingRun.findOneAndUpdate(
      { weekKey: runKey, runType: 'weekly' },
      { $set: { status: 'failed', errorMessage: 'Nuk ka përdorues aktivë me email.', completedAt: new Date() } }
    );
    return { ok: false, error: 'Nuk ka përdorues aktivë me email.' };
  }

  const result = await sendToUsers({
    users,
    theme,
    highlights,
    base,
    triggeredBy,
    runKey,
    runType: 'weekly',
    force: true,
  });

  return { ok: result.sent > 0, runKey, ...result, subject: theme.subject };
}

/** Admin: nis dërgim te përdoruesit aktivë (60 ditë) në background */
export async function startActiveMarketingSend({ triggeredBy = 'admin' } = {}) {
  if (!isSmtpConfigured()) {
    return { ok: false, error: 'SMTP nuk është konfiguruar. Vendos SMTP_HOST, SMTP_USER, SMTP_PASS në Render Environment.' };
  }

  await resetStuckMarketingRuns();

  const running = await MarketingRun.findOne({ status: 'running' }).lean();
  if (running) {
    return {
      ok: true,
      alreadyRunning: true,
      runKey: running.weekKey,
      runType: running.runType,
      message: 'Një dërgim është ende në proces. Prit ose anulo.',
    };
  }

  const weekKey = getWeekKey();
  const users = await queryEligibleUsers({ allUsers: false });
  if (!users.length) {
    return { ok: false, error: 'Nuk ka përdorues aktivë me email për dërgim.' };
  }

  await MarketingRun.findOneAndUpdate(
    { weekKey, runType: 'weekly' },
    {
      $set: {
        weekKey,
        runType: 'weekly',
        status: 'running',
        triggeredBy,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
        errorMessage: null,
        completedAt: null,
      },
    },
    { upsert: true }
  );

  setImmediate(() => {
    runActiveMarketingWorker({ runKey: weekKey, triggeredBy }).catch(async (err) => {
      await MarketingRun.findOneAndUpdate(
        { weekKey, runType: 'weekly' },
        { $set: { status: 'failed', errorMessage: err.message, completedAt: new Date() } }
      );
    });
  });

  return {
    ok: true,
    started: true,
    runKey: weekKey,
    runType: 'weekly',
    total: users.length,
    message: `Duke dërguar te ${users.length} përdorues aktivë...`,
  };
}

/** Status i blast-it */
export async function getBlastStatus(runKey) {
  if (!runKey) {
    const running = await MarketingRun.findOne({ status: 'running' }).sort({ updatedAt: -1 }).lean();
    if (running) runKey = running.weekKey;
    else {
      const latest = await MarketingRun.findOne().sort({ createdAt: -1 }).lean();
      if (!latest) return { ok: true, status: 'idle' };
      runKey = latest.weekKey;
    }
  }
  const run = await MarketingRun.findOne({ weekKey: runKey }).sort({ updatedAt: -1 }).lean();
  if (!run) return { ok: false, error: 'Run nuk u gjet.' };
  return {
    ok: true,
    runKey: run.weekKey,
    runType: run.runType,
    status: run.status || 'completed',
    subject: run.subject,
    sent: run.sentCount,
    failed: run.failedCount,
    skipped: run.skippedCount,
    error: run.errorMessage,
    completedAt: run.completedAt,
    aiSource: run.aiSource,
  };
}

/** Admin: 1 klik – gjeneron me AI dhe dërgon te të gjithë përdoruesit (sync – për CLI) */
export async function runAIMarketingBlast({ triggeredBy = 'admin' } = {}) {
  if (!isSmtpConfigured()) {
    return { ok: false, error: 'SMTP nuk është konfiguruar. Vendos SMTP_* në Render.' };
  }

  const highlights = await buildDynamicHighlights();
  const theme = await generateMarketingTheme(highlights, { fast: true });
  const base = frontendBase();
  const runKey = `${getWeekKey()}-blast-${Date.now()}`;

  const users = await queryEligibleUsers({ allUsers: true });
  if (!users.length) {
    return { ok: false, error: 'Nuk ka përdorues me email për dërgim.' };
  }

  await MarketingRun.create({
    weekKey: runKey,
    runType: 'ai-blast',
    status: 'running',
    triggeredBy,
  });

  const result = await sendToUsers({
    users,
    theme,
    highlights,
    base,
    triggeredBy,
    runKey,
    runType: 'ai-blast',
    force: true,
  });

  return {
    ok: result.sent > 0,
    runKey,
    theme: theme.id,
    aiSource: theme.aiSource,
    aiModel: theme.aiModel,
    subject: theme.subject,
    headline: theme.headline,
    error: result.sent === 0 ? result.lastError : undefined,
    ...result,
  };
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

/** Dërgon 1 email test AlbNet Ads (admin ose CLI). */
export async function sendMarketingTestEmail(to) {
  if (!isSmtpConfigured()) {
    return { ok: false, error: 'SMTP nuk është konfiguruar. Vendos SMTP_* në .env ose Render.' };
  }
  const highlights = await buildDynamicHighlights().catch(() => ({
    trendingPost: null,
    upcomingEvent: null,
    activeLives: 0,
    activeUsers: 0,
    totalUsers: 0,
  }));
  const theme = await generateMarketingTheme(highlights, { fast: true }).catch(() => pickTheme(getWeekKey()));
  const base = frontendBase();
  const result = await sendAlbnetAdsEmail({
    to,
    username: 'test',
    fullName: 'Test AlbNet',
    theme: {
      ...theme,
      subject: `🧪 Test AlbNet Ads – ${theme.subject}`,
      headline: 'Test i sistemit AlbNet Ads',
      intro: 'Ky është një email test për të verifikuar SMTP dhe dizajnin marketing.',
    },
    highlights,
    baseUrl: base,
    unsubscribeToken: 'test-token',
  });
  if (!result.ok) return result;
  return { ok: true, message: `Email test u dërgua te ${to}` };
}

export async function getMarketingStats() {
  await resetStuckMarketingRuns();
  const weekKey = getWeekKey();
  const [lastRun, optedIn, optedOut, eligible, totalWithEmail, runningJob] = await Promise.all([
    MarketingRun.findOne().sort({ createdAt: -1 }).lean(),
    User.countDocuments({ marketingEmailsOptIn: { $ne: false }, isBlocked: false }),
    User.countDocuments({ marketingEmailsOptIn: false }),
    User.countDocuments({
      isBlocked: false,
      marketingEmailsOptIn: { $ne: false },
      lastActiveAt: { $gte: new Date(Date.now() - ACTIVE_DAYS * 86400000) },
      email: { $exists: true, $ne: '' },
      username: { $ne: SYSTEM_USERNAME },
    }),
    User.countDocuments({
      isBlocked: false,
      marketingEmailsOptIn: { $ne: false },
      email: { $exists: true, $ne: '' },
      username: { $ne: SYSTEM_USERNAME },
    }),
    MarketingRun.findOne({ status: 'running' }).sort({ createdAt: -1 }).lean(),
  ]);
  return {
    smtpConfigured: isSmtpConfigured(),
    smtpVerified: isSmtpConfigured() ? true : false,
    currentWeekKey: weekKey,
    lastRun,
    runningBlast: runningJob
      ? { runKey: runningJob.weekKey, sent: runningJob.sentCount, failed: runningJob.failedCount, runType: runningJob.runType }
      : null,
    optedIn,
    optedOut,
    eligibleActiveUsers: eligible,
    totalEmailUsers: totalWithEmail,
    ai: getAiMarketingStatus(),
    themes: WEEKLY_THEMES.map((t) => ({ id: t.id, subject: t.subject })),
  };
}
