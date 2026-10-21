/**
 * Unit tests for AlbNet Smart Search ranking.
 */
import { rankSearchUsers, buildUserSearchQuery, SEARCH_ALGORITHM_ID } from '../services/searchRank.js';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log('\nAlbNet Smart Search v2\n');

const viewers = { following: ['m1', 'm2'] };
const users = [
  { _id: '1', username: 'xarda', fullName: 'Arda Kola', followers: ['m1'], lastActiveAt: new Date() },
  { _id: '2', username: 'ardian', fullName: 'Ardian', isVerified: true, followers: ['x'], lastActiveAt: new Date(Date.now() - 10 * 3600000) },
  { _id: '3', username: 'besarta', fullName: 'Besarta Arda', followers: [], lastActiveAt: new Date(Date.now() - 400 * 3600000) },
  {
    _id: '4',
    username: 'arda',
    fullName: 'Exact Match',
    followers: ['m1', 'm2', 'm3'],
    isVerified: true,
    lastActiveAt: new Date(),
  },
];

const ranked = rankSearchUsers(users, 'arda', viewers);
assert(ranked[0]._id === '4', 'Exact username + verified + mutual ranks first');
assert(ranked.findIndex((u) => u._id === '3') > ranked.findIndex((u) => u._id === '1'), 'Weak mid-name ranks below stronger');

const q = buildUserSearchQuery('arda', 'viewer');
assert(q.isBlocked === false, 'Query excludes blocked');
assert(Array.isArray(q.$or) && q.$or.length === 2, 'Query searches username + fullName');
assert(SEARCH_ALGORITHM_ID === 'albnet_search_v2', 'Algorithm id set');

const prefixRank = rankSearchUsers(
  [
    { _id: 'a', username: 'xarda', fullName: '', followers: [], lastActiveAt: new Date() },
    { _id: 'b', username: 'arda99', fullName: '', followers: [], lastActiveAt: new Date() },
  ],
  'arda',
  { following: [] }
);
assert(prefixRank[0]._id === 'b', 'Prefix match beats substring');

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
