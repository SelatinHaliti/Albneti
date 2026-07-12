import User from '../models/User.js';
import Post from '../models/Post.js';
import { dispatchSocialNotification } from '../services/notificationService.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/uploadMedia.js';

const USER_LIST_FIELDS = 'username avatar fullName isVerified isPrivate';

function canViewFollowLists(viewerId, targetUser, isFollowing) {
  const isOwn = viewerId && viewerId === targetUser._id.toString();
  if (isOwn) return true;
  if (!targetUser.isPrivate) return true;
  return !!isFollowing;
}

function enrichFollowUsers(list, viewerId, viewerFollowingSet) {
  return list.map((u) => ({
    _id: String(u._id),
    username: u.username,
    fullName: u.fullName,
    avatar: u.avatar,
    isVerified: !!u.isVerified,
    isPrivate: !!u.isPrivate,
    isFollowing: viewerFollowingSet?.has(u._id.toString()) ?? false,
    followRequestPending: false,
    isOwn: viewerId === u._id.toString(),
  }));
}

/**
 * Merr profilin e një përdoruesi (me username)
 */
export const getProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username, isBlocked: false })
      .select('-password -verificationToken -resetPasswordToken')
      .populate('followers', USER_LIST_FIELDS)
      .populate('following', USER_LIST_FIELDS);
    if (!user) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }
    const isFollowing =
      req.user &&
      user.followers.some((f) => f._id.toString() === req.user.id);
    const isOwnProfile = req.user?.id === user._id.toString();
    const followRequestPending =
      req.user &&
      !isFollowing &&
      !isOwnProfile &&
      (user.followRequests || []).some((id) => id.toString() === req.user.id);
    const canViewLists = canViewFollowLists(req.user?.id, user, isFollowing);

    let posts = [];
    let isPrivateLocked = false;
    if (isOwnProfile || !user.isPrivate || isFollowing) {
      posts = await Post.find({ user: user._id, isArchived: false })
        .sort({ createdAt: -1 })
        .populate('user', 'username avatar fullName isVerified')
        .lean();
    } else {
      isPrivateLocked = true;
    }

    let followRequests = [];
    if (isOwnProfile) {
      const pending = await User.find({ _id: { $in: user.followRequests || [] } })
        .select(USER_LIST_FIELDS)
        .lean();
      followRequests = pending.map((u) => ({
        _id: String(u._id),
        username: u.username,
        fullName: u.fullName,
        avatar: u.avatar,
        isVerified: !!u.isVerified,
      }));
    }

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        avatar: user.avatar,
        bio: user.bio,
        website: user.website,
        location: user.location,
        isVerified: user.isVerified,
        isPrivate: user.isPrivate,
        followersCount: user.followers?.length || 0,
        followingCount: user.following?.length || 0,
        followers: canViewLists ? user.followers : undefined,
        following: canViewLists ? user.following : undefined,
        verifiedSubscription: user.verifiedSubscription,
      },
      posts,
      isFollowing: !!isFollowing,
      isOwnProfile,
      isPrivateLocked,
      followRequestPending: !!followRequestPending,
      canViewFollowLists: canViewLists,
      followRequests,
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
    const hasRequested = (targetUser.followRequests || []).some(
      (id) => id.toString() === req.user.id
    );

    if (isFollowing) {
      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== userId
      );
      targetUser.followers = targetUser.followers.filter(
        (id) => id.toString() !== req.user.id
      );
      targetUser.followRequests = (targetUser.followRequests || []).filter(
        (id) => id.toString() !== req.user.id
      );
    } else if (hasRequested) {
      targetUser.followRequests = (targetUser.followRequests || []).filter(
        (id) => id.toString() !== req.user.id
      );
    } else if (targetUser.isPrivate) {
      if (!hasRequested) {
        targetUser.followRequests = targetUser.followRequests || [];
        targetUser.followRequests.push(req.user.id);
        void dispatchSocialNotification({
          recipientId: targetUser._id,
          senderId: req.user.id,
          type: 'follow',
          text: 'kërkoi të të ndjekë',
        });
      }
    } else {
      currentUser.following.push(userId);
      targetUser.followers.push(req.user.id);
      void dispatchSocialNotification({
        recipientId: targetUser._id,
        senderId: req.user.id,
        type: 'follow',
      });
    }
    await currentUser.save();
    await targetUser.save();

    const nowFollowing = currentUser.following.some((id) => id.toString() === userId);
    const requestPending = (targetUser.followRequests || []).some(
      (id) => id.toString() === req.user.id
    );

    res.json({
      success: true,
      isFollowing: nowFollowing,
      followRequestPending: requestPending,
      followersCount: targetUser.followers.length,
      followingCount: currentUser.following.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Lista e ndjekësve
 */
export const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 50);
    const q = String(req.query.q || '').trim().toLowerCase();

    const user = await User.findById(userId)
      .select('followers following isPrivate username')
      .populate({
        path: 'followers',
        select: USER_LIST_FIELDS,
        options: { sort: { username: 1 } },
      });
    if (!user) return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });

    const isFollowing = user.followers.some((f) => f._id.toString() === req.user.id);
    if (!canViewFollowLists(req.user.id, user, isFollowing)) {
      return res.status(403).json({ message: 'Ky profil është privat.' });
    }

    let list = user.followers || [];
    if (q) {
      list = list.filter(
        (u) =>
          u.username?.toLowerCase().includes(q) ||
          u.fullName?.toLowerCase().includes(q)
      );
    }
    const total = list.length;
    const skip = (page - 1) * limit;
    const slice = list.slice(skip, skip + limit);
    const viewer = await User.findById(req.user.id).select('following').lean();
    const followingSet = new Set((viewer?.following || []).map((id) => id.toString()));
    const users = enrichFollowUsers(slice, req.user.id, followingSet);

    res.json({ users, total, page, hasMore: skip + slice.length < total });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Lista e ndjekjeve
 */
export const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 50);
    const q = String(req.query.q || '').trim().toLowerCase();

    const user = await User.findById(userId)
      .select('followers following isPrivate username')
      .populate({
        path: 'following',
        select: USER_LIST_FIELDS,
        options: { sort: { username: 1 } },
      });
    if (!user) return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });

    const viewer = await User.findById(req.user.id).select('following').lean();
    const isFollowing = (viewer?.following || []).some((id) => id.toString() === userId);
    if (!canViewFollowLists(req.user.id, user, isFollowing)) {
      return res.status(403).json({ message: 'Ky profil është privat.' });
    }

    let list = user.following || [];
    if (q) {
      list = list.filter(
        (u) =>
          u.username?.toLowerCase().includes(q) ||
          u.fullName?.toLowerCase().includes(q)
      );
    }
    const total = list.length;
    const skip = (page - 1) * limit;
    const slice = list.slice(skip, skip + limit);
    const followingSet = new Set((viewer?.following || []).map((id) => id.toString()));
    const users = enrichFollowUsers(slice, req.user.id, followingSet);

    res.json({ users, total, page, hasMore: skip + slice.length < total });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Kërkesat e pritshme për të ndjekur (llogaria private)
 */
export const getFollowRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('followRequests').lean();
    const ids = user?.followRequests || [];
    if (ids.length === 0) return res.json({ requests: [] });

    const requests = await User.find({ _id: { $in: ids } })
      .select(USER_LIST_FIELDS)
      .lean();

    res.json({
      requests: requests.map((u) => ({
        _id: String(u._id),
        username: u.username,
        fullName: u.fullName,
        avatar: u.avatar,
        isVerified: !!u.isVerified,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Prano kërkesë ndjekjeje
 */
export const acceptFollowRequest = async (req, res) => {
  try {
    const { requesterId } = req.params;
    const user = await User.findById(req.user.id);
    const requester = await User.findById(requesterId);
    if (!user || !requester) {
      return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });
    }

    const hasRequest = (user.followRequests || []).some((id) => id.toString() === requesterId);
    if (!hasRequest) {
      return res.status(400).json({ message: 'Kërkesa nuk ekziston.' });
    }

    user.followRequests = user.followRequests.filter((id) => id.toString() !== requesterId);
    if (!user.followers.some((id) => id.toString() === requesterId)) {
      user.followers.push(requesterId);
    }
    if (!requester.following.some((id) => id.toString() === user._id.toString())) {
      requester.following.push(user._id);
    }

    await user.save();
    await requester.save();

    void dispatchSocialNotification({
      recipientId: requesterId,
      senderId: user._id,
      type: 'follow',
      text: 'pranoi kërkesën tënde për ndjekje',
    });

    res.json({
      success: true,
      followersCount: user.followers.length,
      requestsLeft: user.followRequests.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Refuzo kërkesë ndjekjeje
 */
export const declineFollowRequest = async (req, res) => {
  try {
    const { requesterId } = req.params;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Përdoruesi nuk u gjet.' });

    user.followRequests = (user.followRequests || []).filter(
      (id) => id.toString() !== requesterId
    );
    await user.save();

    res.json({ success: true, requestsLeft: user.followRequests.length });
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
