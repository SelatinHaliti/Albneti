import mongoose from 'mongoose';

const globalChatBanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    bannedUntil: {
      type: Date,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

globalChatBanSchema.index({ user: 1, bannedUntil: 1 });

export default mongoose.model('GlobalChatBan', globalChatBanSchema);
