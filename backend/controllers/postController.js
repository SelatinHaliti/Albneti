import Post from '../models/Post.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/uploadMedia.js';

/**
 * Krijo postim (foto, video) me muzikë opsionale
 */
export const createPost = async (req, res) => {
  try {
    const { caption, hashtags, type, music, musicTitle, musicArtist } = req.body;
    const media = [];
    const files = req.files?.media || (Array.isArray(req.files) ? req.files : []);
    if (files.length) {
      for (const file of files) {
        const resourceType = file.mimetype?.startsWith('video') ? 'video' : 'image';
        const result = await uploadToCloudinary(
          file.buffer,
          'posts',
          resourceType
        );
        media.push({
          url: result.secure_url,
          publicId: result.public_id,
          type: resourceType,
        });
      }
    }
    let musicData = undefined;
    const musicFile = req.files?.music?.[0];
    if (musicFile) {
      const result = await uploadToCloudinary(
        musicFile.buffer,
        'music',
        'raw'
      );
      musicData = {
        url: result.secure_url,
        publicId: result.public_id,
        title: (musicTitle || music?.title || 'Muzikë').toString().trim().slice(0, 200) || 'Muzikë',
        artist: (musicArtist || music?.artist || '').toString().trim().slice(0, 200) || '',
      };
    } else if (music) {
      try {
        const parsed = typeof music === 'string' ? JSON.parse(music) : music;
        if (parsed?.url) musicData = { url: parsed.url, title: parsed.title || 'Muzikë', artist: parsed.artist || '' };
      } catch (_) {}
    }
    const hashtagArray = hashtags
      ? (typeof hashtags === 'string' ? hashtags.split(',') : hashtags)
          .map((h) => h.trim().replace(/^#/, ''))
          .filter(Boolean)
      : [];
    const post = await Post.create({
      user: req.user.id,
      type: type || 'image',
      media,
      caption: caption || '',
      hashtags: hashtagArray,
      music: musicData,
    });
    const populated = await Post.findById(post._id).populate(
      'user',
      'username avatar fullName'
    );
    res.status(201).json({ success: true, post: populated });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Merr postimet e feed-it.
 * Si Instagram: kush poston e sheh gjithkund. feed=following → vetëm ndjekjet + vetë.
 */
export const getFeed = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const feedParam = (req.query.feed || '').toString().toLowerCase();
    const onlyFollowing = feedParam === 'following';
    const limit = Math.min(parseInt(req.query.limit, 10) || 12, 30);
    const cursorRaw = req.query.cursor != null ? parseInt(String(req.query.cursor), 10) : NaN;
    const page = Number.isFinite(cursorRaw) && cursorRaw >= 1 ? cursorRaw : 1;
    const skip = (page - 1) * limit;

    const filter = { isArchived: false };
    if (onlyFollowing) {
      const followingIds = [...(user.following || []).map((id) => id.toString()), user._id.toString()];
      filter.user = { $in: followingIds };
    }
    // Përndryshe (for_you ose çdo vlerë tjetër): pa filtër user → të gjithë postet

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username avatar fullName')
      .populate('comments.user', 'username avatar')
      .lean();

    const savedSet = new Set((user.savedPosts || []).map((id) => id.toString()));
    posts.forEach((p) => {
      p.saved = savedSet.has(p._id.toString());
    });

    const hasMore = posts.length === limit;
    const nextCursor = hasMore ? String(page + 1) : null;

    res.json({ posts, hasMore, nextCursor });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Merr një postim me ID
 */
export const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'username avatar fullName')
      .populate('comments.user', 'username avatar')
      .lean();
    if (!post) return res.status(404).json({ message: 'Postimi nuk u gjet.' });
    if (!post.viewCount) post.viewCount = 0;
    await Post.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });

    if (req.user) {
      const u = await User.findById(req.user.id).select('savedPosts').lean();
      post.saved = (u?.savedPosts || []).some((id) => id.toString() === post._id.toString());
    } else {
      post.saved = false;
    }

    res.json({ post });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Ndrysho postim (caption, hashtags) – vetëm pronari
 */
export const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Postimi nuk u gjet.' });
    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Nuk keni leje për këtë veprim.' });
    }
    const { caption, hashtags } = req.body;
    if (caption !== undefined) {
      post.caption = String(caption || '').trim().slice(0, 2200);
    }
    if (hashtags !== undefined) {
      const arr = typeof hashtags === 'string' ? hashtags.split(',') : Array.isArray(hashtags) ? hashtags : [];
      post.hashtags = arr.map((h) => String(h).trim().replace(/^#/, '')).filter(Boolean);
    }
    await post.save();
    const populated = await Post.findById(post._id)
      .populate('user', 'username avatar fullName')
      .lean();
    res.json({ success: true, post: populated });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Merr postimet e arkivuara të përdoruesit
 */
export const getArchivedPosts = async (req, res) => {
  try {
    const posts = await Post.find({ user: req.user.id, isArchived: true })
      .sort({ createdAt: -1 })
      .populate('user', 'username avatar fullName')
      .lean();
    res.json({ posts });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Arkivo / Çarkivo postim – vetëm pronari
 */
export const archivePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Postimi nuk u gjet.' });
    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Nuk keni leje për këtë veprim.' });
    }
    post.isArchived = !post.isArchived;
    await post.save();
    res.json({ success: true, isArchived: post.isArchived });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Fshi postim
 */
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Postimi nuk u gjet.' });
    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Nuk keni leje për këtë veprim.' });
    }
    for (const m of post.media) {
      if (m.publicId) {
        try {
          await deleteFromCloudinary(m.publicId, m.type || 'image');
        } catch (_) {}
      }
    }
    if (post.music?.publicId) {
      try {
        await deleteFromCloudinary(post.music.publicId, 'raw');
      } catch (_) {}
    }
    await post.deleteOne();
    res.json({ success: true, message: 'Postimi u fshi.' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Like / Unlike
 */
export const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Postimi nuk u gjet.' });
    const index = post.likes.findIndex((id) => id.toString() === req.user.id);
    if (index >= 0) {
      post.likes.splice(index, 1);
    } else {
      post.likes.push(req.user.id);
      if (post.user.toString() !== req.user.id) {
        await Notification.create({
          recipient: post.user,
          sender: req.user.id,
          type: 'like',
          post: post._id,
        });
      }
    }
    await post.save();
    res.json({ success: true, liked: index < 0, likesCount: post.likes.length });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Shto koment
 */
export const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Postimi nuk u gjet.' });
    const comment = {
      user: req.user.id,
      text: text?.trim()?.slice(0, 500) || '',
    };
    post.comments.push(comment);
    await post.save();
    if (post.user.toString() !== req.user.id) {
      await Notification.create({
        recipient: post.user,
        sender: req.user.id,
        type: 'comment',
        post: post._id,
        comment: post.comments[post.comments.length - 1]._id,
        text: comment.text.slice(0, 50),
      });
    }
    const populated = await Post.findById(post._id)
      .populate('comments.user', 'username avatar')
      .lean();
    const newComment = populated.comments[populated.comments.length - 1];
    res.status(201).json({ success: true, comment: newComment });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Fshi koment – vetëm autori i komentit ose pronari i postimit
 */
export const deleteComment = async (req, res) => {
  try {
    const { id: postId, commentId } = req.params;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Postimi nuk u gjet.' });
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: 'Komenti nuk u gjet.' });
    const isOwner = post.user.toString() === req.user.id;
    const isCommentAuthor = comment.user.toString() === req.user.id;
    if (!isOwner && !isCommentAuthor) {
      return res.status(403).json({ message: 'Nuk keni leje për këtë veprim.' });
    }
    post.comments.pull(commentId);
    await post.save();
    res.json({ success: true, message: 'Komenti u fshi.' });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Ndrysho koment – vetëm autori
 */
export const updateComment = async (req, res) => {
  try {
    const { id: postId, commentId } = req.params;
    const { text } = req.body;
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Postimi nuk u gjet.' });
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: 'Komenti nuk u gjet.' });
    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Nuk keni leje për këtë veprim.' });
    }
    comment.text = (text?.trim()?.slice(0, 500) || '').trim() || comment.text;
    await post.save();
    const populated = await Post.findById(post._id)
      .populate('comments.user', 'username avatar')
      .lean();
    const updated = populated.comments.find((c) => c._id.toString() === commentId);
    res.json({ success: true, comment: updated });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Like koment
 */
export const toggleCommentLike = async (req, res) => {
  try {
    const { commentId } = req.params;
    const post = await Post.findOne({ 'comments._id': commentId });
    if (!post) return res.status(404).json({ message: 'Komenti nuk u gjet.' });
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: 'Komenti nuk u gjet.' });
    const index = comment.likes.findIndex((id) => id.toString() === req.user.id);
    if (index >= 0) comment.likes.splice(index, 1);
    else comment.likes.push(req.user.id);
    await post.save();
    res.json({
      success: true,
      liked: index < 0,
      likesCount: comment.likes.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Ruaj / Heq nga të ruajturat
 */
export const toggleSave = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const postId = req.params.id;
    const index = user.savedPosts.findIndex((id) => id.toString() === postId);
    if (index >= 0) {
      user.savedPosts.splice(index, 1);
    } else {
      user.savedPosts.push(postId);
    }
    await user.save();
    res.json({
      success: true,
      saved: index < 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Share (shto në shares dhe krijo njoftim)
 */
export const sharePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Postimi nuk u gjet.' });
    if (!post.shares.some((id) => id.toString() === req.user.id)) {
      post.shares.push(req.user.id);
      if (post.user.toString() !== req.user.id) {
        await Notification.create({
          recipient: post.user,
          sender: req.user.id,
          type: 'share',
          post: post._id,
        });
      }
      await post.save();
    }
    res.json({ success: true, sharesCount: post.shares.length });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

