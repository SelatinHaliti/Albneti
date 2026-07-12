import { getIO } from '../sockets/io.js';
import { sendPushToUser } from './pushService.js';

/** DM — vetëm Mesazhe, kurrë te zemra */
export function notifyDmInbox(recipientId, { conversationId, message, senderUsername, preview }) {
  const io = getIO();
  if (io) {
    io.to(`user:${recipientId}`).emit('new_message_notification', {
      conversationId,
      message,
    });
  }

  void sendPushToUser(recipientId, {
    title: 'Mesazh i ri',
    body: senderUsername ? `@${senderUsername}: ${preview}` : preview,
    url: `/mesazhe/${conversationId}`,
    tag: `msg-${conversationId}`,
    type: 'dm',
  });
}
