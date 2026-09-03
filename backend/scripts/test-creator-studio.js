/**
 * Teste për Creator Studio – motor lokal, pa DB dhe pa API key.
 * Run: node backend/scripts/test-creator-studio.js
 */
import {
  detectNiche,
  culturalMoments,
  scoreVirality,
  selectIdeas,
  rewriteCaptionLocal,
  analyzePosts,
  creatorLevel,
  getBestPostingWindows,
  buildStudioPayload,
  suggestForDraft,
  buildCalendar,
  NICHES,
} from '../services/creatorStudioService.js';

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

console.log('\nAlbNet Creator Studio – teste\n');

console.log('detectNiche');
assert('ushqim nga receta byrek', detectNiche('Sot gatova byrek me recetë të gjyshes').id === 'food');
assert('diaspora nga malli', detectNiche('malli për shtëpi, diaspora në zvicër').id === 'diaspora');
assert('kthen fallback me confidence', detectNiche('xyz').confidence >= 18);

console.log('culturalMoments');
const sept = culturalMoments(new Date('2026-09-03T12:00:00Z'));
assert('shtatori ka momente', sept.length >= 1, JSON.stringify(sept.map((m) => m.title)));
assert('përfshin fillimin e shkollës ose Nënën Terezë', sept.some((m) => /shkoll|Terez|vjesht/i.test(m.title)));
const nov = culturalMoments(new Date('2026-11-28T12:00:00Z'));
assert('28 nëntor është Dita e Flamurit', nov.some((m) => /Flamur/i.test(m.title)));

console.log('scoreVirality');
const high = scoreVirality({ format: 'hook_story_cta', durationSec: 12, hashtagHits: 2, cultural: true, hasQuestion: true, musicTrending: true });
const low = scoreVirality({ format: 'storytelling', durationSec: 90, hashtagHits: 0 });
assert('score 32–98', high >= 32 && high <= 98 && low >= 32 && low <= 98);
assert('hook i shkurtër score-on më lart', high > low, `${high} vs ${low}`);

console.log('selectIdeas');
const ideas = selectIdeas({ nicheId: 'food', seed: 'test-1', trendingHashtags: [{ tag: 'byrek', count: 4 }], limit: 5 });
assert('kthen 5 ide', ideas.length === 5);
assert('ka hook, caption, hashtag, script', ideas.every((i) => i.hook && i.caption && i.hashtags.length && i.script.length >= 2));
assert('hashtag përfshin albnet', ideas[0].hashtags.includes('albnet'));
assert('virality numër', ideas.every((i) => typeof i.virality === 'number'));

console.log('rewriteCaptionLocal');
const caps = rewriteCaptionLocal({ caption: 'sot në plazh në Sarandë', tone: 'viral', trendingHashtags: [{ tag: 'saranda' }] });
assert('3 variante', caps.variants.length === 3);
assert('ton viral', caps.variants[0].tone === 'viral');
assert('caption ka CTA', caps.variants.every((v) => v.cta && v.caption.includes(v.cta)));

console.log('analyzePosts + level');
const posts = [
  { type: 'reel', caption: 'valle', hashtags: ['dasma'], likes: [1, 2, 3, 4], comments: [{}, {}], createdAt: new Date('2026-09-02T18:40:00Z') },
  { type: 'image', caption: 'kafe', hashtags: ['tirana'], likes: [1], comments: [], createdAt: new Date('2026-09-01T12:10:00Z') },
];
const insights = analyzePosts(posts);
assert('2 postime', insights.total === 2);
assert('video ratio 50%', insights.videoRatio === 50);
assert('top hashtag', insights.topHashtags[0]?.tag === 'dasma' || insights.topHashtags.some((t) => t.tag === 'tirana'));
const level = creatorLevel(insights, 40);
assert('score dhe nivel', level.score >= 8 && level.score <= 99 && level.level && level.next);

console.log('windows + calendar');
const windows = getBestPostingWindows(insights);
assert('ka dritare postimi', windows.length >= 2 && windows[0].hours);
const cal = buildCalendar(new Date('2026-09-03T10:00:00Z'), 'seed', [{ tag: 'shtator' }]);
assert('7 ditë', cal.length === 7);
assert('sot + nesër', cal[0].label === 'Sot' && cal[1].label === 'Nesër');
assert('çdo ditë ka ide', cal.every((d) => d.idea?.title));

console.log('buildStudioPayload');
const studio = buildStudioPayload({
  user: { username: 'test', bio: 'krijues nga tirana', followers: [1, 2, 3] },
  posts,
  trendingHashtags: [{ tag: 'shqiperi', count: 10 }],
  now: new Date('2026-09-03T10:00:00Z'),
});
assert('ide 6+', studio.ideas.length >= 6);
assert('insights.score', studio.insights.score >= 8);
assert('niches të plota', studio.niches.length === NICHES.length);
assert('source studio', studio.source === 'studio');

console.log('suggestForDraft');
const sug = suggestForDraft({
  caption: 'malli për nënën time në kosovë',
  type: 'reel',
  user: { username: 'a' },
  posts,
  trendingHashtags: [{ tag: 'kosove', count: 5 }],
  now: new Date('2026-09-03T10:00:00Z'),
});
assert('niche diaspora/family/patriot', ['diaspora', 'family', 'patriot'].includes(sug.niche.id), sug.niche.id);
assert('hook i gatshëm', Boolean(sug.hook));
assert('5 ide', sug.ideas.length === 5);
assert('ka posting window', Boolean(sug.postingWindow?.hours));

console.log(`\n${passed} kaluan, ${failed} dështuan\n`);
if (failed) process.exit(1);
