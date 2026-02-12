import mongoose from 'mongoose';

const liveStreamSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'Transmetim live' },
    streamKey: { type: String },
    streamUrl: { type: String },
    thumbnail: { type: String },
    viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: Date,
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: { type: String, maxlength: 200 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        type: { type: String, enum: ['like', 'love', 'laugh', 'wow'] },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

liveStreamSchema.index({ user: 1 });
liveStreamSchema.index({ isActive: 1, startedAt: -1 });

export default mongoose.model('LiveStream', liveStreamSchema);
