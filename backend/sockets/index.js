import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import GlobalChatMessage from '../models/GlobalChatMessage.js';
import GlobalChatBan from '../models/GlobalChatBan.js';
import { sendIncomingCallPush } from '../services/pushService.js';
import { notifyDmInbox } from '../services/messageNotifyService.js';

const userSockets = new Map(); // userId -> Set(socketId)
const GLOBAL_CHAT_ROOM = 'global-chat';
const activeCalls = new Map(); // userId -> { withUserId, conversationId }

async function validateCallPair(userId, toUserId, conversationId) {
  if (!toUserId || !conversationId) return false;
  const conv = await Conversation.findById(conversationId).lean();
  if (!conv) return false;
  const ids = conv.participants.map((p) => p.toString());
  return ids.includes(String(userId)) && ids.includes(String(toUserId));
}

function setCallActive(a, b, conversationId) {
  activeCalls.set(String(a), { withUserId: String(b), conversationId });
  activeCalls.set(String(b), { withUserId: String(a), conversationId });
}

function clearCallActive(userId) {
  const entry = activeCalls.get(String(userId));
  if (entry) {
    activeCalls.delete(String(userId));
    activeCalls.delete(entry.withUserId);
  }
}

function isUserBusy(userId) {
  return activeCalls.has(String(userId));
}

export function setupSocketIO(io) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Sesioni nuk u gjet'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user || user.isBlocked) return next(new Error('Përdorues i pavlefshëm'));
      socket.userId = user._id.toString();
      next();
    } catch (err) {
      next(new Error('Sesioni ka skaduar'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);
    socket.join(`user:${userId}`);
    socket.join(GLOBAL_CHAT_ROOM);
    const globalRoom = io.sockets.adapter.rooms.get(GLOBAL_CHAT_ROOM);
    io.to(GLOBAL_CHAT_ROOM).emit('global_chat_online_count', { count: globalRoom?.size ?? 0 });

    socket.on('join_conversation', (conversationId) => {
      socket.join(`conv:${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on('typing', async ({ conversationId, recipientId }) => {
      socket.to(`conv:${conversationId}`).emit('user_typing', { userId, conversationId });
      if (recipientId) io.to(`user:${recipientId}`).emit('user_typing', { userId, conversationId });
    });

    socket.on('stop_typing', ({ conversationId, recipientId }) => {
      socket.to(`conv:${conversationId}`).emit('user_stop_typing', { userId, conversationId });
      if (recipientId) io.to(`user:${recipientId}`).emit('user_stop_typing', { userId, conversationId });
    });

    socket.on('new_message', async (payload) => {
      const { conversationId, content, type, media } = payload;
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.participants.some((p) => p.toString() === userId)) return;
        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          type: type || 'text',
          content: content || '',
          media: media || undefined,
          status: 'sent',
        });
        const recipientId = conversation.participants.find((p) => p.toString() !== userId);
        conversation.lastMessage = message._id;
        conversation.lastMessageAt = new Date();
        await conversation.save();
        const populated = await Message.findById(message._id).populate('sender', 'username avatar');
        io.to(`conv:${conversationId}`).emit('message', populated);

        const senderName = populated?.sender?.username || 'Dikush';
        const preview =
          (content || '').slice(0, 80) ||
          (type === 'video' ? '🎬 Video' : type === 'image' ? '📷 Foto' : 'Mesazh i ri');
        void notifyDmInbox(recipientId, {
          conversationId,
          message: populated,
          senderUsername: senderName,
          preview,
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('message_read', async ({ conversationId }) => {
      await Message.updateMany(
        { conversation: conversationId, sender: { $ne: userId }, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId }, $set: { status: 'read' } }
      );
      io.to(`conv:${conversationId}`).emit('messages_read', { userId, conversationId });
    });

    // ——— WebRTC Call signaling (audio/video) ———
    socket.on('call:offer', async ({ toUserId, conversationId, mode, sdp }) => {
      if (!toUserId || !sdp || !conversationId) return;
      const ok = await validateCallPair(userId, toUserId, conversationId);
      if (!ok) return socket.emit('call:error', { message: 'Thirrja nuk lejohet.' });
      if (isUserBusy(userId) || isUserBusy(toUserId)) {
        return socket.emit('call:busy', { toUserId });
      }
      const recipientSockets = userSockets.get(String(toUserId));
      if (!recipientSockets || recipientSockets.size === 0) {
        return socket.emit('call:offline', { toUserId });
      }
      setCallActive(userId, toUserId, conversationId);
      const caller = await User.findById(userId).select('username').lean();
      io.to(`user:${toUserId}`).emit('call:offer', {
        fromUserId: userId,
        fromUsername: caller?.username,
        conversationId,
        mode: mode === 'video' ? 'video' : 'audio',
        sdp,
      });
      void sendIncomingCallPush(toUserId, {
        callerUsername: caller?.username,
        conversationId,
        mode: mode === 'video' ? 'video' : 'audio',
      });
    });

    socket.on('call:answer', async ({ toUserId, conversationId, sdp }) => {
      if (!toUserId || !sdp || !conversationId) return;
      const ok = await validateCallPair(userId, toUserId, conversationId);
      if (!ok) return;
      io.to(`user:${toUserId}`).emit('call:answer', { fromUserId: userId, conversationId, sdp });
    });

    socket.on('call:ice', async ({ toUserId, conversationId, candidate }) => {
      if (!toUserId || !candidate || !conversationId) return;
      const ok = await validateCallPair(userId, toUserId, conversationId);
      if (!ok) return;
      io.to(`user:${toUserId}`).emit('call:ice', { fromUserId: userId, conversationId, candidate });
    });

    socket.on('call:ringing', ({ toUserId, conversationId }) => {
      if (!toUserId) return;
      io.to(`user:${toUserId}`).emit('call:ringing', { fromUserId: userId, conversationId });
    });

    socket.on('call:busy', ({ toUserId, conversationId }) => {
      if (!toUserId) return;
      io.to(`user:${toUserId}`).emit('call:busy', { fromUserId: userId, conversationId });
    });

    socket.on('call:reject', ({ toUserId, conversationId, reason }) => {
      if (!toUserId) return;
      clearCallActive(userId);
      clearCallActive(toUserId);
      io.to(`user:${toUserId}`).emit('call:reject', { fromUserId: userId, conversationId, reason });
    });

    socket.on('call:end', ({ toUserId, conversationId, reason }) => {
      if (!toUserId) return;
      clearCallActive(userId);
      clearCallActive(toUserId);
      io.to(`user:${toUserId}`).emit('call:end', { fromUserId: userId, conversationId, reason });
    });

    // ——— Chat Global Shqiptar ———
    socket.on('global_chat_message', async (payload) => {
      try {
        const ban = await GlobalChatBan.findOne({
          user: userId,
          bannedUntil: { $gt: new Date() },
        }).lean();
        if (ban) {
          socket.emit('global_chat_error', { message: 'Jeni të ndaluar nga Chat Global.' });
          return;
        }
        const content = (payload?.content ?? '').toString().trim().slice(0, 2000);
        if (!content) return;
        const message = await GlobalChatMessage.create({
          room: 'main',
          sender: userId,
          type: payload.type === 'emoji' ? 'emoji' : 'text',
          content,
        });
        const populated = await GlobalChatMessage.findById(message._id)
          .populate('sender', 'username avatar fullName')
          .lean();
        io.to(GLOBAL_CHAT_ROOM).emit('global_chat_message', populated);
      } catch (err) {
        socket.emit('global_chat_error', { message: err.message || 'Gabim.' });
      }
    });

    socket.on('global_chat_typing', () => {
      socket.to(GLOBAL_CHAT_ROOM).emit('global_chat_typing', { userId });
    });

    socket.on('global_chat_stop_typing', () => {
      socket.to(GLOBAL_CHAT_ROOM).emit('global_chat_stop_typing', { userId });
    });

    socket.on('disconnect', () => {
      const entry = activeCalls.get(String(userId));
      if (entry) {
        io.to(`user:${entry.withUserId}`).emit('call:end', {
          fromUserId: userId,
          conversationId: entry.conversationId,
          reason: 'disconnect',
        });
        clearCallActive(userId);
        clearCallActive(entry.withUserId);
      }
      socket.leave(GLOBAL_CHAT_ROOM);
      const globalRoom = io.sockets.adapter.rooms.get(GLOBAL_CHAT_ROOM);
      io.to(GLOBAL_CHAT_ROOM).emit('global_chat_online_count', { count: globalRoom?.size ?? 0 });
      const set = userSockets.get(userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) userSockets.delete(userId);
      }
    });
  });

  return io;
}

export function emitToUser(io, userId, event, data) {
  io.to(`user:${userId}`).emit(event, data);
}

export function emitNotification(io, userId, notification) {
  io.to(`user:${userId}`).emit('notification', notification);
}

export function getIO(io) {
  return io;
}
