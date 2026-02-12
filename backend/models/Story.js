import mongoose from 'mongoose';

const storySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    mediaUrl: { type: String, required: true },
    publicId: String,
    views: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

storySchema.index({ user: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL për fshirje automatike

export default mongoose.model('Story', storySchema);
