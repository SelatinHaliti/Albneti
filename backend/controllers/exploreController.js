import Post from '../models/Post.js';
import User from '../models/User.js';

/**
 * Explore - postime të reja / trending (algoritëm i thjeshtë)
 */
export const getExplorePosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 30);
    const skip = (page - 1) * limit;
    const excludeUser = req.user?.id;

    const posts = await Post.aggregate([
      { $match: { isArchived: false, ...(excludeUser ? { user: { $ne: excludeUser } } : {}) } },
      {
        $addFields: {
          score: {
            $add: [
              { $size: '$likes' },
              { $multiply: [{ $size: '$comments' }, 2] },
              { $ifNull: ['$viewCount', 0] },
            ],
          },
        },
      },
      { $sort: { score: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          'user.password': 0,
          'user.verificationToken': 0,
          'user.resetPasswordToken': 0,
        },
      },
    ]);
    res.json({ posts, hasMore: posts.length === limit });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Hashtag trending
 */
export const getTrendingHashtags = async (req, res) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const tags = await Post.aggregate([
      { $match: { createdAt: { $gte: since }, isArchived: false, hashtags: { $exists: true, $ne: [] } } },
      { $unwind: '$hashtags' },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
      { $project: { tag: '$_id', count: 1, _id: 0 } },
    ]);
    res.json({ hashtags: tags });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Postime sipas hashtag
 */
export const getPostsByHashtag = async (req, res) => {
  try {
    const tag = req.params.tag.replace(/^#/, '');
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 30);
    const skip = (page - 1) * limit;
    const posts = await Post.find({
      hashtags: new RegExp(`^${tag}$`, 'i'),
      isArchived: false,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username avatar fullName')
      .lean();
    res.json({ posts, hasMore: posts.length === limit });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Kërko hashtag sipas prefix
 */
export const searchHashtags = async (req, res) => {
  try {
    const q = (req.query.q || '').trim().replace(/^#/, '');
    if (!q) return res.json({ hashtags: [] });
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tags = await Post.aggregate([
      { $match: { createdAt: { $gte: since }, isArchived: false, hashtags: { $exists: true, $ne: [] } } },
      { $unwind: '$hashtags' },
      { $match: { hashtags: new RegExp(`^${safe}`, 'i') } },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
      { $project: { tag: '$_id', count: 1, _id: 0 } },
    ]);
    res.json({ hashtags: tags });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Sugjerime për përmbajtje / përdorues për të ndjekur
 */
export const getSuggestions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const followingSet = new Set([
      ...user.following.map((id) => id.toString()),
      user._id.toString(),
    ]);
    const suggestions = await User.find({
      _id: { $nin: Array.from(followingSet) },
      isBlocked: false,
    })
      .select('username avatar fullName')
      .limit(15)
      .lean();
    res.json({ suggestions });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};
