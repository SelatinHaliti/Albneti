import mongoose from 'mongoose';

const globalChatMessageSchema = new mongoose.Schema(
  {
    room: {
      type: String,
      default: 'main',
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['text', 'emoji'],
      default: 'text',
    },
    content: {
      type: String,
      required: true,
      maxlength: [2000, 'Mesazhi nuk mund të kalojë 2000 karaktere'],
      trim: true,
    },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

globalChatMessageSchema.index({ room: 1, createdAt: -1 });

export default mongoose.model('GlobalChatMessage', globalChatMessageSchema);
