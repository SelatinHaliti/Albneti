/**
 * Algoritëm renditjeje për feed & explore – optimizon angazhimin në AlbNet.
 * v2: multi-signal ranking me interest affinity, time-decay, dhe diversitet.
 */

const ALBANIAN_TAGS = new Set([
  'shqip', 'shqiptar', 'kosova', 'kosove', 'diaspora', 'tirana', 'prishtine',
  'shqiperia', 'albania', 'arbëresh', 'arbresh', 'kultura', 'muzike',
]);

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function idStr(v) {
  if (v == null) return '';
  if (typeof v === 'object' && v._id != null) return String(v._id);
  return String(v);
}

/**
 * Time-decay me half-life (orë). Postimet e reja mbajnë më shumë peshë.
 */
export function timeDecay(ageHours, halfLifeHours = 18) {
  return Math.pow(0.5, Math.max(0, ageHours) / halfLifeHours);
}

/**
 * Engagement i normalizuar me log – shmang që 1 post me 10k like të mbizotërojë.
 */
export function engagementScore(post) {
  const likes = post.likes?.length || 0;
  const comments = post.comments?.length || 0;
  const views = post.viewCount || 0;
  const shares = post.shares?.length || 0;
  const raw = likes * 2.5 + comments * 6 + views * 0.15 + shares * 4;
  return Math.log1p(raw) * 12;
}

/**
 * Ngjashmëri e thjeshtë hashtag midis viewer preferences dhe postit.
 */
export function interestAffinity(post, viewerTags = []) {
  if (!viewerTags?.length || !post.hashtags?.length) return 0;
  const wanted = new Set(viewerTags.map((t) => String(t).toLowerCase().replace(/^#/, '')));
  let hits = 0;
  for (const t of post.hashtags) {
    if (wanted.has(String(t).toLowerCase().replace(/^#/, ''))) hits += 1;
  }
  return clamp(hits * 9, 0, 36);
}

export function scorePostForUser(post, viewer, author, options = {}) {
  const now = options.now || Date.now();
  const created = new Date(post.createdAt || now).getTime();
  const ageHours = Math.max(0, (now - created) / 3600000);

  const decay = timeDecay(ageHours, options.halfLifeHours || 18);
  const recency = decay * 90;
  const engagement = engagementScore(post) * (0.55 + 0.45 * decay);

  const followingIds = new Set((viewer?.following || []).map((id) => String(id)));
  const followingBoost = followingIds.has(String(post.user?._id || post.user)) ? 55 : 0;

  const authorVerified = author?.isVerified || author?.verifiedSubscription?.status === 'active';
  const verifiedBoost = authorVerified ? 18 : 0;

  const hasMusic = !!post.music?.url;
  const musicBoost = hasMusic ? 12 : 0;

  const isReel = post.type === 'reel' || post.type === 'video';
  const reelBoost = isReel ? 10 : 0;

  const tags = (post.hashtags || []).map((t) => String(t).toLowerCase());
  const albanianBoost = tags.some((t) => ALBANIAN_TAGS.has(t)) ? 20 : 0;

  const savedBoost = post.saved ? 8 : 0;
  const affinity = interestAffinity(post, options.viewerTags || viewer?.preferredTags || []);

  // Jitter i vogël i qëndrueshëm për ditë – shmang rirenditjen e vazhdueshme
  const day = new Date(now).toISOString().slice(0, 10);
  const jitterSeed = `${idStr(post._id)}:${day}`;
  let h = 2166136261;
  for (let i = 0; i < jitterSeed.length; i += 1) {
    h ^= jitterSeed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const jitter = ((h >>> 0) % 600) / 100;

  return (
    recency +
    engagement +
    followingBoost +
    verifiedBoost +
    musicBoost +
    reelBoost +
    albanianBoost +
    savedBoost +
    affinity +
    jitter
  );
}

export function rankPosts(posts, viewer, authorsById = {}, options = {}) {
  const scored = posts.map((p) => {
    const author = authorsById[String(p.user?._id || p.user)] || p.user;
    return { post: p, score: scorePostForUser(p, viewer, author, options) };
  });
  scored.sort((a, b) => b.score - a.score);

  // Diversitet i lehtë: mos lejo >2 postime rresht nga i njëjti autor në top
  if (options.diversify !== false && scored.length > 3) {
    const out = [];
    const deferred = [];
    let lastAuthor = null;
    let streak = 0;
    for (const item of scored) {
      const aid = idStr(item.post.user?._id || item.post.user);
      if (aid && aid === lastAuthor && streak >= 2) {
        deferred.push(item);
        continue;
      }
      out.push(item);
      if (aid === lastAuthor) streak += 1;
      else {
        lastAuthor = aid;
        streak = 1;
      }
    }
    for (const d of deferred) out.push(d);
    return out.map((x) => x.post);
  }

  return scored.map((x) => x.post);
}

export function scoreExplorePost(post, options = {}) {
  const likes = post.likes?.length || post.score || 0;
  const comments = post.comments?.length || 0;
  const views = post.viewCount || 0;
  const ageHours = Math.max(0, (Date.now() - new Date(post.createdAt).getTime()) / 3600000);
  const freshness = timeDecay(ageHours, 24) * 80;
  const engagement = Math.log1p(likes * 2 + comments * 5 + views * 0.2) * 10;
  const verifiedBoost = post.user?.isVerified ? 15 : 0;
  const musicBoost = post.music?.url ? 10 : 0;
  const albanianBoost = (post.hashtags || []).some((t) => ALBANIAN_TAGS.has(String(t).toLowerCase()))
    ? 12
    : 0;
  const affinity = interestAffinity(post, options.viewerTags || []);
  return engagement + freshness + verifiedBoost + musicBoost + albanianBoost + affinity;
}
