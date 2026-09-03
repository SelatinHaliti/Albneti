import Post from '../models/Post.js';
import {
  buildStudioPayload,
  suggestForDraft,
  rewriteCaptionLocal,
  enhanceWithAi,
  getStudioAiStatus,
} from '../services/creatorStudioService.js';

const trendCache = { at: 0, tags: [] };
const TREND_TTL = 3 * 60 * 1000;

async function getTrendingHashtags() {
  if (Date.now() - trendCache.at < TREND_TTL && trendCache.tags.length) {
    return trendCache.tags;
  }
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  try {
    const tags = await Post.aggregate([
      { $match: { createdAt: { $gte: since }, isArchived: false, hashtags: { $exists: true, $ne: [] } } },
      { $unwind: '$hashtags' },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 16 },
      { $project: { tag: '$_id', count: 1, _id: 0 } },
    ]);
    trendCache.tags = tags.length
      ? tags
      : [
          { tag: 'shqiperi', count: 12 },
          { tag: 'diaspora', count: 9 },
          { tag: 'reels', count: 8 },
          { tag: 'tirana', count: 7 },
          { tag: 'kosove', count: 6 },
          { tag: 'humorshqip', count: 5 },
        ];
    trendCache.at = Date.now();
  } catch {
    trendCache.tags = [
      { tag: 'shqiperi', count: 12 },
      { tag: 'albnet', count: 8 },
      { tag: 'reels', count: 7 },
    ];
    trendCache.at = Date.now();
  }
  return trendCache.tags;
}

async function getUserPosts(userId) {
  return Post.find({ user: userId, isArchived: false })
    .sort({ createdAt: -1 })
    .limit(40)
    .select('type caption hashtags likes comments createdAt media music viewCount')
    .lean();
}

/**
 * Dashboard i plotë i Creator Studio
 */
export const getStudio = async (req, res) => {
  try {
    const nicheId = (req.query.niche || '').toString().trim() || undefined;
    const [posts, trendingHashtags] = await Promise.all([
      getUserPosts(req.user.id),
      getTrendingHashtags(),
    ]);
    const payload = buildStudioPayload({
      user: req.user,
      posts,
      trendingHashtags,
      nicheId,
    });
    const ai = getStudioAiStatus();
    res.json({ success: true, ...payload, ai });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim në studio.' });
  }
};

/**
 * Sugjerime në kohë reale ndërsa useri shkruan / zgjedh video
 */
export const postSuggest = async (req, res) => {
  try {
    const caption = String(req.body?.caption || '').slice(0, 2200);
    const type = ['reel', 'video', 'image'].includes(req.body?.type) ? req.body.type : 'reel';
    const niche = String(req.body?.niche || '').slice(0, 40) || undefined;
    const mood = ['viral', 'emotional', 'funny', 'professional'].includes(req.body?.mood)
      ? req.body.mood
      : 'viral';
    const enhance = req.body?.enhance !== false;

    const [posts, trendingHashtags] = await Promise.all([
      getUserPosts(req.user.id),
      getTrendingHashtags(),
    ]);

    let payload = suggestForDraft({
      caption,
      type,
      niche,
      mood,
      user: req.user,
      posts,
      trendingHashtags,
    });

    if (enhance) {
      payload = await enhanceWithAi(payload, { caption, type });
    }

    res.json({ success: true, ...payload, ai: getStudioAiStatus() });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim gjatë sugjerimit.' });
  }
};

/**
 * Rishkruan caption në 3 tone
 */
export const postCaption = async (req, res) => {
  try {
    const caption = String(req.body?.caption || '').slice(0, 2200);
    const tone = ['viral', 'emotional', 'funny', 'professional'].includes(req.body?.tone)
      ? req.body.tone
      : 'viral';
    const trendingHashtags = await getTrendingHashtags();
    const result = rewriteCaptionLocal({ caption, tone, trendingHashtags });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim te caption.' });
  }
};
