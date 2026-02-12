import GlobalChatMessage from '../models/GlobalChatMessage.js';
import GlobalChatBan from '../models/GlobalChatBan.js';
import { getIO } from '../sockets/io.js';

const ROOM = 'main';
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Dërgo mesazh në Chat Global (REST fallback – për kur socket nuk është i lidhur)
 * Krijohet mesazhi, emetohet për të gjithë përmes socket, dhe kthehet te klienti.
 */
export const sendMessage = async (req, res) => {
  try {
    const banned = await isUserBanned(req.user.id);
    if (banned) {
      return res.status(403).json({ message: 'Jeni të ndaluar nga Chat Global.' });
    }
    const content = (req.body?.content ?? '').toString().trim().slice(0, 2000);
    if (!content) {
      return res.status(400).json({ message: 'Përmbajtja e mesazhit është e zbrazët.' });
    }
    const message = await GlobalChatMessage.create({
      room: ROOM,
      sender: req.user.id,
      type: req.body.type === 'emoji' ? 'emoji' : 'text',
      content,
    });
    const populated = await GlobalChatMessage.findById(message._id)
      .populate('sender', 'username avatar fullName')
      .lean();
    const io = getIO();
    if (io) io.to('global-chat').emit('global_chat_message', populated);
    res.status(201).json({ message: populated });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Merr historikun e mesazheve (paginated) për Chat-in Global
 */
export const getMessages = async (req, res) => {
  try {
    const before = req.query.before; // cursor: createdAt / _id
    const limit = Math.min(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);
    const query = { room: ROOM, deletedAt: null };
    if (before) {
      const doc = await GlobalChatMessage.findById(before).select('createdAt').lean();
      if (doc) query.createdAt = { $lt: doc.createdAt };
    }
    const messages = await GlobalChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'username avatar fullName')
      .lean();
    const reversed = messages.reverse();
    const hasMore = messages.length === limit;
    res.json({ messages: reversed, hasMore });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Fshi mesazh (soft delete) – vetëm admin/moderator
 */
export const deleteMessage = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ message: 'Nuk keni leje.' });
    }
    const msg = await GlobalChatMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Mesazhi nuk u gjet.' });
    msg.deletedAt = new Date();
    msg.deletedBy = req.user.id;
    await msg.save();
    const io = getIO();
    if (io) io.to('global-chat').emit('global_chat_message_deleted', { messageId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Ndalo përdorues nga Chat Global – vetëm admin/moderator
 * body: { userId, reason?, durationHours } (durationHours 0 = 24h default, -1 = përherë)
 */
export const banUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ message: 'Nuk keni leje.' });
    }
    const { userId, reason, durationHours } = req.body;
    if (!userId) return res.status(400).json({ message: 'Mungon userId.' });
    let bannedUntil;
    if (durationHours === -1 || durationHours === 'permanent') {
      bannedUntil = new Date('2099-12-31T23:59:59.999Z');
    } else {
      const hours = parseInt(durationHours, 10) || 24;
      bannedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    }
    await GlobalChatBan.create({
      user: userId,
      bannedUntil,
      reason: (reason || '').toString().trim().slice(0, 500),
      bannedBy: req.user.id,
    });
    res.json({ success: true, bannedUntil });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Kontrollon nëse përdoruesi është i ndaluar nga Chat Global
 */
export const isUserBanned = async (userId) => {
  const ban = await GlobalChatBan.findOne({
    user: userId,
    bannedUntil: { $gt: new Date() },
  }).sort({ bannedUntil: -1 }).lean();
  return !!ban;
};
