/**
 * AlbNet Smart Search – renditje e avancuar për kërkim përdoruesish.
 * Preferon përputhje ekzakte/prefix, verifikim, aktivitët dhe miq të përbashkët.
 */

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function scoreUserMatch(user, q, viewerFollowingSet = new Set()) {
  const term = String(q || '').toLowerCase().trim();
  const username = String(user.username || '').toLowerCase();
  const fullName = String(user.fullName || '').toLowerCase();
  let score = 0;

  if (username === term) score += 100;
  else if (username.startsWith(term)) score += 70;
  else if (username.includes(term)) score += 40;

  if (fullName === term) score += 50;
  else if (fullName.startsWith(term)) score += 30;
  else if (fullName.includes(term)) score += 18;

  if (user.isVerified || user.verifiedSubscription?.status === 'active') score += 22;

  const followers = Array.isArray(user.followers) ? user.followers.length : (user.followersCount || 0);
  score += Math.min(18, Math.log10(followers + 1) * 8);

  if (user.lastActiveAt) {
    const ageH = (Date.now() - new Date(user.lastActiveAt).getTime()) / 3600000;
    if (ageH < 24) score += 12;
    else if (ageH < 72) score += 7;
    else if (ageH < 168) score += 3;
  }

  const uid = String(user._id);
  if (viewerFollowingSet.has(uid)) score += 8;

  const mutual = (user.followers || []).filter((id) => viewerFollowingSet.has(String(id))).length;
  if (mutual > 0) score += Math.min(20, mutual * 4);

  return score;
}

export function rankSearchUsers(users, q, viewer) {
  const followingSet = new Set((viewer?.following || []).map((id) => String(id)));
  return [...users]
    .map((u) => ({ ...u, _rank: scoreUserMatch(u, q, followingSet) }))
    .sort((a, b) => b._rank - a._rank)
    .map(({ _rank, ...rest }) => rest);
}

export function buildUserSearchQuery(q, viewerId) {
  const safe = escapeRegex(q.trim());
  return {
    isBlocked: false,
    ...(viewerId ? { _id: { $ne: viewerId } } : {}),
    $or: [
      { username: new RegExp(safe, 'i') },
      { fullName: new RegExp(safe, 'i') },
    ],
  };
}

export const SEARCH_ALGORITHM_ID = 'albnet_search_v2';
