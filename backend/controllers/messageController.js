import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { uploadToCloudinary } from '../utils/uploadMedia.js';

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
    const conversations = await Conversation.find({
      participants: req.user.id,
    })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'username avatar fullName')
      .populate('lastMessage')
      .lean();
    res.json({ conversations });
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
    await Notification.create({
      recipient: recipientId,
      sender: req.user.id,
      type: 'message',
      message: message._id,
      text: content?.slice(0, 50) || 'Një mesazh i ri',
    });

    const populated = await Message.findById(message._id).populate(
      'sender',
      'username avatar'
    );
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
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: req.user.id },
        readBy: { $ne: req.user.id },
      },
      { $addToSet: { readBy: req.user.id }, $set: { status: 'read' } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};
