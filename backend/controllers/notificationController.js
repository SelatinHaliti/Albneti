import Notification from '../models/Notification.js';

/**
 * Merr njoftimet e përdoruesit
 */
export const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const skip = (page - 1) * limit;
    const recipientId = req.user._id ?? req.user.id;
    const notifications = await Notification.find({ recipient: recipientId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username avatar fullName')
      .lean();
    const unreadCount = await Notification.countDocuments({
      recipient: recipientId,
      isRead: false,
    });
    // Sigurohet që post është string në përgjigje (për linkun "Shiko")
    const list = notifications.map((n) => ({
      ...n,
      post: n.post ? String(n.post) : undefined,
    }));
    res.json({ notifications: list, unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Shëno të gjitha si të lexuara
 */
export const markAllRead = async (req, res) => {
  try {
    const recipientId = req.user._id ?? req.user.id;
    await Notification.updateMany(
      { recipient: recipientId, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};

/**
 * Shëno një njoftim si të lexuar
 */
export const markOneRead = async (req, res) => {
  try {
    const recipientId = req.user._id ?? req.user.id;
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: recipientId },
      { $set: { isRead: true } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Gabim.' });
  }
};
