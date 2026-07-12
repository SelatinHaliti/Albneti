import Story from '../models/Story.js';
import User from '../models/User.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/uploadMedia.js';
import { dispatchSocialNotification } from '../services/notificationService.js';

const STORY_EXPIRY_HOURS = 24;

function parseMusicFromRequest(req) {
  const { music, musicData, musicUrl, musicTitle, musicArtist } = req.body;
  const musicFile = req.files?.music?.[0];
  if (musicFile) {
    return uploadToCloudinary(musicFile.buffer, 'music', 'raw').then((result) => ({
      url: result.secure_url,
      publicId: result.public_id,
      title: (musicTitle || 'Muzikë').toString().trim().slice(0, 200) || 'Muzikë',
      artist: (musicArtist || '').toString().trim().slice(0, 200) || '',
    }));
  }
  const directUrl = musicUrl ? String(musicUrl).trim() : '';
  if (directUrl.startsWith('http')) {
    return Promise.resolve({
      url: directUrl.slice(0, 2000),
      title: (musicTitle || 'Muzikë').toString().trim().slice(0, 200) || 'Muzikë',
      artist: (musicArtist || '').toString().trim().slice(0, 200) || '',
    });
  }
  const raw = musicData || music;
  if (raw) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed?.url) {
        return Promise.resolve({
          url: String(parsed.url).trim().slice(0, 2000),
          title: (parsed.title || musicTitle || 'Muzikë').toString().trim().slice(0, 200) || 'Muzikë',
          artist: (parsed.artist || musicArtist || '').toString().trim().slice(0, 200) || '',
        });
      }
    } catch (_) {}
  }
  return Promise.resolve(undefined);
}

/**
 * Krijo story (zhduket pas 24 orësh) me muzikë opsionale
 */
export const createStory = async (req, res) => {
  try {
    const mediaFile = req.files?.media?.[0] || req.file;
    if (!mediaFile?.buffer) {
      return res.status(400).json({ message: 'Ngarkoni një foto ose video.' });
    }
    const type = mediaFile.mimetype.startsWith('video') ? 'video' : 'image';
    const result = await uploadToCloudinary(
      mediaFile.buffer,
      'stories',
      type === 'video' ? 'video' : 'image'
    );
    const musicData = await parseMusicFromRequest(req);
    const expiresAt = new Date(Date.now() + STORY_EXPIRY_HOURS * 60 * 60 * 1000);
    const audience = req.body.audience === 'close_friends' ? 'close_friends' : 'public';
    const storyPayload = {
      user: req.user.id,
      type,
      mediaUrl: result.secure_url,
      publicId: result.public_id,
      expiresAt,
      audience,
    };
    if (musicData?.url) storyPayload.music = musicData;
    const story = await Story.create(storyPayload);
    const populated = await Story.findById(story._id).populate(
      'user',
      'username avatar fullName'
    );
    res.status(201).json({ success: true, story: populated });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Merr story-t aktive të përdoruesve që ndjek (për faqen kryesore)
 */
export const getActiveStories = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const followingIds = [...user.following.map((id) => id.toString()), user._id.toString()];

    const stories = await Story.find({
      user: { $in: followingIds },
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .populate('user', 'username avatar fullName closeFriends')
      .lean();

    const filtered = stories.filter((s) => {
      const ownerId = s.user._id.toString();
      if (ownerId === req.user.id) return true;
      if (s.audience === 'close_friends') {
        const ownerCloseFriends = (s.user.closeFriends || []).map((id) => id.toString());
        return ownerCloseFriends.includes(req.user.id);
      }
      return true;
    });

    const byUser = {};
    for (const s of filtered) {
      const uid = s.user._id.toString();
      if (!byUser[uid]) {
        const hasCloseFriendsOnly = filtered.some(
          (st) => st.user._id.toString() === uid && st.audience === 'close_friends'
        );
        byUser[uid] = {
          user: s.user,
          stories: [],
          hasCloseFriendsOnly,
        };
      }
      byUser[uid].stories.push(s);
    }
    const list = Object.values(byUser).map((g) => ({
      ...g,
      stories: g.stories.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    }));
    res.json({ stories: list });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Shëno story si të parë
 */
export const viewStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story nuk u gjet.' });
    if (!story.views.some((id) => id.toString() === req.user.id)) {
      story.views.push(req.user.id);
      await story.save();
      if (story.user.toString() !== req.user.id) {
        void dispatchSocialNotification({
          recipientId: story.user,
          senderId: req.user.id,
          type: 'story_view',
          story: story._id,
        });
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Fshi story
 */
export const deleteStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story nuk u gjet.' });
    if (story.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Nuk keni leje.' });
    }
    if (story.publicId) {
      try {
        await deleteFromCloudinary(
          story.publicId,
          story.type === 'video' ? 'video' : 'image'
        );
      } catch (_) {}
    }
    if (story.music?.publicId) {
      try {
        await deleteFromCloudinary(story.music.publicId, 'raw');
      } catch (_) {}
    }
    await story.deleteOne();
    res.json({ success: true, message: 'Story u fshi.' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Kush e ka parë story-n (vetëm pronari)
 */
export const getStoryViewers = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate('views', 'username avatar fullName isVerified')
      .lean();
    if (!story) return res.status(404).json({ message: 'Story nuk u gjet.' });
    if (story.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Nuk keni leje.' });
    }
    res.json({
      viewers: (story.views || []).map((v) => ({
        _id: String(v._id),
        username: v.username,
        avatar: v.avatar,
        fullName: v.fullName,
        isVerified: !!v.isVerified,
      })),
      count: story.views?.length || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};
