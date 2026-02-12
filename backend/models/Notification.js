import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: [
        'like',
        'comment',
        'follow',
        'mention',
        'share',
        'story_view',
        'live',
        'message',
      ],
      required: true,
    },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    story: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
    comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    message: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    text: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1, recipient: 1 });

export default mongoose.model('Notification', notificationSchema);
