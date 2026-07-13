import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Story from '../models/Story.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { uploadToCloudinary } from '../utils/uploadMedia.js';
import { notifyDmInbox, emitInboxUpdated } from '../services/messageNotifyService.js';
import { dispatchSocialNotification } from '../services/notificationService.js';

function toUserObjectId(userId) {
  return new mongoose.Types.ObjectId(String(userId));
}

function getMessagePreview(message, content) {
  if (content?.trim()) return content.trim().slice(0, 80);
  if (message.type === 'image') return '📷 Foto';
  if (message.type === 'video') return '🎬 Video';
  if (message.type === 'audio') return '🎤 Mesazh zëri';
  if (message.type === 'story_reply') return '↩ Përgjigje story';
  return 'Mesazh i ri';
}

async function assertCanMessageUsers(currentUserId, otherUserIds) {
  const ids = [...new Set(otherUserIds.map(String))].filter((id) => id !== String(currentUserId));
  if (!ids.length) return;
  const current = await User.findById(currentUserId).select('blockedUsers').lean();
  const others = await User.find({ _id: { $in: ids } }).select('blockedUsers isBlocked').lean();
  for (const other of others) {
    if (other.isBlocked) {
      const err = new Error('Ky përdorues nuk është i disponueshëm.');
      err.statusCode = 403;
      throw err;
    }
    const blocked = (current?.blockedUsers || []).some((id) => id.toString() === other._id.toString());
    const blockedBy = (other.blockedUsers || []).some((id) => id.toString() === String(currentUserId));
    if (blocked || blockedBy) {
      const err = new Error('Nuk mund të dërgoni mesazhe — përdoruesi është bllokuar.');
      err.statusCode = 403;
      throw err;
    }
  }
}

async function notifyConversationParticipants(conversation, senderId, payload) {
  const recipients = conversation.participants.filter(
    (p) => p.toString() !== String(senderId)
  );
  const groupName = conversation.type === 'group' ? conversation.name : null;
  for (const recipientId of recipients) {
    const preview = groupName ? `${groupName}: ${payload.preview}` : payload.preview;
    void notifyDmInbox(recipientId, {
      conversationId: payload.conversationId,
      message: payload.message,
      senderUsername: payload.senderUsername,
      preview,
    });
  }
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

function detectMediaType(mimetype) {
  if (mimetype.startsWith('video')) return { msgType: 'video', resourceType: 'video' };
  if (mimetype.startsWith('audio')) return { msgType: 'audio', resourceType: 'video' };
  return { msgType: 'image', resourceType: 'image' };
}

/**
 * Merr ose krijo bisedë 1:1 me një përdorues
 */
export const getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;
    if (userId === currentUserId) {
      return res.status(400).json({ message: 'Nuk mund të dërgoni mesazhe vetes.' });
    }
    await assertCanMessageUsers(currentUserId, [userId]);
    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, userId], $size: 2 },
      type: { $ne: 'group' },
    }).populate('participants', 'username avatar fullName');
    if (!conversation) {
      conversation = await Conversation.create({
        type: 'direct',
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
      .populate('story', 'mediaUrl type')
      .lean();
    await markConversationRead(conversation._id, currentUserId);
    res.json({ conversation, messages });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Krijo bisedë grupi
 */
export const createGroupConversation = async (req, res) => {
  try {
    const { participantIds, name } = req.body;
    const ids = [
      ...new Set([
        String(req.user.id),
        ...(Array.isArray(participantIds) ? participantIds.map(String) : []),
      ]),
    ];
    if (ids.length < 3) {
      return res.status(400).json({ message: 'Grupi duhet të ketë të paktën 3 anëtarë.' });
    }
    if (ids.length > 32) {
      return res.status(400).json({ message: 'Maksimumi 32 anëtarë në grup.' });
    }
    const conversation = await Conversation.create({
      type: 'group',
      name: String(name || 'Grup i ri').trim().slice(0, 100) || 'Grup i ri',
      createdBy: req.user.id,
      participants: ids,
    });
    const populated = await Conversation.findById(conversation._id).populate(
      'participants',
      'username avatar fullName'
    );
    res.status(201).json({ success: true, conversation: populated, messages: [] });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Përgjigje story → DM
 */
export const replyToStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { content } = req.body;
    const text = String(content || '').trim();
    if (!text) {
      return res.status(400).json({ message: 'Shkruani një përgjigje.' });
    }
    const story = await Story.findById(storyId).populate('user', 'username');
    if (!story) return res.status(404).json({ message: 'Story nuk u gjet.' });
    const storyOwnerId = story.user._id.toString();
    if (storyOwnerId === req.user.id) {
      return res.status(400).json({ message: 'Nuk mund të përgjigjeni story-t tuaj.' });
    }
    await assertCanMessageUsers(req.user.id, [storyOwnerId]);

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, storyOwnerId], $size: 2 },
      type: { $ne: 'group' },
    });
    if (!conversation) {
      conversation = await Conversation.create({
        type: 'direct',
        participants: [req.user.id, storyOwnerId],
      });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user.id,
      type: 'story_reply',
      content: text,
      story: storyId,
      status: 'sent',
    });
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'username avatar')
      .populate('story', 'mediaUrl type');

    const preview = `↩ Story: ${text.slice(0, 60)}`;
    void notifyConversationParticipants(conversation, req.user.id, {
      conversationId: conversation._id,
      message: populated,
      senderUsername: req.user.username,
      preview,
    });

    void dispatchSocialNotification({
      recipientId: storyOwnerId,
      senderId: req.user.id,
      type: 'story_reply',
      story: storyId,
      text: text.slice(0, 200),
    });

    res.status(201).json({
      success: true,
      conversationId: conversation._id,
      message: populated,
    });
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
      .populate('story', 'mediaUrl type')
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
 * Dërgo mesazh (tekst, foto, video, audio, emoji)
 */
export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, type = 'text', duration } = req.body;
    let media = {};
    let msgType = type;

    if (req.file?.buffer) {
      const detected = detectMediaType(req.file.mimetype);
      msgType = detected.msgType;
      const result = await uploadToCloudinary(
        req.file.buffer,
        'messages',
        detected.resourceType
      );
      media = {
        url: result.secure_url,
        publicId: result.public_id,
        mimeType: req.file.mimetype,
        duration: duration ? parseFloat(duration) : undefined,
      };
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Biseda nuk u gjet.' });
    }
    if (!conversation.participants.some((p) => p.toString() === req.user.id)) {
      return res.status(403).json({ message: 'Nuk keni akses.' });
    }
    const recipients = conversation.participants
      .map((p) => p.toString())
      .filter((id) => id !== req.user.id);
    await assertCanMessageUsers(req.user.id, recipients);

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user.id,
      type: msgType,
      content: content || '',
      media: Object.keys(media).length ? media : undefined,
      status: 'sent',
    });
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const populated = await Message.findById(message._id).populate(
      'sender',
      'username avatar'
    );
    const preview = getMessagePreview(message, content);

    void notifyConversationParticipants(conversation, req.user.id, {
      conversationId,
      message: populated,
      senderUsername: req.user.username,
      preview,
    });

    res.status(201).json({ success: true, message: populated });
  } catch (err) {
    res.status(err.statusCode || 500).json({ message: err.message || 'Gabim.' });
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
