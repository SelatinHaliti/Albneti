import LiveStream from '../models/LiveStream.js';
import User from '../models/User.js';
import { getIO } from '../sockets/io.js';
import { dispatchSocialNotification } from '../services/notificationService.js';
import crypto from 'crypto';

/**
 * Fillo transmetim live
 */
export const startLive = async (req, res) => {
  try {
    const { title } = req.body;
    const existing = await LiveStream.findOne({ user: req.user.id, isActive: true });
    if (existing) {
      return res.json({ success: true, live: existing });
    }
    const streamKey = crypto.randomBytes(16).toString('hex');
    const live = await LiveStream.create({
      user: req.user.id,
      title: String(title || 'Transmetim live').trim().slice(0, 100),
      streamKey,
      isActive: true,
      startedAt: new Date(),
    });
    const populated = await LiveStream.findById(live._id).populate(
      'user',
      'username avatar fullName isVerified'
    );

    const user = await User.findById(req.user.id).select('followers following').lean();
    const notifyIds = new Set([
      ...(user?.followers || []).map((id) => id.toString()),
      ...(user?.following || []).map((id) => id.toString()),
    ]);
    notifyIds.delete(req.user.id);
    for (const recipientId of notifyIds) {
      void dispatchSocialNotification({
        recipientId,
        senderId: req.user.id,
        type: 'live',
        text: 'filloi një transmetim live',
      });
    }

    const io = getIO();
    if (io) io.emit('live:started', { live: populated });

    res.status(201).json({ success: true, live: populated });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Përfundo transmetim live
 */
export const endLive = async (req, res) => {
  try {
    const live = await LiveStream.findOne({ _id: req.params.id, user: req.user.id, isActive: true });
    if (!live) return res.status(404).json({ message: 'Transmetimi nuk u gjet.' });
    live.isActive = false;
    live.endedAt = new Date();
    await live.save();

    const io = getIO();
    if (io) io.to(`live:${live._id}`).emit('live:ended', { liveId: live._id });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Lista e transmetimeve aktive
 */
export const getActiveLives = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('following').lean();
    const followingIds = [...(user?.following || []).map((id) => id.toString()), req.user.id];
    const lives = await LiveStream.find({
      isActive: true,
      user: { $in: followingIds },
    })
      .sort({ startedAt: -1 })
      .populate('user', 'username avatar fullName isVerified')
      .lean();
    res.json({ lives });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Merr një transmetim live
 */
export const getLive = async (req, res) => {
  try {
    const live = await LiveStream.findById(req.params.id)
      .populate('user', 'username avatar fullName isVerified')
      .populate('comments.user', 'username avatar')
      .lean();
    if (!live) return res.status(404).json({ message: 'Transmetimi nuk u gjet.' });
    res.json({ live });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Bashkohu si shikues
 */
export const joinLive = async (req, res) => {
  try {
    const live = await LiveStream.findById(req.params.id);
    if (!live || !live.isActive) {
      return res.status(404).json({ message: 'Transmetimi nuk është aktiv.' });
    }
    if (!live.viewers.some((id) => id.toString() === req.user.id)) {
      live.viewers.push(req.user.id);
      await live.save();
      const io = getIO();
      if (io) {
        io.to(`live:${live._id}`).emit('live:viewer_count', {
          liveId: live._id,
          count: live.viewers.length,
        });
        io.to(`user:${live.user}`).emit('live:viewer_joined', {
          liveId: live._id,
          viewerId: req.user.id,
        });
      }
    }
    res.json({ success: true, viewerCount: live.viewers.length });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Koment në live
 */
export const addLiveComment = async (req, res) => {
  try {
    const { text } = req.body;
    const trimmed = String(text || '').trim().slice(0, 200);
    if (!trimmed) return res.status(400).json({ message: 'Shkruani një koment.' });
    const live = await LiveStream.findById(req.params.id);
    if (!live || !live.isActive) {
      return res.status(404).json({ message: 'Transmetimi nuk është aktiv.' });
    }
    live.comments.push({ user: req.user.id, text: trimmed });
    if (live.comments.length > 500) live.comments = live.comments.slice(-500);
    await live.save();
    const comment = live.comments[live.comments.length - 1];
    const populated = await User.findById(req.user.id).select('username avatar').lean();
    const payload = {
      _id: comment._id,
      text: trimmed,
      createdAt: comment.createdAt,
      user: populated,
    };
    const io = getIO();
    if (io) io.to(`live:${live._id}`).emit('live:comment', payload);
    res.status(201).json({ success: true, comment: payload });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Reagim në live
 */
export const addLiveReaction = async (req, res) => {
  try {
    const { type } = req.body;
    const allowed = ['like', 'love', 'laugh', 'wow'];
    if (!allowed.includes(type)) {
      return res.status(400).json({ message: 'Reagim i pavlefshëm.' });
    }
    const live = await LiveStream.findById(req.params.id);
    if (!live || !live.isActive) {
      return res.status(404).json({ message: 'Transmetimi nuk është aktiv.' });
    }
    live.reactions.push({ user: req.user.id, type });
    if (live.reactions.length > 1000) live.reactions = live.reactions.slice(-1000);
    await live.save();
    const io = getIO();
    if (io) {
      io.to(`live:${live._id}`).emit('live:reaction', {
        userId: req.user.id,
        type,
        username: req.user.username,
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};
