/**
 * Algoritëm renditjeje për feed & explore – optimizon angazhimin në AlbNet.
 */

const ALBANIAN_TAGS = new Set([
  'shqip', 'shqiptar', 'kosova', 'kosove', 'diaspora', 'tirana', 'prishtine',
  'shqiperia', 'albania', 'arbëresh', 'arbresh', 'kultura', 'muzike',
]);

export function scorePostForUser(post, viewer, author) {
  const now = Date.now();
  const created = new Date(post.createdAt || now).getTime();
  const ageHours = Math.max(0, (now - created) / 3600000);

  const likes = post.likes?.length || 0;
  const comments = post.comments?.length || 0;
  const views = post.viewCount || 0;
  const shares = post.shares?.length || 0;

  const recency = Math.max(0, 120 - ageHours * 3);
  const engagement = likes * 2.5 + comments * 6 + views * 0.15 + shares * 4;

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
  const jitter = Math.random() * 6;

  return recency + engagement + followingBoost + verifiedBoost + musicBoost + reelBoost + albanianBoost + savedBoost + jitter;
}

export function rankPosts(posts, viewer, authorsById = {}) {
  return [...posts].sort((a, b) => {
    const authorA = authorsById[String(a.user?._id || a.user)] || a.user;
    const authorB = authorsById[String(b.user?._id || b.user)] || b.user;
    return scorePostForUser(b, viewer, authorB) - scorePostForUser(a, viewer, authorA);
  });
}

export function scoreExplorePost(post) {
  const likes = post.likes?.length || post.score || 0;
  const comments = post.comments?.length || 0;
  const views = post.viewCount || 0;
  const ageHours = Math.max(0, (Date.now() - new Date(post.createdAt).getTime()) / 3600000);
  const freshness = Math.max(0, 80 - ageHours * 2);
  const verifiedBoost = post.user?.isVerified ? 15 : 0;
  const musicBoost = post.music?.url ? 10 : 0;
  return likes * 2 + comments * 5 + views * 0.2 + freshness + verifiedBoost + musicBoost;
}
