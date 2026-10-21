/**
 * Teste për AlbNet Suggest Engine v2 – pa DB.
 * Run: node backend/scripts/test-suggest-algorithm.js
 */
import {
  buildInterestProfile,
  scoreProfileQuality,
  scorePopularity,
  scoreActivity,
  scoreCandidate,
  diversifySuggestions,
  rankSuggestions,
  ALGORITHM_ID,
} from '../services/suggestAlgorithm.js';
import {
  timeDecay,
  engagementScore,
  interestAffinity,
  scorePostForUser,
  rankPosts,
} from '../services/feedAlgorithm.js';

let passed = 0;
let failed = 0;

function assert(name, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('\nAlbNet Suggest Engine v2 – teste\n');

console.log('buildInterestProfile');
const foodProfile = buildInterestProfile({
  bio: 'Gatime shqiptare dhe byrek',
  location: 'Tirana',
  hashtags: ['byrek', 'ushqim', 'tirana'],
  captions: ['Sot gatova byrek me recetë të gjyshes'],
});
assert('niche food nga bio/hashtag', foodProfile.nicheId === 'food', foodProfile.nicheId);
assert('ka location tokens', foodProfile.locationTokens.includes('tirana'));
assert('ka tags', foodProfile.tags.includes('byrek') || foodProfile.tags.includes('ushqim'));

console.log('scoreProfileQuality / popularity / activity');
assert(
  'verified + bio + avatar = cilësi e lartë',
  scoreProfileQuality({
    avatar: 'x',
    bio: 'Krijues nga Prishtina',
    fullName: 'Ana',
    location: 'Prishtina',
    isVerified: true,
    followerCount: 40,
  }) > 0.7
);
assert('popularitet sweet-spot > zero', scorePopularity(80, 40) > 0.3);
assert('celebritet ekstrem jo maksimal absolut', scorePopularity(200000, 10) < 0.95);
assert('aktiv sot ~1', scoreActivity(new Date(), Date.now()) >= 0.95);
assert('inaktiv 30 ditë i ulët', scoreActivity(new Date(Date.now() - 40 * 86400000), Date.now()) < 0.25);

console.log('scoreCandidate');
const viewer = {
  _id: 'v1',
  following: ['f1', 'f2'],
};
const viewerProfile = buildInterestProfile({
  bio: 'diaspora në zvicër, malli për shtëpi',
  location: 'Zurich',
  hashtags: ['diaspora', 'shqiperi'],
  captions: ['malli për shtëpi'],
});
const friendOfFriend = {
  _id: 'c1',
  username: 'arta',
  avatar: 'a',
  bio: 'Jetoj në zvicër, diaspora shqiptare',
  location: 'Zurich',
  isVerified: true,
  followers: new Array(60),
  following: new Array(40),
  lastActiveAt: new Date(),
};
const friendProfile = buildInterestProfile({
  bio: friendOfFriend.bio,
  location: friendOfFriend.location,
  hashtags: ['diaspora', 'zurich'],
  captions: ['malli për shtëpi'],
});
const scored = scoreCandidate({
  viewerId: 'v1',
  viewerFollowingSet: new Set(['v1', 'f1', 'f2']),
  viewerProfile,
  candidate: friendOfFriend,
  candidateProfile: friendProfile,
  mutualCount: 3,
  foafCount: 5,
  seed: 'test',
});
assert('score pozitiv për kandidat të mirë', scored.score > 40, String(scored.score));
assert('ka arsye shqip', scored.reasons.length >= 1 && /mik|interes|verifik/i.test(scored.reasons.join(' ')));
assert('nuk sugjeron veten', scoreCandidate({
  viewerId: 'v1',
  viewerFollowingSet: new Set(['v1']),
  viewerProfile,
  candidate: { _id: 'v1' },
  candidateProfile: viewerProfile,
}).score === -Infinity);

console.log('rankSuggestions + diversify');
const candidates = [
  { _id: 'a', username: 'a', bio: 'byrek ushqim', location: 'Tirana', followers: [1, 2, 3], following: [1], lastActiveAt: new Date(), avatar: 'x' },
  { _id: 'b', username: 'b', bio: 'byrek gatime', location: 'Tirana', followers: [1, 2], following: [1], lastActiveAt: new Date(), avatar: 'x' },
  { _id: 'c', username: 'c', bio: 'futboll sport', location: 'Prishtina', followers: [1, 2, 3, 4], following: [1], lastActiveAt: new Date(), avatar: 'x', isVerified: true },
  { _id: 'd', username: 'd', bio: 'valle dasma', location: 'Durrës', followers: [1], following: [1], lastActiveAt: new Date(), avatar: 'x' },
  { _id: 'e', username: 'e', bio: 'diaspora zvicër', location: 'Bern', followers: [1, 2, 3], following: [1], lastActiveAt: new Date(), avatar: 'x' },
];
const ranked = rankSuggestions({
  viewer: { _id: 'v1', following: [], bio: 'ushqim shqiptar', location: 'Tirana' },
  viewerProfile: buildInterestProfile({ bio: 'ushqim byrek', location: 'Tirana', hashtags: ['byrek'] }),
  candidates,
  mutualCounts: { a: 2, c: 1, e: 4 },
  foafCounts: { a: 3, b: 1, c: 2, e: 6 },
  limit: 4,
  seed: 'unit-test',
});
assert('kthen deri në limit', ranked.length === 4, String(ranked.length));
assert('ka reason', ranked.every((r) => r.reason));
assert('ka algorithm id export', ALGORITHM_ID === 'albnet_suggest_v2');
assert(
  'diversitet: jo vetëm food',
  new Set(ranked.map((r) => r._id)).size === ranked.length
);

const diversified = diversifySuggestions(
  [
    { score: 90, profile: { nicheId: 'food', tags: ['a'], locationTokens: ['t'] } },
    { score: 88, profile: { nicheId: 'food', tags: ['a'], locationTokens: ['t'] } },
    { score: 70, profile: { nicheId: 'sports', tags: ['b'], locationTokens: ['p'] } },
  ],
  { limit: 2, lambda: 0.5 }
);
assert('MMR preferon diversitet', diversified[0].profile.nicheId !== diversified[1].profile.nicheId
  || diversified.length === 2);

console.log('feedAlgorithm v2');
assert('timeDecay 0h = 1', timeDecay(0) === 1);
assert('timeDecay half-life ~0.5', Math.abs(timeDecay(18, 18) - 0.5) < 0.01);
assert('engagement log', engagementScore({ likes: [1, 2], comments: [{}, {}], viewCount: 100 }) > 0);
assert(
  'interest affinity',
  interestAffinity({ hashtags: ['byrek', 'tirana'] }, ['byrek']) >= 9
);
const posts = [
  { _id: 'p1', user: 'u1', createdAt: new Date(), likes: [1], comments: [], hashtags: ['byrek'], type: 'image' },
  { _id: 'p2', user: 'u1', createdAt: new Date(Date.now() - 3600000), likes: [1, 2], comments: [], hashtags: [], type: 'image' },
  { _id: 'p3', user: 'u2', createdAt: new Date(), likes: [1, 2, 3], comments: [{}], hashtags: ['shqip'], type: 'reel', music: { url: 'm' } },
];
const rankedPosts = rankPosts(posts, { following: ['u2'] }, {}, { diversify: true });
assert('rankPosts kthen 3', rankedPosts.length === 3);
assert(
  'following + reel merr boost',
  scorePostForUser(posts[2], { following: ['u2'] }, { isVerified: true }) >
    scorePostForUser(posts[0], { following: [] }, {})
);

console.log(`\nRezultati: ${passed} kaluan, ${failed} dështuan\n`);
process.exit(failed ? 1 : 0);
