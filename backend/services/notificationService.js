import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { notifyUser, buildPushFromNotification } from './pushService.js';

/** Tipet që shfaqen te Zemra — jo mesazhet DM */
export const SOCIAL_TYPES = [
  'like', 'comment', 'follow', 'mention', 'share', 'story_view', 'live',
  'event_interest', 'event_reminder', 'event_update', 'event_promo', 'verification',
];

export function isSocialType(type) {
  return SOCIAL_TYPES.includes(type);
}

/** Krijon njoftim social + socket + push */
export async function dispatchSocialNotification({
  recipientId,
  senderId,
  type,
  post,
  story,
  event,
  comment,
  text,
}) {
  if (!recipientId || String(recipientId) === String(senderId)) return null;
  if (!isSocialType(type)) return null;

  const notif = await Notification.create({
    recipient: recipientId,
    sender: senderId,
    type,
    post,
    story,
    event,
    comment,
    text,
  });

  const populated = await Notification.findById(notif._id)
    .populate('sender', 'username avatar fullName')
    .lean();

  const socketPayload = {
    _id: String(populated._id),
    type: populated.type,
    isRead: false,
    text: populated.text,
    createdAt: populated.createdAt,
    sender: populated.sender
      ? {
          _id: String(populated.sender._id),
          username: populated.sender.username,
          avatar: populated.sender.avatar,
          fullName: populated.sender.fullName,
        }
      : undefined,
    post: populated.post ? String(populated.post) : undefined,
    event: populated.event ? String(populated.event) : undefined,
  };

  let senderUsername = populated.sender?.username;
  if (!senderUsername && senderId) {
    const u = await User.findById(senderId).select('username').lean();
    senderUsername = u?.username;
  }

  void notifyUser(String(recipientId), {
    socket: socketPayload,
    push: buildPushFromNotification(notif, senderUsername),
  });

  return notif;
}
