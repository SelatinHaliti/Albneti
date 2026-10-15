/**
 * AlbNet Suggest Engine v2 — algoritëm i avancuar “Sugjerime për ty”.
 *
 * Sinjale:
 *  1. Graf social (miq të miqve / mutual follows)
 *  2. Ngjashmëri interesash (bio, location, hashtag, niche)
 *  3. Cilësi profili (verified, avatar, bio, aktivitet)
 *  4. Popularitet i balancuar (jo vetëm “më të ndjekurit”)
 *  5. Aktivitet i fundit (lastActiveAt)
 *  6. Diversitet (MMR) që të mos sugjerojë 5 profile të njëjta
 *
 * Funksionon pa ML të jashtëm; të gjitha peshat janë të shpjegueshme.
 */

import { detectNiche, NICHES } from './creatorStudioService.js';

const ALGORITHM_ID = 'albnet_suggest_v2';

const WEIGHTS = {
  mutual: 38,
  foaf: 22,
  interest: 28,
  niche: 18,
  location: 14,
  quality: 16,
  activity: 12,
  popularity: 10,
  exploration: 6,
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function idStr(v) {
  if (v == null) return '';
  if (typeof v === 'object' && v._id != null) return String(v._id);
  return String(v);
}

function tokenize(text = '') {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9çëshqip]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function uniqueTokens(list) {
  return [...new Set(list.filter(Boolean))];
}

function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size && !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / (A.size + B.size - inter);
}

function cosineSparse(vecA, vecB) {
  const keys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const k of keys) {
    const a = vecA[k] || 0;
    const b = vecB[k] || 0;
    dot += a * b;
    na += a * a;
    nb += b * b;
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function hashString(str) {
  let h = 2166136261;
  const s = String(str || '');
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededUnit(seed, salt = '') {
  return (hashString(`${seed}:${salt}`) % 10000) / 10000;
}

/**
 * Ndërton profil interesash nga bio, location, hashtags dhe postime.
 */
export function buildInterestProfile({
  bio = '',
  location = '',
  hashtags = [],
  captions = [],
  eventCategoryInterests = [],
} = {}) {
  const tagFreq = {};
  for (const t of hashtags || []) {
    const key = String(t || '').replace(/^#/, '').toLowerCase().trim();
    if (!key) continue;
    tagFreq[key] = (tagFreq[key] || 0) + 1.5;
  }
  for (const cap of captions || []) {
    for (const tok of tokenize(cap)) {
      tagFreq[tok] = (tagFreq[tok] || 0) + 0.35;
    }
  }
  for (const tok of tokenize(bio)) {
    tagFreq[tok] = (tagFreq[tok] || 0) + 1.2;
  }
  for (const cat of eventCategoryInterests || []) {
    const key = String(cat || '').toLowerCase().trim();
    if (key) tagFreq[key] = (tagFreq[key] || 0) + 2;
  }

  const niche = detectNiche(
    `${bio} ${(captions || []).slice(0, 5).join(' ')}`,
    Object.keys(tagFreq),
    bio
  );

  const locTokens = uniqueTokens(tokenize(location));
  const topTags = Object.entries(tagFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([tag, w]) => ({ tag, w }));

  return {
    vector: tagFreq,
    tags: topTags.map((t) => t.tag),
    nicheId: niche.id,
    nicheLabel: niche.label,
    nicheConfidence: niche.confidence,
    locationTokens: locTokens,
    locationRaw: String(location || '').trim(),
  };
}

/**
 * Cilësi e profilit kandidat (0–1).
 */
export function scoreProfileQuality(candidate = {}) {
  let score = 0.15;
  if (candidate.avatar) score += 0.18;
  if (candidate.bio && String(candidate.bio).trim().length >= 12) score += 0.16;
  if (candidate.fullName) score += 0.08;
  if (candidate.location) score += 0.08;
  if (candidate.isVerified || candidate.verifiedSubscription?.status === 'active') score += 0.2;
  if (candidate.emailVerified) score += 0.05;
  const followers = Array.isArray(candidate.followers)
    ? candidate.followers.length
    : Number(candidate.followerCount || 0);
  if (followers >= 3) score += 0.05;
  if (followers >= 20) score += 0.05;
  return clamp(score, 0, 1);
}

/**
 * Popularitet i balancuar: nxit krijuesit e mesëm, jo vetëm celebritetet.
 * curve: log1p(followers) * e^(-followers/cap)
 */
export function scorePopularity(followerCount = 0, followingCount = 0) {
  const f = Math.max(0, Number(followerCount) || 0);
  const g = Math.max(0, Number(followingCount) || 0);
  const logPop = Math.log1p(f) / Math.log1p(5000);
  const sweetSpot = Math.exp(-Math.pow((f - 80) / 220, 2));
  const ratio = g > 0 ? clamp(f / g, 0.05, 8) : f > 0 ? 2 : 0.2;
  const ratioScore = clamp(Math.log1p(ratio) / Math.log1p(8), 0, 1);
  return clamp(0.45 * logPop + 0.4 * sweetSpot + 0.15 * ratioScore, 0, 1);
}

/**
 * Sa aktiv është kandidati (0–1).
 */
export function scoreActivity(lastActiveAt, now = Date.now()) {
  if (!lastActiveAt) return 0.25;
  const ageHours = Math.max(0, (now - new Date(lastActiveAt).getTime()) / 3600000);
  if (ageHours <= 6) return 1;
  if (ageHours <= 24) return 0.85;
  if (ageHours <= 72) return 0.65;
  if (ageHours <= 168) return 0.4;
  if (ageHours <= 720) return 0.2;
  return 0.08;
}

/**
 * Llogarit një rezultat të plotë për një kandidat.
 */
export function scoreCandidate({
  viewerId,
  viewerFollowingSet,
  viewerProfile,
  candidate,
  candidateProfile,
  mutualCount = 0,
  foafCount = 0,
  seed = 'albnet',
  now = Date.now(),
} = {}) {
  const candId = idStr(candidate._id || candidate.id);
  if (!candId || candId === idStr(viewerId)) {
    return { score: -Infinity, reasons: [], breakdown: {} };
  }
  if (viewerFollowingSet?.has(candId)) {
    return { score: -Infinity, reasons: [], breakdown: {} };
  }

  const followers = Array.isArray(candidate.followers)
    ? candidate.followers.length
    : Number(candidate.followerCount || 0);
  const following = Array.isArray(candidate.following)
    ? candidate.following.length
    : Number(candidate.followingCount || 0);

  const interestSim = cosineSparse(viewerProfile?.vector || {}, candidateProfile?.vector || {});
  const tagJ = jaccard(viewerProfile?.tags || [], candidateProfile?.tags || []);
  const interest = clamp(0.7 * interestSim + 0.3 * tagJ, 0, 1);

  const sameNiche =
    viewerProfile?.nicheId &&
    candidateProfile?.nicheId &&
    viewerProfile.nicheId === candidateProfile.nicheId
      ? clamp((viewerProfile.nicheConfidence || 40) / 100, 0.3, 1)
      : 0;

  let location = 0;
  if (viewerProfile?.locationRaw && candidateProfile?.locationRaw) {
    const a = viewerProfile.locationRaw.toLowerCase();
    const b = candidateProfile.locationRaw.toLowerCase();
    if (a === b) location = 1;
    else location = jaccard(viewerProfile.locationTokens || [], candidateProfile.locationTokens || []);
  }

  const mutualNorm = clamp(mutualCount / 4, 0, 1);
  const foafNorm = clamp(foafCount / 8, 0, 1);
  const quality = scoreProfileQuality(candidate);
  const activity = scoreActivity(candidate.lastActiveAt, now);
  const popularity = scorePopularity(followers, following);
  const exploration = seededUnit(seed, candId) * 0.35 + 0.65 * (1 - popularity);

  const breakdown = {
    mutual: mutualNorm * WEIGHTS.mutual,
    foaf: foafNorm * WEIGHTS.foaf,
    interest: interest * WEIGHTS.interest,
    niche: sameNiche * WEIGHTS.niche,
    location: location * WEIGHTS.location,
    quality: quality * WEIGHTS.quality,
    activity: activity * WEIGHTS.activity,
    popularity: popularity * WEIGHTS.popularity,
    exploration: exploration * WEIGHTS.exploration,
  };

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);

  const reasons = buildReasons({
    mutualCount,
    foafCount,
    interest,
    sameNiche: sameNiche > 0,
    nicheLabel: candidateProfile?.nicheLabel || viewerProfile?.nicheLabel,
    location,
    locationLabel: candidate.location || candidateProfile?.locationRaw,
    quality,
    isVerified: !!(candidate.isVerified || candidate.verifiedSubscription?.status === 'active'),
    activity,
    followers,
  });

  return {
    score,
    reasons,
    breakdown,
    signals: {
      mutualCount,
      foafCount,
      interest: Number(interest.toFixed(3)),
      nicheMatch: sameNiche > 0,
      locationMatch: location > 0.35,
      quality: Number(quality.toFixed(3)),
      activity: Number(activity.toFixed(3)),
      popularity: Number(popularity.toFixed(3)),
    },
  };
}

function buildReasons({
  mutualCount,
  foafCount,
  interest,
  sameNiche,
  nicheLabel,
  location,
  locationLabel,
  quality,
  isVerified,
  activity,
  followers,
}) {
  const out = [];
  if (mutualCount >= 2) out.push(`Ndiqet nga ${mutualCount} miq`);
  else if (mutualCount === 1) out.push('Ndiqet nga një mik');
  else if (foafCount >= 3) out.push('I njohur në rrjetin tënd');

  if (sameNiche && nicheLabel) out.push(`Interes i ngjashëm: ${nicheLabel}`);
  else if (interest >= 0.28) out.push('Interesa të ngjashme');

  if (location >= 0.6 && locationLabel) out.push(`Afër teje · ${String(locationLabel).slice(0, 40)}`);
  if (isVerified) out.push('Profil i verifikuar');
  else if (quality >= 0.7) out.push('Profil aktiv');

  if (activity >= 0.85) out.push('Aktiv sot');
  else if (followers >= 50 && out.length < 2) out.push('Krijues në rritje');

  if (!out.length) out.push('Sugjeruar për ty');
  return out.slice(0, 2);
}

/**
 * Maximal Marginal Relevance – diversifikon listën sipas niche/location.
 */
export function diversifySuggestions(ranked, { limit = 10, lambda = 0.72 } = {}) {
  if (!ranked.length) return [];
  const selected = [];
  const remaining = [...ranked];

  while (selected.length < limit && remaining.length) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const cand = remaining[i];
      const relevance = cand.score;
      let maxSim = 0;
      for (const s of selected) {
        const sameNiche =
          cand.profile?.nicheId && cand.profile.nicheId === s.profile?.nicheId ? 0.7 : 0;
        const locSim = jaccard(cand.profile?.locationTokens || [], s.profile?.locationTokens || []);
        const tagSim = jaccard(cand.profile?.tags || [], s.profile?.tags || []);
        maxSim = Math.max(maxSim, sameNiche * 0.5 + locSim * 0.25 + tagSim * 0.25);
      }
      const mmr = lambda * relevance - (1 - lambda) * maxSim * 40;
      if (mmr > bestScore) {
        bestScore = mmr;
        bestIdx = i;
      }
    }
    selected.push(remaining.splice(bestIdx, 1)[0]);
  }
  return selected;
}

/**
 * Rankon kandidatët (pure function – i testueshëm pa DB).
 */
export function rankSuggestions({
  viewer,
  viewerProfile,
  candidates = [],
  candidateProfiles = {},
  mutualCounts = {},
  foafCounts = {},
  limit = 10,
  seed,
} = {}) {
  const viewerId = idStr(viewer?._id || viewer?.id);
  const viewerFollowingSet = new Set(
    (viewer?.following || []).map(idStr).concat(viewerId ? [viewerId] : [])
  );
  const daySeed = seed || `${viewerId}:${new Date().toISOString().slice(0, 10)}`;

  const scored = [];
  for (const candidate of candidates) {
    const cid = idStr(candidate._id || candidate.id);
    const profile = candidateProfiles[cid] || buildInterestProfile({
      bio: candidate.bio,
      location: candidate.location,
      eventCategoryInterests: candidate.eventCategoryInterests,
    });
    const result = scoreCandidate({
      viewerId,
      viewerFollowingSet,
      viewerProfile,
      candidate,
      candidateProfile: profile,
      mutualCount: mutualCounts[cid] || 0,
      foafCount: foafCounts[cid] || 0,
      seed: daySeed,
    });
    if (!Number.isFinite(result.score) || result.score < 0) continue;
    scored.push({
      ...candidate,
      score: result.score,
      reasons: result.reasons,
      reason: result.reasons[0],
      signals: result.signals,
      breakdown: result.breakdown,
      profile,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const diversified = diversifySuggestions(scored, { limit: Math.min(limit * 2, scored.length), lambda: 0.72 });
  return diversified.slice(0, limit).map((item, index) => ({
    _id: item._id,
    username: item.username,
    avatar: item.avatar,
    fullName: item.fullName,
    bio: item.bio,
    location: item.location,
    isVerified: !!(item.isVerified || item.verifiedSubscription?.status === 'active'),
    score: Number(item.score.toFixed(2)),
    reason: item.reason,
    reasons: item.reasons,
    signals: item.signals,
    rank: index + 1,
  }));
}

/**
 * Ngarkon të dhëna nga Mongo dhe kthen sugjerime të rankuara.
 */
export async function getPersonalizedSuggestions({
  User,
  Post,
  viewerId,
  limit = 10,
} = {}) {
  const safeLimit = clamp(Number(limit) || 10, 1, 30);
  const viewer = await User.findById(viewerId)
    .select('username bio location following followers eventCategoryInterests lastActiveAt')
    .lean();
  if (!viewer) return { suggestions: [], users: [], algorithm: ALGORITHM_ID };

  const followingIds = (viewer.following || []).map(idStr);
  const exclude = new Set([idStr(viewer._id), ...followingIds]);

  const viewerPosts = await Post.find({ user: viewer._id, isArchived: false })
    .sort({ createdAt: -1 })
    .limit(40)
    .select('caption hashtags')
    .lean();

  const viewerProfile = buildInterestProfile({
    bio: viewer.bio,
    location: viewer.location,
    hashtags: viewerPosts.flatMap((p) => p.hashtags || []),
    captions: viewerPosts.map((p) => p.caption || ''),
    eventCategoryInterests: viewer.eventCategoryInterests,
  });

  // Friends-of-friends: ndjekës të njerëzve që unë ndjek
  const followingUsers = followingIds.length
    ? await User.find({ _id: { $in: followingIds } })
        .select('following')
        .lean()
    : [];

  const foafCounts = {};
  for (const f of followingUsers) {
    for (const id of f.following || []) {
      const s = idStr(id);
      if (exclude.has(s)) continue;
      foafCounts[s] = (foafCounts[s] || 0) + 1;
    }
  }

  // Mutual: njerëz që ndjekin të njëjtët që ndjek unë (approx via followers of following)
  const mutualCounts = { ...foafCounts };

  const foafIds = Object.entries(foafCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 80)
    .map(([id]) => id);

  const candidateQuery = {
    isBlocked: { $ne: true },
    _id: { $nin: [...exclude] },
  };

  const CANDIDATE_PROJECTION = {
    username: 1,
    avatar: 1,
    fullName: 1,
    bio: 1,
    location: 1,
    isVerified: 1,
    verifiedSubscription: 1,
    eventCategoryInterests: 1,
    lastActiveAt: 1,
    emailVerified: 1,
    followerCount: { $size: { $ifNull: ['$followers', []] } },
    followingCount: { $size: { $ifNull: ['$following', []] } },
  };

  async function loadCandidates(match, sort, lim) {
    const pipeline = [{ $match: match }];
    if (sort) pipeline.push({ $sort: sort });
    pipeline.push({ $limit: lim }, { $project: CANDIDATE_PROJECTION });
    return User.aggregate(pipeline);
  }

  let candidates = [];
  if (foafIds.length) {
    candidates = await loadCandidates(
      { ...candidateQuery, _id: { $in: foafIds } },
      { lastActiveAt: -1 },
      80
    );
  }

  // Mbush me profile cilësore / aktive nëse nuk mjafton grafi
  if (candidates.length < safeLimit * 3) {
    const extra = await loadCandidates(candidateQuery, { lastActiveAt: -1 }, 80);
    const seen = new Set(candidates.map((c) => idStr(c._id)));
    for (const c of extra) {
      const id = idStr(c._id);
      if (seen.has(id)) continue;
      candidates.push(c);
      seen.add(id);
      if (candidates.length >= 120) break;
    }
  }

  const candIds = candidates.map((c) => c._id);
  const candPosts = candIds.length
    ? await Post.find({ user: { $in: candIds }, isArchived: false })
        .sort({ createdAt: -1 })
        .limit(400)
        .select('user caption hashtags')
        .lean()
    : [];

  const postsByUser = {};
  for (const p of candPosts) {
    const uid = idStr(p.user);
    if (!postsByUser[uid]) postsByUser[uid] = [];
    if (postsByUser[uid].length < 12) postsByUser[uid].push(p);
  }

  const candidateProfiles = {};
  for (const c of candidates) {
    const uid = idStr(c._id);
    const posts = postsByUser[uid] || [];
    candidateProfiles[uid] = buildInterestProfile({
      bio: c.bio,
      location: c.location,
      hashtags: posts.flatMap((p) => p.hashtags || []),
      captions: posts.map((p) => p.caption || ''),
      eventCategoryInterests: c.eventCategoryInterests,
    });
  }

  const ranked = rankSuggestions({
    viewer,
    viewerProfile,
    candidates,
    candidateProfiles,
    mutualCounts,
    foafCounts,
    limit: safeLimit,
  });

  return {
    suggestions: ranked,
    users: ranked,
    algorithm: ALGORITHM_ID,
    viewerNiche: {
      id: viewerProfile.nicheId,
      label: viewerProfile.nicheLabel,
      confidence: viewerProfile.nicheConfidence,
    },
  };
}

export { ALGORITHM_ID, WEIGHTS, NICHES };
