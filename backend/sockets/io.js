/**
 * Referencë globale për Socket.io - përdoret për të dërguar njoftime nga kontrollet
 */
let ioInstance = null;

export function setIO(io) {
  ioInstance = io;
}

export function getIO() {
  return ioInstance;
}

export function emitNotification(userId, notification) {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit('notification', notification);
  }
}
