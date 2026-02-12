import Story from '../models/Story.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/uploadMedia.js';

const STORY_EXPIRY_HOURS = 24;

/**
 * Krijo story (zhduket pas 24 orësh)
 */
export const createStory = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ message: 'Ngarkoni një foto ose video.' });
    }
    const type = req.file.mimetype.startsWith('video') ? 'video' : 'image';
    const result = await uploadToCloudinary(
      req.file.buffer,
      'stories',
      type === 'video' ? 'video' : 'image'
    );
    const expiresAt = new Date(Date.now() + STORY_EXPIRY_HOURS * 60 * 60 * 1000);
    const story = await Story.create({
      user: req.user.id,
      type,
      mediaUrl: result.secure_url,
      publicId: result.public_id,
      expiresAt,
    });
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
      .populate('user', 'username avatar fullName')
      .lean();

    const byUser = {};
    for (const s of stories) {
      const uid = s.user._id.toString();
      if (!byUser[uid]) byUser[uid] = { user: s.user, stories: [] };
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
        await Notification.create({
          recipient: story.user,
          sender: req.user.id,
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
    await story.deleteOne();
    res.json({ success: true, message: 'Story u fshi.' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};
