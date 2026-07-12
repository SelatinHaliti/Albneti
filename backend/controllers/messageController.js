import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { uploadToCloudinary } from '../utils/uploadMedia.js';
import { notifyDmInbox, emitInboxUpdated } from '../services/messageNotifyService.js';

function toUserObjectId(userId) {
  return new mongoose.Types.ObjectId(String(userId));
}

async function markConversationRead(conversationId, userId) {
  const userOid = toUserObjectId(userId);
  const convOid = new mongoose.Types.ObjectId(String(conversationId));
  const result = await Message.updateMany(
    {
      conversation: convOid,
      sender: { $ne: userOid },
      readBy: { $nin: [userOid] },
    },
    { $addToSet: { readBy: userOid }, $set: { status: 'read' } }
  );
  emitInboxUpdated(userId);
  return result.modifiedCount ?? 0;
}

/**
 * Merr ose krijo bisedë me një përdorues
 */
export const getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;
    if (userId === currentUserId) {
      return res.status(400).json({ message: 'Nuk mund të dërgoni mesazhe vetes.' });
    }
    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, userId] },
    }).populate('participants', 'username avatar fullName');
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [currentUserId, userId],
      });
      conversation = await Conversation.findById(conversation._id).populate(
        'participants',
        'username avatar fullName'
      );
    }
    const messages = await Message.find({ conversation: conversation._id })
      .sort({ createdAt: 1 })
      .populate('sender', 'username avatar')
      .lean();
    await markConversationRead(conversation._id, currentUserId);
    res.json({ conversation, messages });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Merr një bisedë me ID dhe mesazhet e saj
 */
export const getConversationById = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId).populate(
      'participants',
      'username avatar fullName'
    );
    if (!conversation) {
      return res.status(404).json({ message: 'Biseda nuk u gjet.' });
    }
    if (!conversation.participants.some((p) => p._id.toString() === req.user.id)) {
      return res.status(403).json({ message: 'Nuk keni akses.' });
    }
    const messages = await Message.find({ conversation: conversationId })
      .sort({ createdAt: 1 })
      .populate('sender', 'username avatar')
      .lean();
    await markConversationRead(conversationId, req.user.id);
    res.json({ conversation, messages });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Lista e bisedave (inbox)
 */
export const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const userOid = toUserObjectId(userId);
    const conversations = await Conversation.find({
      participants: userOid,
    })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'username avatar fullName')
      .populate('lastMessage')
      .lean();

    const convIds = conversations.map((c) => c._id);
    let unreadMap = {};
    if (convIds.length > 0) {
      const unreadAgg = await Message.aggregate([
        {
          $match: {
            conversation: { $in: convIds },
            sender: { $ne: userOid },
            readBy: { $nin: [userOid] },
          },
        },
        { $group: { _id: '$conversation', count: { $sum: 1 } } },
      ]);
      unreadMap = Object.fromEntries(
        unreadAgg.map((u) => [u._id.toString(), u.count])
      );
    }

    const withUnread = conversations.map((c) => ({
      ...c,
      unreadCount: unreadMap[c._id.toString()] || 0,
    }));

    res.json({ conversations: withUnread });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Dërgo mesazh (tekst, foto, video, emoji)
 */
export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, type = 'text' } = req.body;
    let media = {};
    if (req.file?.buffer) {
      const resourceType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
      const result = await uploadToCloudinary(
        req.file.buffer,
        'messages',
        resourceType
      );
      media = { url: result.secure_url, publicId: result.public_id };
    }
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Biseda nuk u gjet.' });
    }
    if (!conversation.participants.some((p) => p.toString() === req.user.id)) {
      return res.status(403).json({ message: 'Nuk keni akses.' });
    }
    const message = await Message.create({
      conversation: conversationId,
      sender: req.user.id,
      type: req.file ? (req.file.mimetype.startsWith('video') ? 'video' : 'image') : type,
      content: content || '',
      media: Object.keys(media).length ? media : undefined,
      status: 'sent',
    });
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const recipientId = conversation.participants.find(
      (p) => p.toString() !== req.user.id
    );
    const populated = await Message.findById(message._id).populate(
      'sender',
      'username avatar'
    );
    const preview =
      content?.slice(0, 80) ||
      (message.type === 'image' ? '📷 Foto' : message.type === 'video' ? '🎬 Video' : 'Mesazh i ri');

    void notifyDmInbox(recipientId, {
      conversationId,
      message: populated,
      senderUsername: req.user.username,
      preview,
    });

    res.status(201).json({ success: true, message: populated });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Shëno mesazhe si të lexuar
 */
export const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const marked = await markConversationRead(conversationId, req.user.id);
    res.json({ success: true, marked });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};
