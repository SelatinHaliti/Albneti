import { getIO } from '../sockets/io.js';
import { sendPushToUser } from './pushService.js';

/** Rifresko badge-in e Mesazhe në klient */
export function emitInboxUpdated(userId) {
  const io = getIO();
  if (io && userId) {
    io.to(`user:${userId}`).emit('inbox_updated', { userId: String(userId) });
  }
}

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
