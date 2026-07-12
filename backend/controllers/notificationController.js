import Notification from '../models/Notification.js';
import { processEventReminders } from './communityController.js';
import { SOCIAL_TYPES } from '../services/notificationService.js';

function serializeNotification(n) {
  return {
    _id: String(n._id),
    type: n.type,
    isRead: Boolean(n.isRead),
    text: n.text || undefined,
    createdAt: n.createdAt,
    sender: n.sender
      ? {
          _id: String(n.sender._id),
          username: n.sender.username,
          avatar: n.sender.avatar,
          fullName: n.sender.fullName,
        }
      : undefined,
    post: n.post ? String(n.post) : undefined,
    event: n.event ? String(n.event) : undefined,
    story: n.story ? String(n.story) : undefined,
  };
}

export const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const skip = (page - 1) * limit;
    const recipientId = req.user._id ?? req.user.id;

    void processEventReminders(recipientId).catch(() => {});

    const notifications = await Notification.find({
      recipient: recipientId,
      type: { $in: SOCIAL_TYPES },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username avatar fullName')
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipient: recipientId,
      isRead: false,
      type: { $in: SOCIAL_TYPES },
    });

    res.json({
      notifications: notifications.map(serializeNotification),
      unreadCount,
      page,
      hasMore: notifications.length === limit,
    });
  } catch (err) {
    console.error('getNotifications:', err.message);
    res.status(500).json({ message: err.message || 'Gabim në ngarkimin e njoftimeve.' });
  }
};

export const markAllRead = async (req, res) => {
  try {
    const recipientId = req.user._id ?? req.user.id;
    await Notification.updateMany(
      { recipient: recipientId, isRead: false, type: { $in: SOCIAL_TYPES } },
      { $set: { isRead: true } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

export const markOneRead = async (req, res) => {
  try {
    const recipientId = req.user._id ?? req.user.id;
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: recipientId, type: { $in: SOCIAL_TYPES } },
      { $set: { isRead: true } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};
