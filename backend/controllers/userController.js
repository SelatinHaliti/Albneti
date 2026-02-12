import User from '../models/User.js';
import Post from '../models/Post.js';
import Notification from '../models/Notification.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/uploadMedia.js';

/**
 * Merr profilin e një përdoruesi (me username)
 */
export const getProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username, isBlocked: false })
      .select('-password -verificationToken -resetPasswordToken')
      .populate('followers', 'username avatar fullName')
      .populate('following', 'username avatar fullName');
    if (!user) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }
    const posts = await Post.find({ user: user._id, isArchived: false })
      .sort({ createdAt: -1 })
      .populate('user', 'username avatar fullName')
      .lean();
    const isFollowing =
      req.user &&
      user.followers.some((f) => f._id.toString() === req.user.id);
    res.json({
      user,
      posts,
      isFollowing: !!isFollowing,
      isOwnProfile: req.user?.id === user._id.toString(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Përditëso profilin (foto, bio, vendndodhje, faqja e internetit)
 */
export const updateProfile = async (req, res) => {
  try {
    const { fullName, bio, website, location, isPrivate } = req.body;
    const user = await User.findById(req.user.id).select('+avatarPublicId');
    if (!user) return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });

    if (fullName !== undefined) user.fullName = String(fullName || '').trim().slice(0, 50);
    if (bio !== undefined) user.bio = String(bio || '').trim().slice(0, 150);
    if (website !== undefined) user.website = String(website || '').trim().slice(0, 200);
    if (location !== undefined) user.location = String(location || '').trim().slice(0, 100);
    if (isPrivate !== undefined) user.isPrivate = isPrivate === true || isPrivate === 'true';

    if (req.file?.buffer) {
      const result = await uploadToCloudinary(
        req.file.buffer,
        'avatars',
        'image'
      );
      if (user.avatarPublicId) {
        try {
          await deleteFromCloudinary(user.avatarPublicId, 'image');
        } catch (_) {}
      }
      user.avatar = result.secure_url;
      user.avatarPublicId = result.public_id || '';
    }
    await user.save();

    const out = {
      id: user._id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      avatar: user.avatar,
      bio: user.bio,
      website: user.website,
      location: user.location,
      isPrivate: user.isPrivate,
      isVerified: user.isVerified,
      role: user.role,
    };
    res.json({ success: true, user: out });
  } catch (err) {
    const msg = err.name === 'ValidationError' && err.message
      ? err.message
      : (err.message || 'Gabim gjatë ruajtjes së profilit.');
    const status = err.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ message: msg });
  }
};

/**
 * Follow / Unfollow
 */
export const toggleFollow = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = await User.findById(req.user.id);
    const targetUser = await User.findById(userId);
    if (!targetUser || !currentUser) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }
    if (targetUser.id === currentUser.id) {
      return res.status(400).json({ message: 'Nuk mund të ndiqni veten.' });
    }

    const isFollowing = currentUser.following.some(
      (id) => id.toString() === userId
    );
    if (isFollowing) {
      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== userId
      );
      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== req.user.id
      );
    } else {
      currentUser.following.push(userId);
      targetUser.followers.push(req.user.id);
      await Notification.create({
        recipient: targetUser._id,
        sender: req.user.id,
        type: 'follow',
      });
    }
    await currentUser.save();
    await targetUser.save();
    res.json({
      success: true,
      isFollowing: !isFollowing,
      followersCount: targetUser.followers.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Kërko përdorues
 */
export const searchUsers = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q || q.length < 2) {
      return res.json({ users: [] });
    }
    const users = await User.find({
      isBlocked: false,
      _id: { $ne: req.user.id },
      $or: [
        { username: new RegExp(q, 'i') },
        { fullName: new RegExp(q, 'i') },
      ],
    })
      .select('username avatar fullName')
      .limit(parseInt(limit, 10))
      .lean();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Postimet e ruajtura të përdoruesit aktual
 */
export const getSavedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('savedPosts').lean();
    const ids = (user?.savedPosts || []).map((id) => id.toString());
    if (ids.length === 0) return res.json({ posts: [] });
    const posts = await Post.find({ _id: { $in: ids }, isArchived: false })
      .populate('user', 'username avatar fullName')
      .lean();
    const orderMap = ids.reduce((acc, id, i) => ({ ...acc, [id]: i }), {});
    posts.sort((a, b) => (orderMap[a._id.toString()] ?? 0) - (orderMap[b._id.toString()] ?? 0));
    posts.forEach((p) => { p.saved = true; });
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Postimet ku përdoruesi aktual është përmendur (tagged)
 */
export const getTaggedPosts = async (req, res) => {
  try {
    const posts = await Post.find({
      mentions: req.user.id,
      isArchived: false,
    })
      .sort({ createdAt: -1 })
      .populate('user', 'username avatar fullName')
      .lean();
    const user = await User.findById(req.user.id).select('savedPosts').lean();
    const savedSet = new Set((user?.savedPosts || []).map((id) => id.toString()));
    posts.forEach((p) => { p.saved = savedSet.has(p._id.toString()); });
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Blloko / Zhblloko përdorues
 */
export const toggleBlock = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(req.user.id);
    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });

    const isBlocked = user.blockedUsers.some((id) => id.toString() === userId);
    if (isBlocked) {
      user.blockedUsers = user.blockedUsers.filter((id) => id.toString() !== userId);
    } else {
      user.blockedUsers.push(userId);
      user.following = user.following.filter((id) => id.toString() !== userId);
      user.followers = user.followers.filter((id) => id.toString() !== userId);
      target.following = target.following.filter((id) => id.toString() !== user.id);
      target.followers = target.followers.filter((id) => id.toString() !== user.id);
      await target.save();
    }
    await user.save();
    res.json({ success: true, isBlocked: !isBlocked });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};
